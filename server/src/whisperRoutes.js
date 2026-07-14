// Routes for /api/whispers/*
//
// Whispers are ephemeral (24h) anonymous messages. Unlike confessions,
// they require auth to post — but the author name is stored so the whisper
// still looks anonymous in the UI. Whispers are tied to a firebaseUid so
// they sync across all devices the user is signed in on.
//
// Endpoints:
//   GET    /api/whispers          — list active whispers (newest first)
//   POST   /api/whispers          — create a whisper (requires auth)
//   POST   /api/whispers/:id/witness — witness a whisper (dedup by session)

import { Router } from "express";
import rateLimit from "express-rate-limit";
import Whisper, {
  WHISPER_MAX_LENGTH,
  WHISPER_MIN_LENGTH,
  WITNESS_THRESHOLD,
  ALLOWED_MOODS,
} from "./whisperModel.js";
import Account from "./accountModel.js";
import { firebaseAuth, firebaseInitialized } from "./firebaseAdmin.js";

const router = Router();

const KIND_NOTES = [
  "you survived every bad day so far. that's a 100% win rate. keep going, you absolute legend.",
  "the version of you reading this is doing better than you think. fr.",
  "future you is gonna be so proud of present you. even if present you is just lying down.",
  "hydrating counts as self-care. so does breathing. you're crushing it.",
  "you don't have to win today. you just have to show up. which you did. hi.",
  "the void says hi back. it's rooting for you. weird, but true.",
  "nobody has it together. they're just better at pretending. you're fine.",
  "every storm runs out of rain. even the dramatic ones. even yours.",
  "rest is productive. saying no is productive. lying on the floor counts.",
  "you are not behind. you are exactly here. that's enough for today.",
];

// Rate limits
const listLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many requests. slow down." },
});

const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many whispers. the void needs a breather." },
});

const witnessLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many witness actions. slow down." },
});

/**
 * Middleware: verify Firebase ID token from the Authorization header.
 * Attaches the decoded Firebase user to req.firebaseUser.
 */
async function requireAuth(req, res, next) {
  if (!firebaseInitialized || !firebaseAuth) {
    return res.status(503).json({ error: "auth is not configured on this server." });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing auth token" });
  }
  const idToken = authHeader.slice("Bearer ".length);
  try {
    const decoded = await firebaseAuth.verifyIdToken(idToken);
    req.firebaseUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid or expired token" });
  }
}

/**
 * Optional-auth middleware: if an Authorization header is present, verify
 * the token and attach req.firebaseUser. If not, continue without auth
 * (anonymous whisper). Errors on invalid tokens are ignored so anonymous
 * posting still works even if a stale token is sent.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ") || !firebaseAuth) {
    return next();
  }
  try {
    const idToken = authHeader.slice("Bearer ".length);
    req.firebaseUser = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    // Invalid/expired token — continue as anonymous
  }
  next();
}

/**
 * GET /api/whispers
 * Lists active (non-expired, non-dissolved) whispers, newest first.
 *
 * Query: ?mine=1 — return only the current user's whispers
 *   - If authed: filter by firebaseUid (cross-device sync)
 *   - If anon:   filter by sessionId (same-browser only)
 *
 * No auth required to view (whispers are public).
 */
router.get("/whispers", listLimiter, async (req, res) => {
  try {
    const now = new Date();
    const mineOnly = req.query.mine === "1";

    let query;
    if (mineOnly) {
      // Try to auth the user
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ") && firebaseAuth) {
        try {
          const decoded = await firebaseAuth.verifyIdToken(authHeader.slice("Bearer ".length));
          req.firebaseUser = decoded;
        } catch {
          /* ignore — treat as anon */
        }
      }
      if (req.firebaseUser) {
        query = { firebaseUid: req.firebaseUser.uid };
      } else {
        // Anonymous — need a sessionId from query
        const sid = typeof req.query.sessionId === "string" ? req.query.sessionId : null;
        if (!sid) {
          return res.json({ whispers: [] });
        }
        query = { sessionId: sid };
      }
    } else {
      // Public feed — active + not dissolved
      query = {
        expiresAt: { $gt: now },
        dissolved: false,
      };
    }

    const whispers = await Whisper.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      whispers: whispers.map((w) => ({
        id: w._id.toString(),
        text: w.text,
        author: w.author,
        mood: w.mood,
        witnesses: w.witnessCount,
        createdAt: w.createdAt.toISOString(),
        expiresAt: w.expiresAt.toISOString(),
        dissolved: w.dissolved,
        isMine: req.firebaseUser
          ? w.firebaseUid === req.firebaseUser.uid
          : false,
      })),
    });
  } catch (err) {
    console.error("[whispers/list] error:", err);
    return res.status(500).json({ error: "failed to fetch whispers" });
  }
});

