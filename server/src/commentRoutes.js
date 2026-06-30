// Routes for /api/confessions/:id/comments and /api/comments/:id/report
//
// Comments are limited to 2 levels of threading:
//   Level 1: top-level comment (parentId = null)
//   Level 2: reply to a top-level comment (parentId = commentId)
//
// Constraints:
//   - Max 50 comments per confession (COMMENT_CAP)
//   - Max 200 characters per comment
//   - Rate-limited: 1 comment per 60s per IP
//   - PII stripped + profanity filtered (same safety pipeline as confessions)
//   - Auto-hidden after 3 reports (same as confessions)

import { Router } from "express";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import Comment, {
  COMMENT_CAP,
} from "./commentModel.js";
import Confession from "./confessionModel.js";
import {
  sanitizePII,
  filterProfanity,
} from "./safetyUtils.js";

const router = Router();

// 1 comment per 60s per IP — slower than confessions (30s) to reduce spam
const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "slow down. one comment per minute. the wall needs to breathe.",
  },
});

const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "slow down. too many reports too fast." },
});

const REPORT_THRESHOLD = 3;

/**
 * GET /api/confessions/:id/comments
 * Returns all non-hidden comments for a confession, threaded (2 levels max).
 * Top-level comments are sorted newest-first. Replies are sorted oldest-first
 * (so the conversation reads naturally top-to-bottom).
 *
 * Response shape:
 *   { count, cap, commentsEnabled, comments: [{ id, text, author, parentId, createdAt, replies: [...] }] }
 */
router.get("/confessions/:id/comments", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "invalid confession id" });
  }

  try {
    // Check if the confession exists + if comments are enabled
    const confession = await Confession.findById(id)
      .select("commentsEnabled isHidden")
      .lean()
      .exec();

    if (!confession) {
      return res.status(404).json({ error: "confession not found" });
    }

    if (!confession.commentsEnabled) {
      return res.json({
        count: 0,
        cap: COMMENT_CAP,
        commentsEnabled: false,
        comments: [],
      });
    }

    // Fetch all non-hidden comments for this confession
    const allComments = await Comment.find({
      confessionId: id,
      isHidden: false,
    })
      .sort({ createdAt: -1 }) // newest first (we'll re-sort replies below)
      .lean()
      .exec();

    // Build threaded structure: top-level comments + their replies
    const topLevel = allComments.filter((c) => !c.parentId);
    const replies = allComments.filter((c) => c.parentId);

    const threaded = topLevel.map((tc) => ({
      id: tc._id.toString(),
      text: tc.text,
      author: tc.author,
      parentId: null,
      createdAt: tc.createdAt,
      replies: replies
        .filter((r) => r.parentId && r.parentId.toString() === tc._id.toString())
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) // oldest first
        .map((r) => ({
          id: r._id.toString(),
          text: r.text,
          author: r.author,
          parentId: r.parentId.toString(),
          createdAt: r.createdAt,
        })),
    }));

    return res.json({
      count: allComments.length,
      cap: COMMENT_CAP,
      commentsEnabled: true,
      comments: threaded,
    });
  } catch (err) {
    console.error("[comments] list error:", err);
    return res.status(500).json({ error: "failed to fetch comments" });
  }
});

/**
 * POST /api/confessions/:id/comments
 * Body: { text, author?, parentId?, sessionId }
 *
 * Creates a new comment on the given confession. If parentId is provided,
 * it's a reply (must be a top-level comment's ID — no replies to replies).
 *
 * Constraints:
 *   - Confession must have commentsEnabled: true
 *   - Total comments (non-hidden) must be < COMMENT_CAP (50)
 *   - If parentId is provided, it must be a top-level comment on this confession
 *   - Rate-limited: 1 per 60s per IP
 *   - PII stripped + profanity filtered
 */
