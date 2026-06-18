import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ---------- types ---------- */

type StickyColor = "yellow" | "pink" | "blue" | "green" | "orange" | "purple";

type Confession = {
  id: number;
  text: string;
  author: string;
  color: StickyColor;
  top: number; // % within wall
  left: number; // % within wall
  rot: number; // deg
};

/* ---------- 10 confessions in the brand voice ---------- */

const CONFESSIONS: Confession[] = [
  { id: 1,  text: "I've been pretending to understand my job for 3 years. Nobody has noticed. The fear is constant.", author: "anon", color: "yellow", top: 4,  left: 4,  rot: -6 },
  { id: 2,  text: "I rehearse phone calls out loud before making them. Even the ones to my mom. Especially those.", author: "voicemail-phobic", color: "pink",   top: 7,  left: 30, rot: 4 },
  { id: 3,  text: "I told my therapist I was 'fine' and she laughed. She actually laughed.", author: "exposed", color: "blue", top: 3,  left: 58, rot: -3 },
  { id: 4,  text: "Reply 'sounds good!' to emails that absolutely do not sound good.", author: "corporate-me", color: "green",  top: 6,  left: 82, rot: 7 },
  { id: 5,  text: "I own 14 half-finished journals. Each one starts with 'this time will be different.'", author: "stationery goblin", color: "orange", top: 32, left: 14, rot: 5 },
  { id: 6,  text: "I check my phone for notifications, find none, then check again 30 seconds later. Just in case.", author: "doom-scroller", color: "purple", top: 36, left: 42, rot: -7 },
  { id: 7,  text: "I've been wearing the same hoodie for 4 days. It's becoming part of my identity.", author: "hoodler", color: "yellow", top: 30, left: 68, rot: 3 },
  { id: 8,  text: "I told everyone I'm 'into meditation' because I sat still once in 2019.", author: "zen fraud", color: "pink",   top: 62, left: 8,  rot: -4 },
  { id: 9,  text: "I have a recurring nightmare about missing a flight I never booked. I'm 34.", author: "aiport ghost", color: "blue", top: 58, left: 38, rot: 6 },
  { id: 10, text: "Every Sunday I plan to be a morning person. Every Monday I betray that person.", author: "5am liar", color: "green",  top: 65, left: 66, rot: -5 },
];

/* ---------- sticky note colors (Post-it palette) ---------- */

const COLOR_MAP: Record<
  StickyColor,
  { bg: string; edge: string; tape: string; text: string }