/**
 * POST /api/whispers
 * Creates a new whisper. Auth is OPTIONAL — anyone can whisper.
 *
 * Headers (optional): Authorization: Bearer <token>
 *   - If present: whisper is linked to firebaseUid (cross-device sync)
 *   - If absent:  whisper is linked to sessionId (this browser only)
 *
 * Body: { text, mood, author?, sessionId? }
 */
router.post("/whispers", createLimiter, optionalAuth, async (req, res) => {
  const { text, mood, author, sessionId } = req.body ?? {};

  // --- validation ---
  if (typeof text !== "string" || text.trim().length < WHISPER_MIN_LENGTH) {
    return res.status(400).json({ error: "whisper can't be empty" });
  }
  if (text.length > WHISPER_MAX_LENGTH) {
    return res.status(400).json({
      error: `whisper must be at most ${WHISPER_MAX_LENGTH} characters`,
    });
  }
  if (mood && !ALLOWED_MOODS.includes(mood)) {
    return res.status(400).json({ error: "invalid mood" });
  }

  try {
    // If signed in, look up the account for the username
    let safeAuthor = "anon";
    if (req.firebaseUser) {
      const account = await Account.findOne({
        firebaseUid: req.firebaseUser.uid,
      }).lean();
      safeAuthor =
        typeof author === "string" && author.trim().length > 0
          ? author.trim().slice(0, 30)
          : account?.username || "anon";
    } else if (typeof author === "string" && author.trim().length > 0) {
      safeAuthor = author.trim().slice(0, 30);
    }

    const whisper = await Whisper.create({
      text: text.trim(),
      author: safeAuthor,
      mood: mood || "wilt",
      firebaseUid: req.firebaseUser ? req.firebaseUser.uid : null,
      sessionId: req.firebaseUser ? null : (typeof sessionId === "string" ? sessionId : null),
      witnessCount: 0,
      witnessedBy: [],
      dissolved: false,
    });

    return res.status(201).json({
      whisper: {
        id: whisper._id.toString(),
        text: whisper.text,
        author: whisper.author,
        mood: whisper.mood,
        witnesses: whisper.witnessCount,
        createdAt: whisper.createdAt.toISOString(),
        expiresAt: whisper.expiresAt.toISOString(),
        dissolved: whisper.dissolved,
        isMine: true,
      },
    });
  } catch (err) {
    console.error("[whispers/create] error:", err);
    return res.status(500).json({ error: "failed to create whisper" });
  }
});

/**
 * POST /api/whispers/:id/witness
 * Witness a whisper. Dedup by session ID — one witness per session per whisper.
 *
 * Body: { sessionId }
 */
router.post("/whispers/:id/witness", witnessLimiter, async (req, res) => {
  const { id } = req.params;
  const { sessionId } = req.body ?? {};

  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const whisper = await Whisper.findById(id);
    if (!whisper) {
      return res.status(404).json({ error: "whisper not found (it may have dissolved)" });
    }
    if (whisper.dissolved) {
      return res.status(400).json({ error: "this whisper has already dissolved" });
    }

    const alreadyWitnessed = whisper.witnessedBy.includes(sessionId);
    if (alreadyWitnessed) {
      // Un-witness
      whisper.witnessedBy = whisper.witnessedBy.filter((s) => s !== sessionId);
      whisper.witnessCount = Math.max(0, whisper.witnessCount - 1);
    } else {
      // Witness
      whisper.witnessedBy.push(sessionId);
      whisper.witnessCount += 1;

      // Auto-dissolve if threshold reached
      if (whisper.witnessCount >= WITNESS_THRESHOLD) {
        whisper.dissolved = true;
        whisper.text = KIND_NOTES[whisper._id.toString().charCodeAt(0) % KIND_NOTES.length];
        whisper.mood = "no";
      }
    }

    await whisper.save();

    return res.json({
      witnesses: whisper.witnessCount,
      witnessed: !alreadyWitnessed,
      dissolved: whisper.dissolved,
      text: whisper.text,
      mood: whisper.mood,
    });
  } catch (err) {
    console.error("[whispers/witness] error:", err);
    return res.status(500).json({ error: "failed to witness whisper" });
  }
});

export default router;
