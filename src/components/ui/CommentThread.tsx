import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as BadWords from "bad-words";
import { cn } from "@/utils/cn";
import {
  listComments,
  createComment,
  reportComment,
  type Comment as CommentType,
} from "@/lib/confessionsApi";

/* ---------- constants ---------- */

const CHAR_MAX = 500;

const profanityFilter = new BadWords.Filter();

/* ---------- helpers ---------- */

function getSessionId(): string {
  try {
    let id = localStorage.getItem("osk.sessionId.v1");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("osk.sessionId.v1", id);
    }
    return id;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
  }
}

function loadReportedComments(): Set<string> {
  try {
    const raw = localStorage.getItem("osk.comments.reported.v1");
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveReportedComments(set: Set<string>) {
  try {
    localStorage.setItem("osk.comments.reported.v1", JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ============================================================
   CommentThread — renders inside the enlarge modal.
   Shows threaded comments (2 levels max) + composer.
   ============================================================ */

export default function CommentThread({
  confessionId,
  commentsEnabled,
}: {
  confessionId: string;
  commentsEnabled: boolean;
}) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [count, setCount] = useState(0);
  const [cap, setCap] = useState(50);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reported, setReported] = useState<Set<string>>(() => loadReportedComments());
  const sessionIdRef = useState(getSessionId())[0];

  /* Fetch comments on mount */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listComments(confessionId).then((data) => {
      if (cancelled) return;
      setComments(data.comments);
      setCount(data.count);
      setCap(data.cap);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [confessionId]);

  const canComment = !submitting && text.trim().length >= 1 && count < cap;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canComment) return;
    setSubmitting(true);
    setError(null);
    try {
      const filtered = profanityFilter.clean(text.trim());
      const result = await createComment(confessionId, {
        text: filtered,
        author: author.trim() || "anon",
        parentId: null,
      });
      setComments((prev) => [result.comment, ...prev]);
      setCount((c) => c + 1);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't post comment. try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const filtered = profanityFilter.clean(replyText.trim());
      const result = await createComment(confessionId, {
        text: filtered,
        author: author.trim() || "anon",
        parentId,
      });
      // Add reply to the parent's replies array
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies ?? []), result.comment] }
            : c
        )
      );
      setCount((c) => c + 1);
      setReplyText("");
      setReplyTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't post reply. try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportComment = async (commentId: string) => {
    if (reported.has(commentId)) return;
    // Optimistic
    const newReported = new Set(reported);
    newReported.add(commentId);
    setReported(newReported);
    saveReportedComments(newReported);

    try {
      const result = await reportComment(commentId, sessionIdRef);
      if (result.isHidden) {
        // Remove from view
        setComments((prev) =>
          prev
            .filter((c) => c.id !== commentId)
            .map((c) => ({
              ...c,
              replies: (c.replies ?? []).filter((r) => r.id !== commentId),
            }))
        );
      }
    } catch {
      // Roll back
      const rolledBack = new Set(reported);
      rolledBack.delete(commentId);
      setReported(rolledBack);
      saveReportedComments(rolledBack);
    }
  };

  /* --- Render --- */

  if (!commentsEnabled) {
    return (
      <div className="mt-4 border-t-2 border-current/20 pt-4 text-center">
        <p className="font-hand text-base font-bold opacity-50">
          🔒 comments disabled by the author
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t-2 border-current/20 pt-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-[10px] font-extrabold uppercase tracking-widest opacity-60">
          💬 comments ({count}/{cap})
        </p>
      </div>

      {/* Comment composer */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value.slice(0, 30))}
            placeholder="anon"
            maxLength={30}
            className="w-24 shrink-0 rounded-lg border-2 border-jet bg-cream/80 px-2 py-2 font-body text-xs font-semibold text-jet outline-none placeholder:text-jet/40 focus:bg-cream"
          />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, CHAR_MAX))}
            placeholder="say something kind…"
            maxLength={CHAR_MAX}
            className="flex-1 rounded-lg border-2 border-jet bg-cream/80 px-3 py-2 font-body text-sm font-medium text-jet outline-none placeholder:text-jet/40 focus:bg-cream"
          />
          <motion.button
            type="submit"
            disabled={!canComment}
            whileHover={canComment ? { y: -1 } : undefined}
            whileTap={canComment ? { scale: 0.96 } : undefined}
            className={cn(
              "shrink-0 rounded-lg border-2 border-jet px-4 py-2 font-display text-xs font-bold uppercase tracking-tight transition-opacity duration-150",
              canComment ? "bg-pink text-cream" : "cursor-not-allowed bg-paper text-jet/30"
            )}
          >
            {submitting ? "…" : "post"}
          </motion.button>
        </div>
        <div className="mt-1 flex justify-between px-1">
          {error ? (
            <span className="text-[10px] font-bold text-pink">{error}</span>
          ) : (
            <span className="text-[10px] font-bold text-ink/40">1 per minute · be kind · no slurs</span>
          )}
          <span className={cn("text-[10px] font-bold", text.length > 180 ? "text-pink" : "text-ink/40")}>
            {text.length}/{CHAR_MAX}
          </span>
        </div>
      </form>

      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="text-2xl"
          >
            ⏳
          </motion.span>
        </div>
      ) : comments.length === 0 ? (
        <p className="py-4 text-center font-hand text-sm font-bold text-ink/40">
          ↳ no comments yet. be the first to say something.
        </p>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                replyText={replyText}
                setReplyText={setReplyText}
                onReply={handleReply}
                submitting={submitting}
                reported={reported}
                onReport={handleReportComment}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Cap reached */}
      {count >= cap && (
        <p className="mt-3 text-center font-hand text-sm font-bold text-ink/40">
          ↳ this conversation has reached its limit. it's done. go outside.
        </p>
      )}
    </div>
  );
}

