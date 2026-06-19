// Routes for /api/confessions and /api/walls/:wallIdx/confessions

import { Router } from "express";
import rateLimit from "express-rate-limit";
import Confession, {
  ALLOWED_COLORS,
  ALLOWED_AGINGS,
  WALL_COUNT,
  WALL_CAP,
} from "./confessionModel.js";

const router = Router();

// 1 confession per 30s per IP — keeps the spam at bay without annoying real users
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
 * GET /api/walls/:wallIdx/confessions
 * Returns all non-archived user confessions for the given wall, newest first.
 */
router.get("/walls/:wallIdx/confessions", async (req, res) => {
  const wallIdx = Number(req.params.wallIdx);
  if (!Number.isInteger(wallIdx) || wallIdx < 0 || wallIdx >= WALL_COUNT) {
    return res.status(400).json({
      error: `wallIdx must be an integer 0..${WALL_COUNT - 1}`,
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
      confessions: confessions.map((c) => ({
        id: c._id.toString(),
        text: c.text,
        author: c.author,
        color: c.color,
        aging: c.aging,
        wallIdx: c.wallIdx,
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
 * Creates a new confession. If wall has >= WALL_CAP non-archived user
 * confessions after this insert, the oldest gets archived.
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
  const wIdx = Number(wallIdx);
  if (!Number.isInteger(wIdx) || wIdx < 0 || wIdx >= WALL_COUNT) {
    return res
      .status(400)
      .json({ error: `wallIdx must be an integer 0..${WALL_COUNT - 1}` });
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
    // Create the new confession
    const created = await Confession.create({
      text: text.trim(),
      author: safeAuthor,
      color,
      aging,
      wallIdx: wIdx,
      isArchived: false,
    });

    // Check if wall now exceeds cap — if so, archive the OLDEST user note
    // (not the one we just created)
    const userCount = await Confession.countDocuments({
      wallIdx: wIdx,
      isArchived: false,
    });

    let archived = null;
    if (userCount > WALL_CAP) {
      // Find oldest non-archived on this wall that isn't the just-created one
      const oldest = await Confession.findOne({
        wallIdx: wIdx,
        isArchived: false,
        _id: { $ne: created._id },
      })
        .sort({ createdAt: 1 })
        .exec();

      if (oldest) {
        oldest.isArchived = true;
        await oldest.save();
        archived = { id: oldest._id.toString() };
      }
    }

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
      archivedOldest: archived,
      wallCount: userCount,
      wallCap: WALL_CAP,
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
