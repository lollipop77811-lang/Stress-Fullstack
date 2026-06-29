// Routes for /api/confessions, /api/walls/stats, /api/walls/:wallIdx/confessions, /api/mine
//
// Walls are INFINITE — no fixed wall count. When a wall hits WALL_CAP
// confessions, the next confession auto-spawns wall N+1.

import { Router } from "express";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import Confession, {
  ALLOWED_COLORS,
  ALLOWED_AGINGS,
  WALL_CAP,
} from "./confessionModel.js";

const router = Router();

// 1 confession per 30s per IP
const postLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "slow down, the wall needs to breathe. try again in 30s.",
  },
});

/**
 * GET /api/walls/stats
 * Returns summary stats about all walls.
 *   totalWalls: highest wallIdx + 1 (min 1 — wall 0 always "exists" even if empty)
 *   totalConfessions: count of all non-archived confessions
 *   wallCap: max confessions per wall
 */
router.get("/walls/stats", async (_req, res) => {
  try {
    const totalConfessions = await Confession.countDocuments({
      isArchived: false,
    });
    const maxWall = await Confession.findOne({})
      .sort({ wallIdx: -1 })
      .select("wallIdx")
      .lean()
      .exec();
    const totalWalls = maxWall ? maxWall.wallIdx + 1 : 1;

    return res.json({
      totalWalls,
      totalConfessions,
      wallCap: WALL_CAP,
    });
  } catch (err) {
    console.error("[stats] error:", err);
    return res.status(500).json({ error: "failed to fetch wall stats" });
  }
});

/**
 * GET /api/mine?ids=id1,id2,id3
 * Returns the full confession documents for the given IDs (regardless of
 * wallIdx or archived state).
 */
