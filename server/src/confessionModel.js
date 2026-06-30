// Mongoose schema for a single confession pinned to a Wall of Confession.
// One document = one sticky note on one wall.
//
// Walls are INFINITE — there's no fixed wall count. When a wall hits
// WALL_CAP confessions, the next confession auto-spawns wall N+1.

import mongoose from "mongoose";

const ALLOWED_COLORS = ["yellow", "pink", "blue", "green", "orange", "purple"];
const ALLOWED_AGINGS = ["fresh", "faded", "torn", "crumpled", "old"];
const WALL_CAP = 15; // max confessions per wall before next wall is spawned

const confessionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "text is required"],
      trim: true,
      minlength: [3, "text must be at least 3 characters"],
      maxlength: [200, "text must be at most 200 characters"],
    },
    author: {
      type: String,
      required: true,
      trim: true,
      default: "anon",
      maxlength: [30, "author must be at most 30 characters"],
    },
    color: {
      type: String,
      required: true,
      enum: ALLOWED_COLORS,
      default: "yellow",
    },
    aging: {
      type: String,
      required: true,
      enum: ALLOWED_AGINGS,
      default: "fresh",
    },
    wallIdx: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "wallIdx must be a non-negative integer",
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    witnessCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    /** Array of sessionIds that have witnessed this confession.
     *  Used for dedup (one witness per browser session).
     *  Not returned in API responses (select: false). */
    witnessedBy: {
      type: [String],
      default: [],
      select: false,
    },
    /** True if the confession has been auto-hidden after REPORT_THRESHOLD
     *  reports. Hidden confessions don't appear on walls or in featured. */
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    /** Number of times this confession has been reported. */
    reportCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Array of sessionIds that have reported this confession (dedup). */
    reportedBy: {
      type: [String],
      default: [],
      select: false,
    },
    /** True if the confession contains crisis/self-harm language.
     *  Stays visible (not silenced) but flagged for admin review. */
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    ipHash: { type: String, default: null, select: false },
  },
  { timestamps: true }
);

// Index for the most common query: list confessions on a wall newest-first
confessionSchema.index({ wallIdx: 1, isArchived: 1, isHidden: 1, createdAt: -1 });
// Index for "confession of the day" — most-witnessed in last 24h
confessionSchema.index({ witnessCount: -1, createdAt: -1 });

// Static helpers
confessionSchema.statics = {
  ALLOWED_COLORS,
  ALLOWED_AGINGS,
  WALL_CAP,
  REPORT_THRESHOLD: 3, // auto-hide after 3 reports
};

const Confession = mongoose.model("Confession", confessionSchema);

export default Confession;
export { ALLOWED_COLORS, ALLOWED_AGINGS, WALL_CAP };
