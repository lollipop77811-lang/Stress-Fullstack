// Mongoose schema for a Whisper on the Whisper Wall.
//
// Whispers are short, anonymous, ephemeral messages that dissolve after 24h.
// Unlike confessions (which are permanent), whispers are designed to be
// fleeting — once 24h passes, MongoDB's TTL index automatically deletes them.
//
// A whisper is tied to an account (firebaseUid) so that after sign-in, the
// same whispers are visible across all devices the user is signed in on.
// The author field stores the username at creation time so whispers stay
// anonymous-looking in the UI (display name only, no account link exposed).

import mongoose from "mongoose";

const WHISPER_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const WHISPER_MAX_LENGTH = 500;
const WHISPER_MIN_LENGTH = 1;
const WITNESS_THRESHOLD = 100; // auto-dissolve after 100 witnesses

const ALLOWED_MOODS = ["wilt", "plead", "boom", "skull", "burn", "no"];

const whisperSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "text is required"],
      trim: true,
      minlength: [WHISPER_MIN_LENGTH, "text must be at least 1 character"],
      maxlength: [WHISPER_MAX_LENGTH, `text must be at most ${WHISPER_MAX_LENGTH} characters`],
    },
    /** Display name shown on the whisper card. Defaults to "anon". */
    author: {
      type: String,
      required: true,
      trim: true,
      default: "anon",
      maxlength: [30, "author must be at most 30 characters"],
    },
    mood: {
      type: String,
      required: true,
      enum: ALLOWED_MOODS,
      default: "wilt",
    },
    /** Firebase UID of the account that created this whisper. Used for
     *  cross-device sync (account's whispers are visible on all devices). */
    firebaseUid: {
      type: String,
      required: true,
      index: true,
    },
    /** Number of times this whisper has been witnessed. */
    witnessCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Set of session IDs that have witnessed this whisper (for dedup). */
    witnessedBy: {
      type: [String],
      default: [],
    },
    /** True if the whisper was auto-dissolved (reached witness threshold).
     *  When true, the text is replaced with a kind note. */
    dissolved: {
      type: Boolean,
      default: false,
    },
    /** When the whisper was created. Used for TTL + countdown display. */
    createdAt: {
      type: Date,
      default: Date.now,
    },
    /** When the whisper should dissolve. Defaults to createdAt + 24h.
     *  MongoDB TTL index on this field auto-deletes expired docs. */
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + WHISPER_TTL_SECONDS * 1000),
    },
  },
  {
    timestamps: false, // we use createdAt/expiresAt explicitly
  }
);

// TTL index — MongoDB will auto-delete documents when expiresAt is reached.
// expireAfterSeconds: 0 means "delete exactly when expiresAt passes".
whisperSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Whisper = mongoose.model("Whisper", whisperSchema);

export {
  Whisper as default,
  WHISPER_TTL_SECONDS,
  WHISPER_MAX_LENGTH,
  WHISPER_MIN_LENGTH,
  WITNESS_THRESHOLD,
  ALLOWED_MOODS,
};