/* ============================================================
   CommentItem — single comment + its replies
   ============================================================ */

function CommentItem({
  comment,
  replyTo,
  setReplyTo,
  replyText,
  setReplyText,
  onReply,
  submitting,
  reported,
  onReport,
}: {
  comment: CommentType;
  replyTo: string | null;
  setReplyTo: (id: string | null) => void;
  replyText: string;
  setReplyText: (s: string) => void;
  onReply: (parentId: string) => void;
  submitting: boolean;
  reported: Set<string>;
  onReport: (id: string) => void;
}) {
  const isReplying = replyTo === comment.id;
  const isReported = reported.has(comment.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-xl border border-current/15 bg-current/5 p-3"
    >
      {/* Comment body */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="font-body text-sm font-medium leading-snug text-jet">
            {comment.text}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-ink/50">
            <span>— {comment.author}</span>
            <span>·</span>
            <span>{timeAgo(comment.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-1.5 flex items-center gap-3">
        <button
          onClick={() => setReplyTo(isReplying ? null : comment.id)}
          className="min-h-[36px] px-1 text-xs font-bold uppercase tracking-wide text-ink/50 transition-colors hover:text-pink"
        >
          ↳ reply
        </button>
        <button
          onClick={() => onReport(comment.id)}
          disabled={isReported}
          className={cn(
            "min-h-[36px] px-1 text-xs font-bold uppercase tracking-wide transition-colors",
            isReported ? "text-ink/20" : "text-ink/50 hover:text-pink"
          )}
        >
          {isReported ? "🚩 reported" : "🚩 report"}
        </button>
      </div>

      {/* Reply composer */}
      <AnimatePresence>
        {isReplying && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value.slice(0, CHAR_MAX))}
                placeholder={`reply to ${comment.author}…`}
                maxLength={CHAR_MAX}
                autoFocus
                className="flex-1 rounded-lg border-2 border-jet bg-cream/80 px-3 py-1.5 font-body text-xs font-medium text-jet outline-none placeholder:text-jet/40 focus:bg-cream"
              />
              <motion.button
                onClick={() => onReply(comment.id)}
                disabled={!replyText.trim() || submitting}
                whileHover={replyText.trim() && !submitting ? { y: -1 } : undefined}
                className={cn(
                  "shrink-0 rounded-lg border-2 border-jet px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-tight",
                  replyText.trim() && !submitting
                    ? "bg-electric text-cream"
                    : "cursor-not-allowed bg-paper text-jet/30"
                )}
              >
                {submitting ? "…" : "reply"}
              </motion.button>
              <button
                onClick={() => {
                  setReplyTo(null);
                  setReplyText("");
                }}
                className="shrink-0 rounded-lg border-2 border-jet bg-cream px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-tight text-jet"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replies (level 2) */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 ml-4 space-y-2 border-l-2 border-current/15 pl-3">
          {comment.replies.map((r) => {
            const rReported = reported.has(r.id);
            return (
              <div key={r.id} className="rounded-lg bg-current/5 p-2">
                <p className="font-body text-xs font-medium leading-snug text-jet">
                  {r.text}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-[9px] font-bold uppercase tracking-wide text-ink/50">
                  <span>— {r.author}</span>
                  <span>·</span>
                  <span>{timeAgo(r.createdAt)}</span>
                  <button
                    onClick={() => onReport(r.id)}
                    disabled={rReported}
                    className={cn(
                      "transition-colors",
                      rReported ? "text-ink/20" : "text-ink/40 hover:text-pink"
                    )}
                  >
                    {rReported ? "🚩" : "🚩"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
