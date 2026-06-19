// Mongoose schema for a single confession pinned to a Wall of Confession.
// One document = one sticky note on one wall.

import mongoose from "mongoose";

const ALLOWED_COLORS = ["yellow", "pink", "blue", "green", "orange", "purple"];
const ALLOWED_AGINGS = ["fresh", "faded", "torn", "crumpled", "old"];
const WALL_COUNT = 5; // walls 0..4
const WALL_CAP = 20; // max user confessions per wall before oldest is archived

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
      max: WALL_COUNT - 1,
      validate: {
        validator: Number.isInteger,
        message: "wallIdx must be an integer 0..4",
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Optional: ipHash for future rate-limit dedup (not populated yet —
    // express-rate-limit handles limiting in-memory)
    ipHash: { type: String, default: null, select: false },
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

// Index for the most common query: list non-archived confessions on a wall
// ordered newest-first.
confessionSchema.index({ wallIdx: 1, isArchived: 1, createdAt: -1 });

// Static helpers — keep model logic in one place
confessionSchema.statics = {
  ALLOWED_COLORS,
  ALLOWED_AGINGS,
  WALL_COUNT,
  WALL_CAP,
};

const Confession = mongoose.model("Confession", confessionSchema);

export default Confession;
export { ALLOWED_COLORS, ALLOWED_AGINGS, WALL_COUNT, WALL_CAP };
