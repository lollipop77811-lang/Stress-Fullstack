// Admin API routes — all protected by requireAdmin middleware.
// Admins are accounts with isAdmin: true (set manually in MongoDB).

import { Router } from "express";
import mongoose from "mongoose";
import Account from "./accountModel.js";
import Confession from "./confessionModel.js";
import Comment from "./commentModel.js";
import { requireAuth } from "./accountRoutes.js";

const router = Router();

/**
 * Middleware: requireAuth + requireAdmin.
 * Must be used after requireAuth (which sets req.firebaseUser).
 */
async function requireAdmin(req, res, next) {
  // First run requireAuth
  await new Promise((resolve) => {
    requireAuth(req, res, () => resolve());
  });

  if (res.headersSent) return; // requireAuth already sent an error

  try {
    const account = await Account.findOne({ firebaseUid: req.firebaseUser.uid }).lean();
    if (!account || !account.isAdmin) {
      return res.status(403).json({ error: "admin access required." });
    }
    req.adminAccount = account;
    next();
  } catch (err) {
    return res.status(500).json({ error: "failed to verify admin status" });
  }
}

/**
 * GET /api/admin/stats
 * Overview stats for the dashboard.
 */
router.get("/admin/stats", requireAdmin, async (_req, res) => {
  try {
    const [
      totalConfessions,
      hiddenConfessions,
      flaggedConfessions,
      reportedConfessions,
      totalComments,
      hiddenComments,
      totalAccounts,
      totalWalls,
    ] = await Promise.all([
      Confession.countDocuments({}),
      Confession.countDocuments({ isHidden: true }),
      Confession.countDocuments({ isFlagged: true }),
      Confession.countDocuments({ reportCount: { $gt: 0 }, isHidden: false }),
      Comment.countDocuments({}),
      Comment.countDocuments({ isHidden: true }),
      Account.countDocuments({}),
      Confession.findOne({}).sort({ wallIdx: -1 }).select("wallIdx").lean(),
    ]);

    return res.json({
      totalConfessions,
      hiddenConfessions,
      flaggedConfessions,
      reportedConfessions,
      totalComments,
      hiddenComments,
      totalAccounts,
      totalWalls: totalWalls ? totalWalls.wallIdx + 1 : 0,
    });
  } catch (err) {
    console.error("[admin/stats] error:", err);
    return res.status(500).json({ error: "failed to fetch stats" });
  }
});

/**
 * GET /api/admin/reports
 * Returns reported confessions + comments (sorted by report count, highest first).
 */
