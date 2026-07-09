// Mongoose schema for a comment on a confession.
// One document = one comment (top-level or reply).
//
// Threading is limited to 2 levels:
//   Level 1: top-level comment (parentId = null)
//   Level 2: reply to a top-level comment (parentId = commentId)
// Replies to replies are NOT allowed (parentId of a reply must be a
// top-level comment, not another reply).

import mongoose from "mongoose";

const COMMENT_CAP = 50; // max comments per confession before new ones are blocked
const COMMENT_MAX_LENGTH = 500;
const COMMENT_MIN_LENGTH = 1;

const commentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "text is required"],
      trim: true,
      minlength: [COMMENT_MIN_LENGTH, "comment must be at least 1 character"],
      maxlength: [COMMENT_MAX_LENGTH, "comment must be at most 500 characters"],
    },
    author: {
      type: String,
      required: true,
      trim: true,
      default: "anon",
      maxlength: [30, "author must be at most 30 characters"],
    },
    /** The confession this comment is on. */
    confessionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Confession",
      index: true,
    },
    /** null for top-level comments. For replies, the ID of the
     *  top-level comment being replied to. */
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "Comment",
    },
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    reportCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reportedBy: {
      type: [String],
      default: [],
      select: false,
    },
  },
  { timestamps: true }
);

// Index for listing comments on a confession, newest-first
commentSchema.index({ confessionId: 1, isHidden: 1, createdAt: -1 });

commentSchema.statics = {
  COMMENT_CAP,
  COMMENT_MAX_LENGTH,
  COMMENT_MIN_LENGTH,
};

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
export { COMMENT_CAP, COMMENT_MAX_LENGTH, COMMENT_MIN_LENGTH };
