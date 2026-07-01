// Mongoose schema for a user account.
// Accounts are OPTIONAL — users can post confessions without one.
// The account is a "sync layer" — it links confession IDs for cross-device
// access but does NOT store confession content or link to it directly.

import mongoose from "mongoose";

const USERNAME_MIN = 3;
const USERNAME_MAX = 20;

const accountSchema = new mongoose.Schema(
  {
    /** Firebase UID (from Google or email auth). Unique. */
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    /** Email from Firebase (always @gmail.com per our restriction). */
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    /** Display username (like Reddit). Visible on the account page.
     *  NOT shown on confessions — confessions stay anonymous. */
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: [USERNAME_MIN, `username must be at least ${USERNAME_MIN} characters`],
      maxlength: [USERNAME_MAX, `username must be at most ${USERNAME_MAX} characters`],
      match: [/^[a-zA-Z0-9_]+$/, "username can only contain letters, numbers, and underscores"],
      index: true,
    },
    /** Provider: "google" or "password" (email). */
    provider: {
      type: String,
      enum: ["google", "password"],
      required: true,
    },
    /** Whether the email has been verified (Firebase handles this). */
    emailVerified: {
      type: Boolean,
      default: false,
    },
    /** Array of confession ObjectIds this account has "claimed".
     *  This is the ONLY link between accounts and confessions.
     *  The Confession document itself has NO accountId field.
     *  If the account is deleted, this link is removed but the
     *  confessions stay on the wall (they're anonymous). */
    confessionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
      ref: "Confession",
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

accountSchema.statics = {
  USERNAME_MIN,
  USERNAME_MAX,
};

// Validate username is not a reserved word
const RESERVED_USERNAMES = ["anon", "admin", "moderator", "system", "void", "wall"];
accountSchema.path("username").validate(function (v) {
  return !RESERVED_USERNAMES.includes(v.toLowerCase());
}, "that username is reserved. try another.");

const Account = mongoose.model("Account", accountSchema);

export default Account;
export { USERNAME_MIN, USERNAME_MAX, RESERVED_USERNAMES };
