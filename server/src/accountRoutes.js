// Routes for /api/auth/* and /api/account/*
//
// Auth is OPTIONAL — users can post confessions without an account.
// The account is a sync layer: it links confession IDs for cross-device
// access. Confessions themselves have NO accountId field.
//
// Email signup is restricted to @gmail.com addresses only.
// Username is required (like Reddit), 3-20 chars, alphanumeric + underscore.
// Email verification is required before the account is fully functional.

import { Router } from "express";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import Account, {
  USERNAME_MIN,
  USERNAME_MAX,
  RESERVED_USERNAMES,
} from "./accountModel.js";
import { firebaseAuth, firebaseInitialized } from "./firebaseAdmin.js";

const router = Router();

/**
 * Generate a random username for Google signups.
 * Format: "stressball_" + 4 random alphanumeric chars (e.g. "stressball_7k2x")
 * Checks the DB for uniqueness and retries up to 10 times.
 */
async function generateUsername() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let attempt = 0; attempt < 10; attempt++) {
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    const candidate = `stressball_${suffix}`;
    // Check if it's taken
    const existing = await Account.findOne({
      username: { $regex: new RegExp(`^${candidate}$`, "i") },
    }).lean();
    if (!existing && !RESERVED_USERNAMES.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }
  // Fallback: add a timestamp
  return `stressball_${Date.now().toString(36).slice(-6)}`;
}

// Rate limits
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many auth attempts. slow down." },
});

const syncLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many sync requests. slow down." },
});

/**
 * Middleware: verify Firebase ID token from the Authorization header.
 * Attaches the decoded Firebase user to req.firebaseUser.
 * Returns 503 if Firebase is not configured, 401 if token is missing/invalid.
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
 * POST /api/auth/verify
 * Verifies the Firebase ID token + creates/updates the account.
 *
 * Headers: Authorization: Bearer <firebase-id-token>
 * Body: { username?: string } — required on first signup, ignored on login
 *
 * Returns:
 *   200: { account: { id, email, username, emailVerified, provider, confessionIds } }
 *   400: invalid email (not @gmail.com) or invalid username
 *   409: username already taken
 *   503: Firebase not configured
 */
router.post("/auth/verify", authLimiter, async (req, res) => {
  if (!firebaseInitialized) {
    return res.status(503).json({ error: "auth is not configured on this server." });
  }

  const { username } = req.body ?? {};
  const firebaseUser = req.firebaseUser;

  // Verify Firebase token first
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing auth token" });
  }

  const idToken = authHeader.slice("Bearer ".length);
  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "invalid or expired token" });
  }

  const email = decoded.email;
  if (!email) {
    return res.status(400).json({ error: "no email associated with this account" });
  }

  // Enforce @gmail.com only for email/password signup
  // Google OAuth always returns @gmail.com, so this mainly affects email signups
  const provider = decoded.firebase?.sign_in_provider === "google" ? "google" : "password";
  if (provider === "password" && !email.toLowerCase().endsWith("@gmail.com")) {
    return res.status(400).json({
      error: "only @gmail.com addresses are allowed for email signup.",
    });
  }

  try {
    // Find existing account
    let account = await Account.findOne({ firebaseUid: decoded.uid });

    if (account) {
      // Existing account — update lastLogin + emailVerified
      account.lastLoginAt = new Date();
      account.emailVerified = decoded.email_verified ?? false;
      await account.save();

      return res.json({
        account: {
          id: account._id.toString(),
          email: account.email,
          username: account.username,
          emailVerified: account.emailVerified,
          provider: account.provider,
          confessionIds: account.confessionIds.map((id) => id.toString()),
        },
        isNew: false,
      });
    }

    // New account — username handling
    let cleanUsername;
    if (username && typeof username === "string" && username.trim().length > 0) {
      // Username provided (email signup) — validate it
      cleanUsername = username.trim();
      if (cleanUsername.length < USERNAME_MIN || cleanUsername.length > USERNAME_MAX) {
        return res.status(400).json({
          error: `username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`,
        });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return res.status(400).json({
          error: "username can only contain letters, numbers, and underscores",
        });
      }
      if (RESERVED_USERNAMES.includes(cleanUsername.toLowerCase())) {
        return res.status(400).json({ error: "that username is reserved. try another." });
      }
      const existingUsername = await Account.findOne({ username: { $regex: new RegExp(`^${cleanUsername}$`, "i") } });
      if (existingUsername) {
        return res.status(409).json({ error: "that username is taken. try another." });
      }
    } else {
      // No username provided (Google signup) — auto-generate one
      cleanUsername = await generateUsername();
    }

    // Create account
    account = await Account.create({
      firebaseUid: decoded.uid,
      email: email.toLowerCase(),
      username: cleanUsername,
      provider,
      emailVerified: decoded.email_verified ?? false,
      confessionIds: [],
      lastLoginAt: new Date(),
    });

    return res.status(201).json({
      account: {
        id: account._id.toString(),
        email: account.email,
        username: account.username,
        emailVerified: account.emailVerified,
        provider: account.provider,
        confessionIds: [],
      },
      isNew: true,
    });
  } catch (err) {
    console.error("[auth/verify] error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ error: "that username or email is already registered." });
    }
    return res.status(500).json({ error: "failed to verify account" });
  }
});

/**
 * GET /api/auth/check-username?username=foo
 * Checks if a username is available (for real-time validation during signup).
 */