> = {
  yellow: { bg: "#fff3a3", edge: "#e6d97a", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  pink:   { bg: "#ffc6d4", edge: "#e597a9", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  blue:   { bg: "#c9e8f5", edge: "#9bc8de", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  green:  { bg: "#d4f0c4", edge: "#a3cd8e", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  orange: { bg: "#ffe0c2", edge: "#e0b88e", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  purple: { bg: "#ddd0f0", edge: "#b3a3d8", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
};

/* ---------- brick wall SVG (tileable) ---------- */
/* 80x50 brick ratio, row 2 offset by 40px, dark mortar, subtle highlights */

const BRICK_BG = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='100' viewBox='0 0 160 100'><rect width='160' height='100' fill='%238b3a2b'/><rect x='0' y='0' width='80' height='50' fill='%239a4232'/><rect x='80' y='0' width='80' height='50' fill='%237e3525'/><rect x='-40' y='50' width='80' height='50' fill='%23a04835'/><rect x='40' y='50' width='80' height='50' fill='%238b3a2b'/><rect x='120' y='50' width='80' height='50' fill='%23923e2c'/><line x1='0' y1='50' x2='160' y2='50' stroke='%232d1410' stroke-width='2'/><line x1='80' y1='0' x2='80' y2='50' stroke='%232d1410' stroke-width='2'/><line x1='40' y1='50' x2='40' y2='100' stroke='%232d1410' stroke-width='2'/><line x1='120' y1='50' x2='120' y2='100' stroke='%232d1410' stroke-width='2'/><rect x='0' y='0' width='80' height='2' fill='%23b85a40' opacity='0.4'/><rect x='80' y='0' width='80' height='2' fill='%23b85a40' opacity='0.4'/><rect x='-40' y='50' width='80' height='2' fill='%23b85a40' opacity='0.4'/><rect x='40' y='50' width='80' height='2' fill='%23b85a40' opacity='0.4'/><rect x='120' y='50' width='80' height='2' fill='%23b85a40' opacity='0.4'/></svg>")`;

/* ---------- component ---------- */

export default function ConfessionWall() {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Confession | null>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cw-reveal",
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
        ".sticky-note",
        { opacity: 0, scale: 0.6, y: -20 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: "back.out(1.5)",
          scrollTrigger: { trigger: root.current, start: "top 70%" },
        }
      );
    }, root);
    return () => ctx.revert();
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

  return (
    <section
      id="wall"
      ref={root}
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundColor: "#8b3a2b",
        backgroundImage: BRICK_BG,
        backgroundSize: "160px 100px",
        backgroundRepeat: "repeat",
      }}
    >
      {/* dark vignette overlay for drama + readability */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(11,12,16,0) 30%, rgba(11,12,16,0.55) 100%)",
        }}
      />

      {/* Header */}
      <div className="cw-reveal relative z-10 px-4 pt-20 pb-8 text-center sm:pt-28">
        <div className="mx-auto max-w-3xl">
          <span className="inline-block rotate-[-2deg] rounded-full border-2 border-cream bg-pink px-4 py-1.5 font-display text-xs font-extrabold uppercase tracking-widest text-cream shadow-[4px_4px_0_#0b0c10]">
            📌 anonymous · unfiltered
          </span>
          <h2 className="mt-5 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight text-cream drop-shadow-[4px_4px_0_rgba(11,12,16,0.5)] sm:text-7xl">
            Wall of
            <br />
            <span className="text-toxic">Confession</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-body text-base text-cream/85 sm:text-lg">
            Ten strangers. Ten sticky notes. Zero usernames.{" "}
            <span className="font-hand text-xl font-bold text-toxic">
              Tap any note to read the full confession.
            </span>{" "}
            No judgment. (Just vibes and a slight sense of dread.)
          </p>
        </div>
      </div>

      {/* Brick wall with sticky notes */}
      <div
        className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-32 sm:px-8"
        style={{ minHeight: "900px" }}
      >
        {CONFESSIONS.map((c) => {
          const col = COLOR_MAP[c.color];
          return (
            <motion.button
              key={c.id}
              onClick={() => setOpen(c)}
              data-hover="READ"
              aria-label={`Read confession #${c.id}`}
              initial={false}
              whileHover={{ scale: 1.08, rotate: c.rot * 0.5, zIndex: 30 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 20 }}
              className="sticky-note group absolute block w-[150px] cursor-pointer p-3 text-left sm:w-[200px]"
              style={{
                top: `${c.top}%`,
                left: `${c.left}%`,
                backgroundColor: col.bg,
                color: col.text,
                boxShadow: `6px 6px 0 rgba(11,12,16,0.45), 0 2px 4px rgba(11,12,16,0.3)`,
                transform: `rotate(${c.rot}deg)`,
              }}
            >
              {/* Tape strip at top */}
              <span
                aria-hidden
                className="absolute -top-2 left-1/2 h-5 w-12 -translate-x-1/2 rotate-1 rounded-sm"
                style={{
                  backgroundColor: col.tape,
                  boxShadow: "0 1px 2px rgba(11,12,16,0.2)",
                }}
              />

              {/* Top-right fold corner */}
              <span
                aria-hidden
                className="absolute right-0 top-0 h-0 w-0"
                style={{
                  borderTop: `12px solid ${col.edge}`,
                  borderRight: "12px solid transparent",
                }}
              />

              {/* Confession text (truncated on the wall, full in modal) */}
              <p className="line-clamp-5 font-hand text-base font-bold leading-snug sm:line-clamp-6 sm:text-lg">
                {c.text}
              </p>

              {/* Footer */}
              <div className="mt-2 flex items-center justify-between border-t border-current/20 pt-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">
                  — {c.author}
                </span>
                <span className="text-[10px] font-bold uppercase opacity-50">
                  #{c.id}
                </span>
              </div>

              {/* Hover hint */}
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-2 rounded border border-current bg-current/0 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest opacity-0 transition-opacity duration-200 group-hover:opacity-80"
              >
                tap to enlarge
              </span>
            </motion.button>
          );
        })}

        {/* Empty-space footnote pinned to bottom of wall */}
        <div className="cw-reveal pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
          <p className="font-hand text-lg font-bold text-cream/70 drop-shadow-[2px_2px_0_rgba(11,12,16,0.5)]">
            ↳ 10 confessions. zero judgment. tap to enlarge any note.
          </p>
        </div>
      </div>

      {/* Back-home CTA */}
      <div className="cw-reveal relative z-10 flex justify-center pb-20">
        <a
          href="#top"
          data-hover="BACK!"
          className="inline-flex items-center gap-2 rounded-xl border-2 border-cream bg-jet px-6 py-3 font-display text-sm font-bold uppercase tracking-tight text-cream shadow-[4px_4px_0_#fcf7f8] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#fcf7f8]"
        >
          <span>←</span> Back to home
        </a>
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
              }}
            >
              {/* Tape strip */}
              <span
                aria-hidden
                className="absolute -top-3 left-1/2 h-7 w-20 -translate-x-1/2 rotate-1 rounded-sm"
                style={{
                  backgroundColor: COLOR_MAP[open.color].tape,
                  boxShadow: "0 1px 2px rgba(11,12,16,0.2)",
                }}
              />

              {/* Close button */}
              <button
                onClick={() => setOpen(null)}
                data-hover="CLOSE"
                aria-label="Close"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg border-2 border-current bg-current/0 text-lg font-bold transition-transform hover:rotate-90"
              >
                ✕
              </button>

              {/* Top-right fold corner */}
              <span
                aria-hidden
                className="absolute right-0 top-0 h-0 w-0"
                style={{
                  borderTop: `18px solid ${COLOR_MAP[open.color].edge}`,
                  borderRight: "18px solid transparent",
                }}
              />

              {/* Full confession text */}
              <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest opacity-60">
                <span>confession #{open.id}</span>
                <span>·</span>
                <span>{open.color}</span>
              </div>

              <p className="font-hand text-2xl font-bold leading-tight sm:text-3xl">
                {open.text}
              </p>

              <div className="mt-6 flex items-center justify-between border-t-2 border-current/20 pt-4">
                <span className="font-display text-sm font-extrabold uppercase tracking-wide">
                  — {open.author}
                </span>
                <span className="font-hand text-base font-bold opacity-60">
                  stay anonymous · stay honest
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
