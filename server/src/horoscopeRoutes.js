// Horoscope API routes.
// Public: GET today's horoscopes (no auth).
// Admin: PUT update a sign's prediction for today.

import { Router } from "express";
import Horoscope, { ZODIAC_SIGNS } from "./horoscopeModel.js";
import { requireAuth } from "./accountRoutes.js";
import Account from "./accountModel.js";

const router = Router();

/** Get today's date string in YYYY-M-D format (local, matches frontend) */
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * GET /api/horoscope/today
 * Returns today's horoscope predictions for all 12 signs.
 * If no predictions exist for today, returns empty array (frontend
 * falls back to its hardcoded deterministic predictions).
 *
 * Public — no auth required.
 */
router.get("/horoscope/today", async (_req, res) => {
  try {
    const today = getTodayString();
    const horoscopes = await Horoscope.find({ date: today }).lean();

    // Build a map: sign → prediction
    const map = {};
    for (const h of horoscopes) {
      map[h.sign] = h.prediction;
    }

    // Return all 12 signs (with null prediction if not set)
    const result = ZODIAC_SIGNS.map((sign) => ({
      sign,
      prediction: map[sign] || null,
    }));

    return res.json({ date: today, horoscopes: result });
  } catch (err) {
    console.error("[horoscope/today] error:", err);
    return res.status(500).json({ error: "failed to fetch horoscopes" });
  }
});

/**
 * GET /api/admin/horoscope
 * Returns today's horoscopes for the admin dashboard.
 * Same as /api/horoscope/today but requires admin auth.
 */
router.get("/admin/horoscope", requireAuth, async (req, res) => {
  // Check admin
  const account = await Account.findOne({ firebaseUid: req.firebaseUser.uid }).lean();
  if (!account?.isAdmin) {
    return res.status(403).json({ error: "admin access required." });
  }

  try {
    const today = getTodayString();
    const horoscopes = await Horoscope.find({ date: today }).lean();

    const map = {};
    for (const h of horoscopes) {
      map[h.sign] = h.prediction;
    }

    const result = ZODIAC_SIGNS.map((sign) => ({
      sign,
      prediction: map[sign] || "",
    }));

    return res.json({ date: today, horoscopes: result });
  } catch (err) {
    console.error("[admin/horoscope] error:", err);
    return res.status(500).json({ error: "failed to fetch horoscopes" });
  }
});

/**
 * PUT /api/admin/horoscope/:sign
 * Updates (or creates) today's prediction for a zodiac sign.
 *
 * Body: { prediction: string }
 */
router.put("/admin/horoscope/:sign", requireAuth, async (req, res) => {
  // Check admin
  const account = await Account.findOne({ firebaseUid: req.firebaseUser.uid }).lean();
  if (!account?.isAdmin) {
    return res.status(403).json({ error: "admin access required." });
  }

  const { sign } = req.params;
  if (!ZODIAC_SIGNS.includes(sign)) {
    return res.status(400).json({ error: "invalid zodiac sign" });
  }

  const { prediction } = req.body ?? {};
  if (typeof prediction !== "string" || prediction.trim().length === 0) {
    return res.status(400).json({ error: "prediction is required" });
  }

  const today = getTodayString();

  try {
    // Upsert: update if exists, create if not
    const doc = await Horoscope.findOneAndUpdate(
      { sign, date: today },
      { prediction: prediction.trim().slice(0, 500) },
      { new: true, upsert: true }
    ).lean();

    return res.json({
      sign: doc.sign,
      date: doc.date,
      prediction: doc.prediction,
      saved: true,
    });
  } catch (err) {
    console.error("[admin/horoscope PUT] error:", err);
    return res.status(500).json({ error: "failed to save horoscope" });
  }
});

export default router;