router.get("/auth/check-username", async (req, res) => {
  const username = String(req.query.username || "").trim();
  if (!username || username.length < USERNAME_MIN) {
    return res.json({ available: false, reason: "too short" });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.json({ available: false, reason: "invalid characters" });
  }
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return res.json({ available: false, reason: "reserved" });
  }

  try {
    const existing = await Account.findOne({
      username: { $regex: new RegExp(`^${username}$`, "i") },
    }).lean();
    return res.json({ available: !existing });
  } catch {
    return res.json({ available: false, reason: "check failed" });
  }
});

/**
 * POST /api/account/sync-confessions
 * Uploads localStorage confession IDs to the account (for cross-device sync).
 *
 * Headers: Authorization: Bearer <token>
 * Body: { confessionIds: [string] }
 *
 * Returns: { confessionIds: [string] } — the merged full list
 */
router.post("/account/sync-confessions", syncLimiter, requireAuth, async (req, res) => {
  const { confessionIds } = req.body ?? {};
  if (!Array.isArray(confessionIds)) {
    return res.status(400).json({ error: "confessionIds must be an array" });
  }

  // Validate ObjectIds
  const validIds = confessionIds
    .filter((id) => typeof id === "string" && mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  try {
    const account = await Account.findOne({ firebaseUid: req.firebaseUser.uid });
    if (!account) {
      return res.status(404).json({ error: "account not found" });
    }

    // Merge existing + new (dedup)
    const existingSet = new Set(account.confessionIds.map((id) => id.toString()));
    const merged = [...account.confessionIds];
    for (const id of validIds) {
      if (!existingSet.has(id.toString())) {
        merged.push(id);
        existingSet.add(id.toString());
      }
    }

    account.confessionIds = merged;
    await account.save();

    return res.json({
      confessionIds: merged.map((id) => id.toString()),
    });
  } catch (err) {
    console.error("[account/sync] error:", err);
    return res.status(500).json({ error: "failed to sync confessions" });
  }
});

/**
 * GET /api/account
 * Returns the current user's account data.
 *
 * Headers: Authorization: Bearer <token>
 */
router.get("/account", requireAuth, async (req, res) => {
  try {
    const account = await Account.findOne({ firebaseUid: req.firebaseUser.uid }).lean();
    if (!account) {
      return res.status(404).json({ error: "account not found" });
    }

    return res.json({
      account: {
        id: account._id.toString(),
        email: account.email,
        username: account.username,
        emailVerified: account.emailVerified,
        provider: account.provider,
        confessionIds: account.confessionIds.map((id) => id.toString()),
        createdAt: account.createdAt,
        lastLoginAt: account.lastLoginAt,
      },
    });
  } catch (err) {
    console.error("[account/get] error:", err);
    return res.status(500).json({ error: "failed to fetch account" });
  }
});

/**
 * DELETE /api/account
 * Deletes the account. Confessions stay on the wall (they're anonymous).
 * The confessionIds link is removed, so "★ yours" badges disappear on
 * other devices. Also deletes the Firebase user.
 *
 * Headers: Authorization: Bearer <token>
 */
router.delete("/account", requireAuth, async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({ firebaseUid: req.firebaseUser.uid });
    if (!account) {
      return res.status(404).json({ error: "account not found" });
    }

    // Also delete the Firebase user
    if (firebaseAuth) {
      try {
        await firebaseAuth.deleteUser(req.firebaseUser.uid);
      } catch (err) {
        console.warn("[account/delete] failed to delete Firebase user:", err.message);
        // Continue — the account is already deleted from our DB
      }
    }

    return res.json({
      deleted: true,
      message: "account deleted. your confessions are still on the wall — they're anonymous.",
    });
  } catch (err) {
    console.error("[account/delete] error:", err);
    return res.status(500).json({ error: "failed to delete account" });
  }
});

/**
 * PUT /api/account/username
 * Changes the user's username.
 *
 * Headers: Authorization: Bearer <token>
 * Body: { username: string }
 */
router.put("/account/username", requireAuth, async (req, res) => {
  const { username } = req.body ?? {};
  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "username is required" });
  }

  const cleanUsername = username.trim();
  if (cleanUsername.length < USERNAME_MIN || cleanUsername.length > USERNAME_MAX) {
    return res.status(400).json({
      error: `username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`,
    });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return res.status(400).json({
      error: "username can only contain letters, numbers, and underscores",
    });
  }
  if (RESERVED_USERNAMES.includes(cleanUsername.toLowerCase())) {
    return res.status(400).json({ error: "that username is reserved." });
  }

  try {
    // Check if username is taken by someone else
    const existing = await Account.findOne({
      username: { $regex: new RegExp(`^${cleanUsername}$`, "i") },
      firebaseUid: { $ne: req.firebaseUser.uid },
    }).lean();

    if (existing) {
      return res.status(409).json({ error: "that username is taken." });
    }

    const account = await Account.findOneAndUpdate(
      { firebaseUid: req.firebaseUser.uid },
      { username: cleanUsername },
      { new: true }
    ).lean();

    if (!account) {
      return res.status(404).json({ error: "account not found" });
    }

    return res.json({
      username: account.username,
      message: "username updated.",
    });
  } catch (err) {
    console.error("[account/username] error:", err);
    return res.status(500).json({ error: "failed to update username" });
  }
});

export default router;