router.post("/confessions/:id/comments", commentLimiter, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "invalid confession id" });
  }

  const { text, author, parentId } = req.body ?? {};

  // --- validation ---
  if (typeof text !== "string" || text.trim().length < 1) {
    return res.status(400).json({ error: "comment can't be empty" });
  }
  if (text.length > 200) {
    return res.status(400).json({ error: "comment must be at most 200 characters" });
  }

  const safeAuthor =
    typeof author === "string" && author.trim().length > 0
      ? author.trim().slice(0, 30)
      : "anon";

  try {
    // Check confession exists + comments enabled
    const confession = await Confession.findById(id)
      .select("commentsEnabled isHidden")
      .lean()
      .exec();

    if (!confession) {
      return res.status(404).json({ error: "confession not found" });
    }
    if (!confession.commentsEnabled) {
      return res.status(403).json({ error: "comments are disabled on this confession" });
    }

    // Check comment cap
    const commentCount = await Comment.countDocuments({
      confessionId: id,
      isHidden: false,
    });
    if (commentCount >= COMMENT_CAP) {
      return res.status(403).json({
        error: `this confession has reached the ${COMMENT_CAP}-comment limit. conversation's over.`,
      });
    }

    // If replying, validate parentId
    let validParentId = null;
    if (parentId) {
      if (!mongoose.isValidObjectId(parentId)) {
        return res.status(400).json({ error: "invalid parentId" });
      }
      const parent = await Comment.findById(parentId).lean().exec();
      if (!parent) {
        return res.status(404).json({ error: "parent comment not found" });
      }
      if (parent.parentId) {
        return res.status(400).json({ error: "can't reply to a reply — max 2 levels" });
      }
      if (parent.confessionId.toString() !== id) {
        return res.status(400).json({ error: "parent comment doesn't belong to this confession" });
      }
      validParentId = parent._id;
    }

    // --- safety pipeline ---
    const { sanitized: piiStripped } = sanitizePII(text.trim());
    const cleanText = filterProfanity(piiStripped);

    if (cleanText.length < 1) {
      return res.status(400).json({
        error: "after removing private info, the comment is empty.",
      });
    }

    const created = await Comment.create({
      text: cleanText,
      author: safeAuthor,
      confessionId: id,
      parentId: validParentId,
      isHidden: false,
    });

    // Increment denormalized commentCount on the confession
    await Confession.updateOne(
      { _id: id },
      { $inc: { commentCount: 1 } }
    );

    return res.status(201).json({
      comment: {
        id: created._id.toString(),
        text: created.text,
        author: created.author,
        parentId: created.parentId ? created.parentId.toString() : null,
        createdAt: created.createdAt,
      },
    });
  } catch (err) {
    console.error("[comments] create error:", err);
    if (err && err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "failed to create comment" });
  }
});

/**
 * POST /api/comments/:id/report
 * Reports a comment. After REPORT_THRESHOLD (3) reports from distinct
 * sessions, the comment is auto-hidden.
 *
 * Body: { sessionId, reason }
 */
router.post("/comments/:id/report", reportLimiter, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "invalid comment id" });
  }

  const sessionId = String(req.body?.sessionId || "").slice(0, 64);
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const doc = await Comment.findById(id).exec();
    if (!doc) {
      return res.status(404).json({ error: "comment not found" });
    }

    if (!Array.isArray(doc.reportedBy)) doc.reportedBy = [];
    if (doc.reportedBy.includes(sessionId)) {
      return res.json({
        reported: false,
        reportCount: doc.reportCount ?? 0,
        isHidden: doc.isHidden,
        message: "you've already reported this comment",
      });
    }

    doc.reportedBy.push(sessionId);
    doc.reportCount = (doc.reportCount ?? 0) + 1;

    if (doc.reportCount >= REPORT_THRESHOLD && !doc.isHidden) {
      doc.isHidden = true;
    }

    await doc.save();

    return res.json({
      reported: true,
      reportCount: doc.reportCount,
      isHidden: doc.isHidden,
    });
  } catch (err) {
    console.error("[comment report] error:", err);
    return res.status(500).json({ error: "failed to report comment" });
  }
});

export default router;
