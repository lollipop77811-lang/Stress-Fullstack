import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";

type Reason = "spam" | "hate" | "self-harm" | "doxxing" | "other";

const REASONS: { id: Reason; label: string; emoji: string; desc: string }[] = [
  { id: "spam", label: "Spam / scam", emoji: "📢", desc: "repetitive, promotional, or scam content" },
  { id: "hate", label: "Hate / harassment", emoji: "⚠️", desc: "hate speech, slurs, or targeted harassment" },
  { id: "self-harm", label: "Self-harm / crisis", emoji: "💙", desc: "the author seems to be in crisis" },
  { id: "doxxing", label: "Private info", emoji: "🔒", desc: "shares someone's personal information" },
  { id: "other", label: "Other", emoji: "❓", desc: "something else (we'll review)" },
];

/**
 * ReportModal — lets a user report a confession. After 3 reports
 * from distinct sessions, the confession is auto-hidden.
 */
export default function ReportModal({
  show,
  onClose,
  onSubmit,
  alreadyReported,
}: {
  show: boolean;
  onClose: () => void;
  onSubmit: (reason: Reason) => Promise<void>;
  alreadyReported: boolean;
}) {
  const [selected, setSelected] = useState<Reason | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(selected);
    } finally {
      setSubmitting(false);
      setSelected(null);
    }
  };

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-[350] grid place-items-center bg-jet/80 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.85, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[2rem] border-[3px] border-jet bg-cream p-6 shadow-brutal-xl sm:p-8"
          >
            {/* Close */}
            <button
              onClick={handleClose}
              data-hover="CLOSE"
              aria-label="Close"
              className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-lg border-2 border-jet bg-cream text-lg font-bold transition-transform hover:rotate-90 z-10"
            >
              ✕
            </button>

            {/* Header */}
            <div className="mb-1 text-4xl">🚩</div>
            <h3 className="font-display text-2xl font-extrabold uppercase leading-tight tracking-tight">
              Report this confession
            </h3>

            {alreadyReported ? (
              <p className="mt-4 font-body text-base text-ink/70">
                You've already reported this confession. Thanks for helping keep
                the wall safe — we'll review it.
              </p>
            ) : (
              <>
                <p className="mt-2 font-body text-sm text-ink/70">
                  Help us keep the wall safe. After 3 reports, this confession
                  is automatically hidden for review.
                </p>

                {/* Reason picker */}
                <div className="mt-5 space-y-2">
                  {REASONS.map((r) => {
                    const on = r.id === selected;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelected(r.id)}
                        data-hover={r.label.toUpperCase()}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border-2 border-jet p-3 text-left transition-[transform,box-shadow,background-color] duration-150",
                          on
                            ? "bg-pink text-cream shadow-[3px_3px_0_#0b0c10]"
                            : "bg-cream text-jet hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#0b0c10]"
                        )}
                      >
                        <span className="text-2xl">{r.emoji}</span>
                        <div className="flex-1">
                          <div className="font-display text-sm font-extrabold uppercase tracking-tight">
                            {r.label}
                          </div>
                          <div
                            className={cn(
                              "text-xs",
                              on ? "text-cream/80" : "text-ink/60"
                            )}
                          >
                            {r.desc}
                          </div>
                        </div>
                        {on && (
                          <span className="text-lg text-cream">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Submit */}
                <motion.button
                  onClick={handleSubmit}
                  disabled={!selected || submitting}
                  whileHover={selected && !submitting ? { y: -2 } : undefined}
                  whileTap={selected && !submitting ? { scale: 0.97 } : undefined}
                  className={cn(
                    "mt-5 w-full rounded-xl border-2 border-jet px-5 py-3 font-display text-sm font-bold uppercase tracking-tight shadow-brutal transition-[transform,box-shadow,opacity] duration-150",
                    selected && !submitting
                      ? "bg-pink text-cream"
                      : "cursor-not-allowed bg-paper text-jet/40 opacity-70"
                  )}
                >
                  {submitting ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="mr-2 inline-block"
                      >
                        ⏳
                      </motion.span>
                      Reporting…
                    </>
                  ) : (
                    "🚩 Submit report"
                  )}
                </motion.button>
              </>
            )}

            {/* Close link */}
            <button
              onClick={handleClose}
              className="mt-3 w-full text-center font-hand text-base font-bold text-ink/50 hover:text-ink/70"
            >
              {alreadyReported ? "← close" : "← cancel"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
