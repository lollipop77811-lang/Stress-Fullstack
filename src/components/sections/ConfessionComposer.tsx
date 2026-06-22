import { useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as BadWords from "bad-words";
import { cn } from "@/utils/cn";
import {
  createConfession,
  type ConfessionAging,
  type ConfessionColor,
} from "@/lib/confessionsApi";

/* ---------- types ---------- */

type Props = {
  wallIdx: number;          // 0..4 — which wall to stick the new note on
  onSubmitted: (confession: {
    id: string;
    text: string;
    author: string;
    color: ConfessionColor;
    aging: ConfessionAging;
    wallIdx: number;
    createdAt: string;
  }) => void;
};

/* ---------- constants ---------- */

const CHAR_MAX = 200;
const CHAR_MIN = 3;

const COLORS: { id: ConfessionColor; hex: string; label: string }[] = [
  { id: "yellow", hex: "#fff3a3", label: "Caution yellow" },
  { id: "pink", hex: "#ffc6d4", label: "Pleading pink" },
  { id: "blue", hex: "#c9e8f5", label: "Midnight blue" },
  { id: "green", hex: "#d4f0c4", label: "Envy green" },
  { id: "orange", hex: "#ffe0c2", label: "Burnt orange" },
  { id: "purple", hex: "#ddd0f0", label: "Royal purple" },
];

const AGINGS: { id: ConfessionAging; emoji: string; label: string; sub: string }[] = [
  { id: "fresh", emoji: "✨", label: "Fresh wound", sub: "bright, clean, raw" },
  { id: "faded", emoji: "🌥️", label: "Midnight thought", sub: "washed out, 3am vibes" },
  { id: "torn", emoji: "📄", label: "Ripped from journal", sub: "jagged, frantic" },
  { id: "crumpled", emoji: "揉", label: "Been holding this in", sub: "creased, heavy" },
  { id: "old", emoji: "📜", label: "Ancient regret", sub: "yellowed, ages-old" },
];

const COLOR_HEX: Record<ConfessionColor, { bg: string; edge: string; text: string }> = {
  yellow: { bg: "#fff3a3", edge: "#e6d97a", text: "#1b1c22" },
  pink: { bg: "#ffc6d4", edge: "#e597a9", text: "#1b1c22" },
  blue: { bg: "#c9e8f5", edge: "#9bc8de", text: "#1b1c22" },
  green: { bg: "#d4f0c4", edge: "#a3cd8e", text: "#1b1c22" },
  orange: { bg: "#ffe0c2", edge: "#e0b88e", text: "#1b1c22" },
  purple: { bg: "#ddd0f0", edge: "#b3a3d8", text: "#1b1c22" },
};

/* ---------- profanity filter (module-level singleton) ---------- */

const filter = new BadWords.Filter();

/* ---------- component ---------- */

export default function ConfessionComposer({ wallIdx, onSubmitted }: Props) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [color, setColor] = useState<ConfessionColor>("yellow");
  const [aging, setAging] = useState<ConfessionAging>("fresh");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // Filter profanity on the way in (replace slurs with **** so user sees it)
  const filteredText = useMemo(() => {
    try {
      return filter.clean(text);
    } catch {
      return text;
    }
  }, [text]);

  const charCount = text.length;
  const remaining = CHAR_MAX - charCount;
  const canSubmit = !submitting && text.trim().length >= CHAR_MIN;

  const showToast = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    window.setTimeout(() => setToast(null), 3500);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const result = await createConfession({
        text: filteredText.trim(),
        author: author.trim() || "anon",
        color,
        aging,
        wallIdx,
      });
      onSubmitted(result.confession);
      // Reset
      setText("");
      setAuthor("");
      setColor("yellow");
      setAging("fresh");
      showToast(
        "ok",
        result.spawnedNewWall
          ? `stuck. 👍 wall ${result.actualWallIdx + 1} is fresh — you're the first to pin here.`
          : "stuck. 👍 your secret is now legally binding."
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "couldn't reach the wall. try again.";
      showToast("err", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const palette = COLOR_HEX[color];

  return (
    <section
      id="composer"
      className="relative px-4 py-20 sm:px-6 sm:py-28"
      style={{ backgroundColor: "var(--color-cream)" }}
    >
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <span className="inline-block rotate-[-3deg] font-hand text-2xl font-bold text-pink sm:text-3xl">
            ↳ your turn. the wall is listening.
          </span>
          <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl">
            Pin your own
            <br />
            <span className="text-stroke-thick">Confession</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md font-body text-base text-ink sm:text-lg">
            Write it. Pick a vibe. Hit the button. Watch it stick on the wall.
            Anonymous. Permanent (mostly). <span className="font-hand text-lg font-bold text-electric">No vibes killed.</span>
          </p>
        </div>

        {/* The sticky-note composer itself */}
        <div className="relative mx-auto max-w-xl" style={{ perspective: "1000px" }}>
          {/* Tape strip on top */}
          <span
            aria-hidden
            className="absolute -top-3 left-1/2 z-20 h-7 w-24 -translate-x-1/2 rotate-1 rounded-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.55)",
              boxShadow: "0 1px 3px rgba(11,12,16,0.25)",
            }}
          />
          <motion.form
            onSubmit={onSubmit}
            initial={{ rotate: -2 }}
            whileHover={{ rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="relative rounded-2xl border-[3px] border-jet p-6 shadow-brutal-xl sm:p-8"
            style={{
              backgroundColor: palette.bg,
              color: palette.text,
              boxShadow: "10px 10px 0 #0b0c10",
            }}
            data-composer-card
          >
            {/* Top-right fold corner */}
            <span
              aria-hidden
              className="absolute right-0 top-0 h-0 w-0"
              style={{
                borderTop: `16px solid ${palette.edge}`,
                borderRight: "16px solid transparent",
              }}
            />

            {/* Mood + color pickers row */}
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              {/* Color picker */}
              <div>
                <label className="mb-2 block font-display text-xs font-extrabold uppercase tracking-widest opacity-70">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => {
                    const on = c.id === color;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setColor(c.id)}
                        data-hover={c.label.toUpperCase()}
                        title={c.label}
                        aria-label={`Color: ${c.label}`}
                        className={cn(
                          "h-9 w-9 rounded-lg border-2 border-jet transition-transform duration-150",
                          on
                            ? "scale-110 shadow-[3px_3px_0_#0b0c10]"
                            : "hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#0b0c10]"
                        )}
                        style={{ backgroundColor: c.hex }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Aging / vibe picker */}
              <div>
                <label className="mb-2 block font-display text-xs font-extrabold uppercase tracking-widest opacity-70">
                  Vibe
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AGINGS.map((a) => {
                    const on = a.id === aging;
                    return (
                      <button
                        type="button"
                        key={a.id}
                        onClick={() => setAging(a.id)}
                        data-hover={a.label.toUpperCase()}
                        title={`${a.label} — ${a.sub}`}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border-2 border-jet px-2.5 py-1 text-[11px] font-bold uppercase tracking-tight transition-[transform,box-shadow] duration-150",
                          on
                            ? "bg-jet text-cream shadow-[2px_2px_0_#fcf7f8]"
                            : "bg-cream/60 text-jet hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#0b0c10]"
                        )}
                      >
                        <span>{a.emoji}</span>
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, CHAR_MAX))}
                placeholder="what's eating you? (nobody's reading this. except everyone. eventually.)"
                rows={4}
                data-hover="VENT"
                className="w-full resize-none rounded-xl border-2 border-jet bg-cream/80 px-4 py-3 font-hand text-lg font-bold leading-snug text-jet shadow-[3px_3px_0_#0b0c10] outline-none placeholder:text-jet/40 focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-[transform,box-shadow] duration-150"
              />
              <div className="mt-1.5 flex items-center justify-between px-1">
                <span className="font-hand text-sm font-bold text-ink/60">
                  profanity auto-bleeped · urls stripped · stay honest
                </span>
                <span
                  className={cn(
                    "text-xs font-bold uppercase tracking-wide",
                    remaining < 20 ? "text-pink" : "text-ink/50"
                  )}
                >
                  {charCount}/{CHAR_MAX}
                </span>
              </div>
            </div>

            {/* Author input */}
            <div className="mt-4">
              <label className="mb-1.5 block font-display text-xs font-extrabold uppercase tracking-widest opacity-70">
                Who's confessing? <span className="opacity-50">(optional)</span>
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value.slice(0, 30))}
                placeholder="anon"
                maxLength={30}
                data-hover="NAME"
                className="w-full rounded-xl border-2 border-jet bg-cream/80 px-4 py-2.5 font-body text-sm font-semibold text-jet shadow-[3px_3px_0_#0b0c10] outline-none placeholder:text-jet/40 focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-[transform,box-shadow] duration-150"
              />
            </div>

            {/* Submit + meta */}
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-hand text-sm font-bold text-ink/60">
                ↳ sticks on wall {wallIdx + 1}/5
              </p>
              <motion.button
                type="submit"
                disabled={!canSubmit}
                data-hover="STICK!"
                whileHover={canSubmit ? { x: 4, y: 4, boxShadow: "0px 0px 0px #0b0c10" } : undefined}
                whileTap={canSubmit ? { scale: 0.97 } : undefined}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-jet px-7 py-4 font-display text-base font-bold uppercase tracking-tight shadow-[6px_6px_0_#0b0c10] transition-[transform,box-shadow,opacity] duration-150 sm:text-lg",
                  canSubmit
                    ? "bg-pink text-cream"
                    : "cursor-not-allowed bg-cream/60 text-jet/40 opacity-70"
                )}
              >
                {submitting ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      ⏳
                    </motion.span>
                    Sticking…
                  </>
                ) : (
                  <>
                    <span className="animate-wiggle">📌</span>
                    Stick it on the wall →
                  </>
                )}
              </motion.button>
            </div>
          </motion.form>
        </div>

        {/* Footer disclaimer */}
        <p className="mx-auto mt-8 max-w-md text-center font-hand text-base font-bold text-ink/60">
          ↳ your confession is stored in a database. anonymous. but real.
          don't put anything you wouldn't write on a real wall.
        </p>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className={cn(
              "fixed bottom-8 left-1/2 z-[300] inline-flex items-center gap-2 rounded-xl border-2 border-jet px-5 py-3 font-display text-sm font-bold uppercase tracking-tight shadow-brutal sm:text-base",
              toast.kind === "ok"
                ? "bg-toxic text-jet"
                : "bg-pink text-cream"
            )}
          >
            <span>{toast.kind === "ok" ? "✓" : "⚠️"}</span>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