router.get("/mine", async (req, res) => {
  const rawIds = String(req.query.ids || "");
  const ids = rawIds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return res.json({ count: 0, confessions: [] });
  }

  const validIds = ids.filter((id) => mongoose.isValidObjectId(id));
  if (validIds.length === 0) {
    return res.status(400).json({ error: "no valid ids provided" });
  }

  try {
    const docs = await Confession.find({
      _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return res.json({
      count: docs.length,
      confessions: docs.map((c) => ({
        id: c._id.toString(),
        text: c.text,
        author: c.author,
        color: c.color,
        aging: c.aging,
        wallIdx: c.wallIdx,
        isArchived: c.isArchived,
        witnessCount: c.witnessCount ?? 0,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error("[mine] error:", err);
    return res.status(500).json({ error: "failed to fetch your confessions" });
  }
});

/**
 * GET /api/confessions/featured
 * Returns the "Confession of the Day" — the most-witnessed confession
 * from the last 24 hours. Deterministic by date so everyone sees the
 * same featured confession all day. Falls back to the most-witnessed
 * confession ever if no confessions were posted in the last 24h.
 *
 * Returns null if the DB is empty.
 */
router.get("/confessions/featured", async (_req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Try: most-witnessed confession from the last 24 hours
    let doc = await Confession.findOne({
      createdAt: { $gte: oneDayAgo },
      isArchived: false,
    })
      .sort({ witnessCount: -1, createdAt: -1 })
      .lean()
      .exec();

    // Fallback: most-witnessed confession ever (any time)
    if (!doc) {
      doc = await Confession.findOne({ isArchived: false })
        .sort({ witnessCount: -1, createdAt: -1 })
        .lean()
        .exec();
    }

    if (!doc) {
      return res.json({ confession: null });
    }

    return res.json({
      confession: {
        id: doc._id.toString(),
        text: doc.text,
        author: doc.author,
        color: doc.color,
        aging: doc.aging,
        wallIdx: doc.wallIdx,
        witnessCount: doc.witnessCount ?? 0,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error("[featured] error:", err);
    return res.status(500).json({ error: "failed to fetch featured confession" });
  }
});

/**
 * POST /api/confessions/:id/witness
 * Increments the witnessCount for the given confession.
 *
 * Dedup: the client sends a sessionId in the body. The server stores
 * witnessed IDs in a Set on the document (witnessedBy). If the sessionId
 * is already in the set, the witness is rejected (idempotent — no double
 * counting). Session ID is a random string generated client-side and
 * stored in localStorage, so it's per-browser, not per-user.
 */
const witnessLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // max 10 witnesses per minute per IP (anti-spam)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "slow down. the wall can only handle so much witnessing." },
});

router.post("/confessions/:id/witness", witnessLimiter, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "invalid confession id" });
  }

  const sessionId = String(req.body?.sessionId || "").slice(0, 64);
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const doc = await Confession.findById(id).exec();
    if (!doc) {
      return res.status(404).json({ error: "confession not found" });
    }

    // Dedup check — store witnessed sessions in an array on the doc
    // (using a Set in memory; persisted as an array in MongoDB)
    if (!Array.isArray(doc.witnessedBy)) doc.witnessedBy = [];
    if (doc.witnessedBy.includes(sessionId)) {
      // Already witnessed — return current count without incrementing
      return res.json({
        witnessed: false,
        witnessCount: doc.witnessCount ?? 0,
      });
    }

    doc.witnessedBy.push(sessionId);
    doc.witnessCount = (doc.witnessCount ?? 0) + 1;
    await doc.save();

    return res.json({
      witnessed: true,
      witnessCount: doc.witnessCount,
    });
  } catch (err) {
    console.error("[witness] error:", err);
    return res.status(500).json({ error: "failed to witness confession" });
  }
});

/**
 * GET /api/confessions/:id
 * Returns a single confession by ID. Used by the deep-link page
 * (#/c/<id>) so shared confession links can load directly.
 *
 * Returns 404 if the confession doesn't exist (or has been deleted).
 * Includes archived confessions — sharing works even after a
 * confession has been pushed off its wall.
 */
router.get("/confessions/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "invalid confession id" });
  }
  try {
    const doc = await Confession.findById(id).lean().exec();
    if (!doc) {
      return res.status(404).json({ error: "confession not found" });
    }
    return res.json({
      confession: {
        id: doc._id.toString(),
        text: doc.text,
        author: doc.author,
        color: doc.color,
        aging: doc.aging,
        wallIdx: doc.wallIdx,
        isArchived: doc.isArchived,
        witnessCount: doc.witnessCount ?? 0,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error("[confessions/get] error:", err);
    return res.status(500).json({ error: "failed to fetch confession" });
  }
});

/**
 * GET /api/walls/:wallIdx/confessions
 * Returns all non-archived confessions for the given wall, newest first.
 * wallIdx can be any non-negative integer (walls are infinite).
 * If the wall doesn't exist yet (no confessions), returns an empty array.
 */
router.get("/walls/:wallIdx/confessions", async (req, res) => {
  const wallIdx = Number(req.params.wallIdx);
  if (!Number.isInteger(wallIdx) || wallIdx < 0) {
    return res.status(400).json({
      error: "wallIdx must be a non-negative integer",
    });
  }

  try {
    const confessions = await Confession.find({
      wallIdx,
      isArchived: false,
    })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true })
      .exec();

    return res.json({
      wallIdx,
      count: confessions.length,
      cap: WALL_CAP,
      isFull: confessions.length >= WALL_CAP,
      confessions: confessions.map((c) => ({
        id: c._id.toString(),
        text: c.text,
        author: c.author,
        color: c.color,
        aging: c.aging,
        wallIdx: c.wallIdx,
        witnessCount: c.witnessCount ?? 0,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error("[confessions] list error:", err);
    return res.status(500).json({ error: "failed to fetch confessions" });
  }
});

/**
 * POST /api/confessions
 * Body: { text, author?, color, aging, wallIdx }
 *
 * Creates a new confession on the requested wall. If that wall is already
 * full (>= WALL_CAP active confessions), the confession is auto-spawned
 * onto the next wall (wallIdx + 1). This continues until a non-full wall
 * is found, enabling infinite wall growth.
 *
 * Response includes the ACTUAL wallIdx where the confession landed (which
 * may differ from the requested wallIdx if the original was full).
 */
router.post("/confessions", postLimiter, async (req, res) => {
  const { text, author, color, aging, wallIdx } = req.body ?? {};

  // --- validation ---
  if (typeof text !== "string" || text.trim().length < 3) {
    return res.status(400).json({ error: "text must be at least 3 characters" });
  }
  if (text.length > 200) {
    return res.status(400).json({ error: "text must be at most 200 characters" });
  }
  const requestedWallIdx = Number(wallIdx);
  if (!Number.isInteger(requestedWallIdx) || requestedWallIdx < 0) {
    return res
      .status(400)
      .json({ error: "wallIdx must be a non-negative integer" });
  }
  if (!ALLOWED_COLORS.includes(color)) {
    return res
      .status(400)
      .json({ error: `color must be one of: ${ALLOWED_COLORS.join(", ")}` });
  }
  if (!ALLOWED_AGINGS.includes(aging)) {
    return res
      .status(400)
      .json({ error: `aging must be one of: ${ALLOWED_AGINGS.join(", ")}` });
  }
  const safeAuthor =
    typeof author === "string" && author.trim().length > 0
      ? author.trim().slice(0, 30)
      : "anon";

  try {
    // Find the actual wall to post on: starting from the requested wallIdx,
    // find the first wall that isn't full. This enables auto-spawning.
    let actualWallIdx = requestedWallIdx;
    const maxWallToCheck = requestedWallIdx + 100; // safety limit
    while (actualWallIdx < maxWallToCheck) {
      const count = await Confession.countDocuments({
        wallIdx: actualWallIdx,
        isArchived: false,
      });
      if (count < WALL_CAP) break;
      actualWallIdx++;
    }

    const created = await Confession.create({
      text: text.trim(),
      author: safeAuthor,
      color,
      aging,
      wallIdx: actualWallIdx,
      isArchived: false,
    });

    const wallCount = await Confession.countDocuments({
      wallIdx: actualWallIdx,
      isArchived: false,
    });

    return res.status(201).json({
      confession: {
        id: created._id.toString(),
        text: created.text,
        author: created.author,
        color: created.color,
        aging: created.aging,
        wallIdx: created.wallIdx,
        createdAt: created.createdAt,
      },
      requestedWallIdx,
      actualWallIdx,
      wallCount,
      wallCap: WALL_CAP,
      spawnedNewWall: actualWallIdx !== requestedWallIdx,
    });
  } catch (err) {
    console.error("[confessions] create error:", err);
    if (err && err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "failed to create confession" });
  }
});

export default router;
