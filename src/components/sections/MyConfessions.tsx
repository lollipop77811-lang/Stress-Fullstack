import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BRICK_BG } from "@/assets/brickBg";
import ShareButtons from "@/components/ui/ShareButtons";
import {
  listMyConfessions,
  type Confession as UserConfession,
} from "@/lib/confessionsApi";
import { cn } from "@/utils/cn";

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   TYPES & CONSTANTS — mirror ConfessionWall.tsx
   ============================================================ */

type Color = "yellow" | "pink" | "blue" | "green" | "orange" | "purple";
type Aging = "fresh" | "faded" | "torn" | "crumpled" | "old";

type Note = {
  id: string;
  text: string;
  author: string;
  color: Color;
  aging: Aging;
  wallIdx: number;
  isArchived: boolean;
  createdAt: string;
  top: number; // %
  left: number;
  rot: number;
  w: number;
};

const COLOR_MAP: Record<Color, { bg: string; edge: string; tape: string; text: string }> = {
  yellow: { bg: "#fff3a3", edge: "#e6d97a", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  pink: { bg: "#ffc6d4", edge: "#e597a9", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  blue: { bg: "#c9e8f5", edge: "#9bc8de", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  green: { bg: "#d4f0c4", edge: "#a3cd8e", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  orange: { bg: "#ffe0c2", edge: "#e0b88e", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  purple: { bg: "#ddd0f0", edge: "#b3a3d8", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
};

const MINE_KEY = "osk.confessions.mine.v1";

function loadMine(): string[] {
  try {
    const raw = localStorage.getItem(MINE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
  } catch {
    /* ignore */
  }
  return [];
}

function agingStyle(aging: Aging): {
  filter?: string;
  clipPath?: string;
  opacity?: number;
  extraShadow?: string;
  overlay?: string;
} {
  switch (aging) {
    case "faded":
      return {
        filter: "saturate(0.2) brightness(1.18) contrast(0.85)",
        opacity: 0.75,
        extraShadow: "5px 7px 0 rgba(11,12,16,0.4)",
        overlay:
          "radial-gradient(ellipse at center, rgba(255,255,255,0.18) 0%, transparent 70%)",
      };
    case "torn":
      return {
        clipPath:
          "polygon(0 6%, 55% 0, 62% 8%, 72% 2%, 82% 10%, 92% 4%, 100% 12%, 100% 88%, 78% 96%, 68% 100%, 58% 92%, 42% 100%, 32% 90%, 18% 96%, 8% 88%, 0 94%)",
        extraShadow: "5px 7px 0 rgba(11,12,16,0.4)",
      };
    case "crumpled":
      return {
        filter: "contrast(1.3) saturate(0.6) brightness(0.88)",
        extraShadow:
          "6px 6px 0 rgba(11,12,16,0.45), inset 8px 8px 14px rgba(11,12,16,0.35), inset -6px -6px 12px rgba(255,255,255,0.35)",
        overlay:
          "repeating-linear-gradient(125deg, rgba(11,12,16,0.22) 0px, rgba(11,12,16,0.22) 3px, transparent 3px, transparent 14px), repeating-linear-gradient(55deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 3px, transparent 3px, transparent 18px), radial-gradient(ellipse at 30% 40%, rgba(11,12,16,0.2) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(11,12,16,0.18) 0%, transparent 45%)",
      };
    case "old":
      return {
        filter: "sepia(0.75) saturate(0.55) brightness(0.88) contrast(1.08)",
        opacity: 0.85,
        extraShadow: "5px 6px 0 rgba(11,12,16,0.5)",
        overlay:
          "radial-gradient(ellipse at center, transparent 30%, rgba(74,44,30,0.38) 100%), radial-gradient(circle at 25% 30%, rgba(74,44,30,0.22) 0%, transparent 12%), radial-gradient(circle at 75% 70%, rgba(74,44,30,0.18) 0%, transparent 10%)",
      };
    case "fresh":
    default:
      return {};
  }
}

/** Deterministically compute position/rotation/width for a note
 *  based on its id hash — so each note always lands in the same spot. */
function computeLayout(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  const rand = (seed: number) => ((h ^ (seed * 2654435761)) >>> 0) / 4294967296;

  // Loose 4-col × 4-row grid with jitter (more rows since we might have up to 20+ notes)
  const slot = Math.floor(rand(1) * 16);
  const col = slot % 4;
  const row = Math.floor(slot / 4);
  const jitterX = (rand(2) - 0.5) * 12;
  const jitterY = (rand(3) - 0.5) * 8;
  const left = 4 + col * 23 + jitterX;
  const top = 20 + row * 19 + jitterY;
  const rot = (rand(4) - 0.5) * 18;
  const w = 160 + Math.floor(rand(5) * 50);
  return { top, left, rot, w };
}

function userConfessionToNote(c: UserConfession): Note {
  const layout = computeLayout(c.id);
  return {
    id: c.id,
    text: c.text,
    author: c.author,
    color: c.color as Color,
    aging: c.aging as Aging,
    wallIdx: c.wallIdx,
    isArchived: c.isArchived ?? false,
    createdAt: c.createdAt,
    ...layout,
  };
}

/* ============================================================
   COMPONENT
   ============================================================ */

export default function MyConfessions() {
  const root = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Note | null>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".mc-reveal",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 80%" },
        }
      );
      gsap.fromTo(
        ".my-note-wrap",
        { opacity: 0, scale: 0.6, y: -20 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.04,
          ease: "back.out(1.5)",
          clearProps: "opacity,transform",
        }
      );
    }, root);
    return () => ctx.revert();
  }, [notes]);

  /* Fetch user's confessions by their localStorage IDs */
  useEffect(() => {
    const ids = loadMine();
    if (ids.length === 0) {
      setLoading(false);
      setNotes([]);
      return;
    }
    setLoading(true);
    setError(null);
    listMyConfessions(ids)
      .then((list) => {
        setNotes(list.map(userConfessionToNote));
      })
      .catch(() => {
        setError("couldn't reach the wall. try again in a sec.");
      })
      .finally(() => setLoading(false));
  }, []);

  /* Modal: lock scroll + Esc to close */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const activeCount = notes.filter((n) => !n.isArchived).length;
  const archivedCount = notes.filter((n) => n.isArchived).length;

  /** Navigate to the wall route, then smooth-scroll to the confession
   *  composer card. Waits for the route change + React render before
   *  scrolling, because the composer element only exists on the wall
   *  page. */
  function goToComposer() {
    if (window.location.hash !== "#/wall") {
      window.location.hash = "#/wall";
    }
    // Wait for the route change to render the wall page (which contains
    // the composer), then scroll. A few rAFs + a small timeout is the
    // most reliable across browsers.
    const tryScroll = (attemptsLeft: number) => {
      const el = document.getElementById("composer");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (attemptsLeft > 0) {
        window.setTimeout(() => tryScroll(attemptsLeft - 1), 100);
      }
    };
    window.setTimeout(() => tryScroll(10), 120);
  }

  return (
    <section
      id="mine"
      ref={root}
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        backgroundColor: "#8b3a2b",
        backgroundImage: BRICK_BG,
        backgroundSize: "375px 108px",
        backgroundRepeat: "repeat",
      }}
    >
      {/* Subtle vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(11,12,16,0) 40%, rgba(11,12,16,0.55) 100%)",
        }}
      />

      {/* Header */}
      <header className="mc-reveal absolute left-0 right-0 top-0 z-30 px-4 pt-6 text-center sm:pt-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-center gap-3">
            <span className="inline-block rotate-[-2deg] rounded-full border-2 border-cream bg-pink px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-widest text-cream shadow-[3px_3px_0_#0b0c10] sm:text-xs">
              ★ your confessions
            </span>
            <span className="font-hand text-base font-bold text-toxic drop-shadow-[2px_2px_0_rgba(11,12,16,0.6)] sm:text-xl">
              {activeCount} live · {archivedCount} archived
            </span>
          </div>
          <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight text-cream drop-shadow-[3px_3px_0_rgba(11,12,16,0.6)] sm:text-6xl">
            My
            <br />
            <span className="text-toxic">Confessions</span>
          </h2>
          <p className="mt-2 font-hand text-base font-bold text-cream/80 drop-shadow-[1px_1px_0_rgba(11,12,16,0.7)] sm:text-lg">
            ↳ everything you've ever pinned. even the ones the wall forgot.
          </p>
        </div>
      </header>

      {/* Back-home + write-more CTAs */}
      <a
        href="#top"
        data-hover="BACK!"
        className="mc-reveal absolute left-4 top-6 z-30 inline-flex items-center gap-1.5 rounded-xl border-2 border-cream bg-jet px-3 py-2 font-display text-xs font-bold uppercase tracking-tight text-cream shadow-[3px_3px_0_#fcf7f8] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#fcf7f8]"
      >
        ← home
      </a>
      <div className="mc-reveal absolute right-4 top-6 z-30 flex gap-2">
        <a
          href="#/wall"
          data-hover="WALL!"
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-cream bg-electric px-3 py-2 font-display text-xs font-bold uppercase tracking-tight text-cream shadow-[3px_3px_0_#0b0c10] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#0b0c10]"
        >
          ← back to wall
        </a>
        <button
          onClick={() => goToComposer()}
          data-hover="WRITE!"
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-jet bg-toxic px-3 py-2 font-display text-xs font-bold uppercase tracking-tight text-jet shadow-[3px_3px_0_#0b0c10] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#0b0c10]"
        >
          ✍️ write more
        </button>
      </div>

      {/* Content area */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-32 pt-40 sm:px-8">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="text-6xl"
            >
              ⏳
            </motion.div>
          </div>
        ) : notes.length === 0 ? (
          /* Empty state */
          <div className="mc-reveal flex min-h-[400px] flex-col items-center justify-center text-center">
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="mb-6 text-8xl"
            >
              🗒️
            </motion.div>
            <h3 className="font-display text-3xl font-extrabold uppercase leading-[0.9] tracking-tight text-cream drop-shadow-[2px_2px_0_rgba(11,12,16,0.6)] sm:text-5xl">
              Nothing here yet.
            </h3>
            <p className="mt-4 max-w-md font-hand text-xl font-bold text-cream/80 drop-shadow-[1px_1px_0_rgba(11,12,16,0.7)]">
              you haven't pinned anything. the wall is waiting. go write your first confession.
            </p>
            <button
              onClick={() => goToComposer()}
              data-hover="WRITE!"
              className="mt-8 inline-flex items-center gap-2 rounded-xl border-2 border-jet bg-toxic px-7 py-4 font-display text-base font-bold uppercase tracking-tight text-jet shadow-[6px_6px_0_#0b0c10] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#0b0c10] sm:text-lg"
            >
              <span className="animate-wiggle">✍️</span>
              Write your first →
            </button>
          </div>
        ) : error ? (
          <div className="mc-reveal flex min-h-[400px] flex-col items-center justify-center text-center">
            <div className="mb-4 text-6xl">⚠️</div>
            <h3 className="font-display text-2xl font-extrabold uppercase text-cream">
              {error}
            </h3>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl border-2 border-cream bg-jet px-5 py-2.5 font-display text-sm font-bold uppercase tracking-tight text-cream"
            >
              ↺ try again
            </button>
          </div>
        ) : (
          /* Notes grid */
          <div
            className="relative"
            style={{ minHeight: `${Math.max(600, Math.ceil(notes.length / 4) * 220)}px` }}
          >
            <AnimatePresence>
              {notes.map((n) => {
                const col = COLOR_MAP[n.color];
                const ag = agingStyle(n.aging);
                const style: CSSProperties = {
                  top: `${n.top}%`,
                  left: `${n.left}%`,
                  width: `${n.w}px`,
                  backgroundColor: col.bg,
                  color: col.text,
                  transform: `rotate(${n.rot}deg)`,
                  boxShadow: ag.extraShadow
                    ? ag.extraShadow
                    : "6px 6px 0 rgba(11,12,16,0.45), 0 2px 4px rgba(11,12,16,0.3)",
                  filter: ag.filter,
                  opacity: n.isArchived ? 0.5 : ag.opacity,
                  clipPath: ag.clipPath,
                };
                return (
                  <div
                    key={n.id}
                    className="my-note-wrap absolute"
                    style={{ top: style.top, left: style.left, width: style.width }}
                  >
                    <motion.button
                      onClick={() => setOpen(n)}
                      data-hover="READ"
                      aria-label={`Open your confession #${n.id}`}
                      initial={false}
                      whileHover={{ scale: 1.1, rotate: n.rot * 0.4, zIndex: 50 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 320, damping: 20 }}
                      className={cn(
                        "sticky-note group relative block w-full cursor-pointer p-3 text-left",
                        n.isArchived && "ring-2 ring-pink ring-offset-2 ring-offset-transparent"
                      )}
                      style={{
                        ...style,
                        top: undefined,
                        left: undefined,
                        width: "100%",
                      }}
                    >
                      {ag.overlay && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0"
                          style={{ background: ag.overlay }}
                        />
                      )}
                      {/* Tape */}
                      <span
                        aria-hidden
                        className="absolute -top-2 left-1/2 h-5 w-12 -translate-x-1/2 rotate-1 rounded-sm"
                        style={{
                          backgroundColor: col.tape,
                          boxShadow: "0 1px 2px rgba(11,12,16,0.2)",
                        }}
                      />
                      {/* Fold corner (skip on torn) */}
                      {n.aging !== "torn" && (
                        <span
                          aria-hidden
                          className="absolute right-0 top-0 h-0 w-0"
                          style={{
                            borderTop: `12px solid ${col.edge}`,
                            borderRight: "12px solid transparent",
                          }}
                        />
                      )}

                      {/* "★ yours" badge */}
                      <span className="absolute -left-2 -top-2 z-10 rotate-[-6deg] rounded-full border-2 border-jet bg-jet px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-toxic shadow-[2px_2px_0_#fcf7f8]">
                        ★ yours
                      </span>

                      {/* Archived badge */}
                      {n.isArchived && (
                        <span className="absolute -right-2 -top-2 z-10 rotate-[6deg] rounded-full border-2 border-jet bg-pink px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-cream shadow-[2px_2px_0_#fcf7f8]">
                          📦 archived
                        </span>
                      )}

                      {/* Text */}
                      <p className="relative line-clamp-5 font-hand text-sm font-bold leading-snug sm:text-base">
                        {n.text}
                      </p>

                      {/* Footer */}
                      <div className="relative mt-2 flex items-center justify-between border-t border-current/20 pt-1">
                        <span className="truncate text-[9px] font-bold uppercase tracking-wide opacity-60">
                          — {n.author}
                        </span>
                        <span className="ml-1 shrink-0 text-[9px] font-bold uppercase opacity-50">
                          {`wall ${n.wallIdx + 1}`}
                        </span>
                      </div>

                      {/* Hover hint */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-2 whitespace-nowrap rounded border border-current bg-current/0 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest opacity-0 transition-opacity duration-200 group-hover:opacity-90"
                      >
                        tap to enlarge
                      </span>
                    </motion.button>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Enlarge modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-[200] grid place-items-center bg-jet/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.4, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.4, rotate: 8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md p-8 sm:p-12"
              style={{
                backgroundColor: COLOR_MAP[open.color].bg,
                color: COLOR_MAP[open.color].text,
                boxShadow: "12px 12px 0 rgba(11,12,16,0.6)",
                clipPath: open.aging === "torn"
                  ? "polygon(0 0, 88% 0, 96% 6%, 100% 4%, 100% 100%, 0 100%)"
                  : undefined,
                filter:
                  open.aging === "faded" ? "saturate(0.6)"
                  : open.aging === "old" ? "sepia(0.35) saturate(0.75)"
                  : open.aging === "crumpled" ? "contrast(1.1)"
                  : undefined,
              }}
            >
              {/* Tape */}
              <span
                aria-hidden
                className="absolute -top-3 left-1/2 h-7 w-20 -translate-x-1/2 rotate-1 rounded-sm"
                style={{
                  backgroundColor: COLOR_MAP[open.color].tape,
                  boxShadow: "0 1px 2px rgba(11,12,16,0.2)",
                }}
              />
              {/* Close */}
              <button
                onClick={() => setOpen(null)}
                data-hover="CLOSE"
                aria-label="Close"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg border-2 border-current bg-current/0 text-lg font-bold transition-transform hover:rotate-90"
              >
                ✕
              </button>
              {/* Fold corner */}
              {open.aging !== "torn" && (
                <span
                  aria-hidden
                  className="absolute right-0 top-0 h-0 w-0"
                  style={{
                    borderTop: `18px solid ${COLOR_MAP[open.color].edge}`,
                    borderRight: "18px solid transparent",
                  }}
                />
              )}
              {/* "★ yours" badge */}
              <span className="absolute -left-3 -top-3 z-10 rotate-[-6deg] rounded-full border-2 border-jet bg-jet px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-toxic shadow-[3px_3px_0_#fcf7f8]">
                ★ yours
              </span>
              {/* Meta */}
              <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest opacity-60">
                <span>confession #{open.id.slice(-6)}</span>
                <span>·</span>
                <span>{`wall ${open.wallIdx + 1}`}</span>
                {open.isArchived && (
                  <>
                    <span>·</span>
                    <span className="text-pink">📦 archived</span>
                  </>
                )}
              </div>
              {/* Full text */}
              <p className="font-hand text-2xl font-bold leading-tight sm:text-3xl">
                {open.text}
              </p>
              <div className="mt-6 flex items-center justify-between border-t-2 border-current/20 pt-4">
                <span className="font-display text-sm font-extrabold uppercase tracking-wide">
                  — {open.author}
                </span>
                <span className="font-hand text-base font-bold opacity-60">
                  {new Date(open.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Share buttons */}
              <div className="mt-4 border-t-2 border-current/20 pt-4">
                <p className="mb-2 font-display text-[10px] font-extrabold uppercase tracking-widest opacity-60">
                  ↳ share your confession
                </p>
                <ShareButtons
                  text={open.text}
                  author={open.author}
                  id={open.id}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
