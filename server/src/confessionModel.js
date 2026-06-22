// Mongoose schema for a single confession pinned to a Wall of Confession.
// One document = one sticky note on one wall.
//
// Walls are INFINITE — there's no fixed wall count. When a wall hits
// WALL_CAP confessions, the next confession auto-spawns wall N+1.

import mongoose from "mongoose";

const ALLOWED_COLORS = ["yellow", "pink", "blue", "green", "orange", "purple"];
const ALLOWED_AGINGS = ["fresh", "faded", "torn", "crumpled", "old"];
const WALL_CAP = 20; // max confessions per wall before next wall is spawned

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
    ipHash: { type: String, default: null, select: false },
  },
  { timestamps: true }
);

// Index for the most common query: list confessions on a wall newest-first
confessionSchema.index({ wallIdx: 1, isArchived: 1, createdAt: -1 });

// Static helpers
confessionSchema.statics = {
  ALLOWED_COLORS,
  ALLOWED_AGINGS,
  WALL_CAP,
};

const Confession = mongoose.model("Confession", confessionSchema);

export default Confession;
export { ALLOWED_COLORS, ALLOWED_AGINGS, WALL_CAP };