router.get("/admin/reports", requireAdmin, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  try {
    // Reported confessions
    const confessions = await Confession.find({
      reportCount: { $gt: 0 },
      isHidden: false,
    })
      .sort({ reportCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Reported comments
    const comments = await Comment.find({
      reportCount: { $gt: 0 },
      isHidden: false,
    })
      .sort({ reportCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get confession text for reported comments
    const confessionIds = [...new Set(comments.map((c) => c.confessionId.toString()))];
    const linkedConfessions = await Confession.find({
      _id: { $in: confessionIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select("text wallIdx")
      .lean();

    const confessionMap = new Map(
      linkedConfessions.map((c) => [c._id.toString(), c])
    );

    return res.json({
      confessions: confessions.map((c) => ({
        id: c._id.toString(),
        text: c.text,
        author: c.author,
        color: c.color,
        wallIdx: c.wallIdx,
        reportCount: c.reportCount,
        witnessCount: c.witnessCount ?? 0,
        isFlagged: c.isFlagged,
        createdAt: c.createdAt,
      })),
      comments: comments.map((c) => ({
        id: c._id.toString(),
        text: c.text,
        author: c.author,
        confessionId: c.confessionId.toString(),
        confessionText: confessionMap.get(c.confessionId.toString())?.text ?? "(deleted)",
        reportCount: c.reportCount,
        createdAt: c.createdAt,
      })),
      page,
      hasMore: confessions.length === limit || comments.length === limit,
    });
  } catch (err) {
    console.error("[admin/reports] error:", err);
    return res.status(500).json({ error: "failed to fetch reports" });
  }
});

/**
 * GET /api/admin/flagged
 * Returns confessions flagged by crisis detection (isFlagged: true).
 */
router.get("/admin/flagged", requireAdmin, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  try {
    const flagged = await Confession.find({ isFlagged: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Confession.countDocuments({ isFlagged: true });

    return res.json({
      confessions: flagged.map((c) => ({
        id: c._id.toString(),
        text: c.text,
        author: c.author,
        color: c.color,
        wallIdx: c.wallIdx,
        isHidden: c.isHidden,
        witnessCount: c.witnessCount ?? 0,
        createdAt: c.createdAt,
      })),
      total,
      page,
      hasMore: skip + flagged.length < total,
    });
  } catch (err) {
    console.error("[admin/flagged] error:", err);
    return res.status(500).json({ error: "failed to fetch flagged" });
  }
});

/**
 * GET /api/admin/search?q=keyword
 * Full-text search across all confessions.
 */
router.get("/admin/search", requireAdmin, async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) {
    return res.json({ confessions: [], total: 0 });
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  try {
    const results = await Confession.find({
      $or: [
        { text: { $regex: q, $options: "i" } },
        { author: { $regex: q, $options: "i" } },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Confession.countDocuments({
      $or: [
        { text: { $regex: q, $options: "i" } },
        { author: { $regex: q, $options: "i" } },
      ],
    });

    return res.json({
      confessions: results.map((c) => ({
        id: c._id.toString(),
        text: c.text,
        author: c.author,
        color: c.color,
        wallIdx: c.wallIdx,
        isHidden: c.isHidden,
        isFlagged: c.isFlagged,
        reportCount: c.reportCount,
        witnessCount: c.witnessCount ?? 0,
        createdAt: c.createdAt,
      })),
      total,
      page,
      hasMore: skip + results.length < total,
    });
  } catch (err) {
    console.error("[admin/search] error:", err);
    return res.status(500).json({ error: "search failed" });
  }
});

/**
 * PUT /api/admin/confessions/:id/hide
 * Hide a confession (set isHidden: true, clear reportCount).
 */
router.put("/admin/confessions/:id/hide", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  try {
    const doc = await Confession.findByIdAndUpdate(
      id,
      { isHidden: true, reportCount: 0, reportedBy: [] },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: "not found" });
    return res.json({ hidden: true });
  } catch (err) {
    return res.status(500).json({ error: "failed to hide" });
  }
});

/**
 * PUT /api/admin/confessions/:id/unhide
 * Unhide a confession (set isHidden: false).
 */
router.put("/admin/confessions/:id/unhide", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  try {
    const doc = await Confession.findByIdAndUpdate(
      id,
      { isHidden: false },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: "not found" });
    return res.json({ unhidden: true });
  } catch (err) {
    return res.status(500).json({ error: "failed to unhide" });
  }
});

/**
 * DELETE /api/admin/confessions/:id
 * Permanently delete a confession.
 */
router.delete("/admin/confessions/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  try {
    // Also delete all comments on this confession
    await Comment.deleteMany({ confessionId: id });
    await Confession.findByIdAndDelete(id);
    return res.json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ error: "failed to delete" });
  }
});

/**
 * PUT /api/admin/confessions/:id/resolve-flag
 * Mark a crisis-flagged confession as resolved (set isFlagged: false).
 */
router.put("/admin/confessions/:id/resolve-flag", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  try {
    const doc = await Confession.findByIdAndUpdate(
      id,
      { isFlagged: false },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: "not found" });
    return res.json({ resolved: true });
  } catch (err) {
    return res.status(500).json({ error: "failed to resolve" });
  }
});

/**
 * PUT /api/admin/comments/:id/hide
 * Hide a comment.
 */
router.put("/admin/comments/:id/hide", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  try {
    const doc = await Comment.findByIdAndUpdate(
      id,
      { isHidden: true, reportCount: 0, reportedBy: [] },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: "not found" });
    return res.json({ hidden: true });
  } catch (err) {
    return res.status(500).json({ error: "failed to hide" });
  }
});

/**
 * DELETE /api/admin/comments/:id
 * Permanently delete a comment.
 */
router.delete("/admin/comments/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  try {
    await Comment.findByIdAndDelete(id);
    return res.json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ error: "failed to delete" });
  }
});

export default router;
// Export requireAdmin for potential reuse
export { requireAdmin };
