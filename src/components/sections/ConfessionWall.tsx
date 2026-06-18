import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BRICK_BG } from "@/assets/brickBg";

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   TYPES
   ============================================================ */

type Color = "yellow" | "pink" | "blue" | "green" | "orange" | "purple";
type Aging = "fresh" | "faded" | "torn" | "crumpled" | "old";

type Note = {
  id: number;
  text: string;
  author: string;
  color: Color;
  aging: Aging;
  top: number; // % within wall area
  left: number;
  rot: number; // deg
  w: number; // px width (varies for realism)
};

type Wall = {
  id: number;
  theme: string;
  subtitle: string;
  notes: Note[];
};

/* ============================================================
   STICKY NOTE COLORS (Post-it palette)
   ============================================================ */

const COLOR_MAP: Record<
  Color,
  { bg: string; edge: string; tape: string; text: string }
> = {
  yellow: { bg: "#fff3a3", edge: "#e6d97a", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  pink:   { bg: "#ffc6d4", edge: "#e597a9", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  blue:   { bg: "#c9e8f5", edge: "#9bc8de", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  green:  { bg: "#d4f0c4", edge: "#a3cd8e", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  orange: { bg: "#ffe0c2", edge: "#e0b88e", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  purple: { bg: "#ddd0f0", edge: "#b3a3d8", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
};

/* ============================================================
   75 CONFESSIONS — 5 walls × 15 notes, themed per wall
   ============================================================ */

const WALL_THEMES = [
  {
    theme: "Workplace Confessions",
    subtitle: "offices are just sad adult playgrounds",
    confessions: [
      "I've been pretending to understand my job for 3 years. Nobody has noticed. The fear is constant.",
      "Reply 'sounds good!' to emails that absolutely do not sound good.",
      "My manager: 'Just a quick call.' It has been 2 hours.",
      "I told everyone I'm 'into meditation' because I sat still once in 2019.",
      "I check my phone for notifications, find none, then check again 30 seconds later. Just in case.",
      "I've been wearing the same hoodie to work for 4 days. It's becoming part of my identity.",
      "Per my last email, I am on the verge. Sincerely.",
      "I replied 'no worries!' to an email that contained many worries. I am the worries now.",
      "I've been on 'idle' on Slack for 6 months. Nobody has checked.",
      "Had a meeting that could've been an email. The email could've been a thought.",
      "I don't know what 'circle back' means. I've been nodding for years.",
      "Told boss I'm 'heads down'. Was actually just staring at a wall.",
      "Wrote 'per my last email' and immediately felt powerful. Then scared. Then hungry.",
      "I am the group project now.",
      "Inbox zero achieved. By closing the tab. Bold move. Consequences pending.",
    ],
  },
  {
    theme: "Existential Confessions",
    subtitle: "we're all just vibes in trench coats",
    confessions: [
      "Every Sunday I plan to be a morning person. Every Monday I betray that person.",
      "I have a recurring nightmare about missing a flight I never booked. I'm 34.",
      "I rehearse phone calls out loud before making them. Even the ones to my mom.",
      "I told my therapist I was 'fine' and she laughed. She actually laughed.",
      "Achieved inner peace. Misplaced it 11 seconds later. Suspect the cat took it.",
      "Wikipedia rabbit hole: 'list of pasta shapes'. It is 4 AM.",
      "Time is a flat circle. So is my to-do list.",
      "I am the calmest person in the room. The room is empty.",
      "Was going to journal my feelings. Forgot what they were.",
      "Manifesting a nap. The universe has not responded.",
      "Currently spiraling. Will update. Or won't. Either way.",
      "Did shadow work. Shadow won.",
      "I am a runtime error in a trench coat pretending to be a person.",
      "Tried to hug my stress goodbye. It hugged back. Now we own a dog together.",
      "Asked the universe for a sign. It sent a low-battery notification.",
    ],
  },
  {
    theme: "Domestic Confessions",
    subtitle: "the kitchen is judging you",
    confessions: [
      "I told my houseplant I'd water it tomorrow. It is now day 9 of 'tomorrow'. We don't make eye contact.",
      "The dishes have been 'soaking' for 6 days. They are clean now. Spiritually.",
      "My fridge contains: half a lime, regret, and three condiments I'm afraid to open.",
      "I've been sleeping on the couch because the bed is too far.",
      "Reorganized my entire apartment to avoid one email. Apartment looks great. Email unread.",
      "Found a Tupperware in the back of the fridge. It pre-dates my lease.",
      "Bought a planner. Used it once. It is now a coaster.",
      "The laundry basket is now a chair. The chair is now a laundry basket.",
      "I have 14 half-finished journals. Each one starts with 'this time will be different.'",
      "Made the bed. Feels fake. Going to unmake it to feel real again.",
      "Cooked a real meal. Ate it over the sink. The cycle continues.",
      "The dishwasher is my enemy. We have an understanding.",
      "Tried to fix a squeaky door. Now it doesn't close. We accept this.",
      "My sock drawer is the dark forest. Things go in. They don't come out.",
      "There's a pile of mail from 2023. It's a feature now.",
    ],
  },
  {
    theme: "Social Confessions",
    subtitle: "we're all just ghosts with group chats",
    confessions: [
      "I have 3,000 unread messages. I'm not even slightly curious.",
      "Pretended to know who someone was. We've met 7 times.",
      "I left a voice note. Heard it back. Deleted it. We will never speak of this.",
      "Currently ignoring a text from someone I love very much. It's been 4 days.",
      "I make plans I have no intention of attending. The plans know.",
      "Told a friend 'let's catch up soon!' It's been 8 months. Soon is fluid.",
      "I have a group chat I never open. It's been active since 2021. I respect its autonomy.",
      "Wrote a long heartfelt message. Sent 'k' instead. The truth is 'k'.",
      "I am the friend who says 'omg we should hang!' and then disappears.",
      "Replied 'haha yeah' to a serious message. We are no longer friends.",
      "Waved at someone who wasn't waving at me. Kept walking. They kept walking. We never spoke.",
      "I have 47 contacts named 'Dave ??'. None of them are the right Dave.",
      "Made eye contact with a stranger. We are now married in 3 alternate realities.",
      "Said 'you too!' when the waiter said 'enjoy your meal'. As one does.",
      "I will leave this party in 11 minutes. The countdown has begun.",
    ],
  },
  {
    theme: "Midnight Confessions",
    subtitle: "the thoughts come at 2:47 AM",
    confessions: [
      "It is 2:47 AM. I am googling 'do penguins have knees'. They do. I am at peace.",
      "Currently ranking every pasta shape. Conchiglie is winning. Penne is a fraud.",
      "I think about that one embarrassing thing I did in 2014 every night before bed.",
      "Watched the wifi symbol spin for 4 minutes. Felt seen.",
      "Currently in a Wikipedia rabbit hole about the fall of the Byzantine Empire. Send help.",
      "Opened the fridge at 3 AM. Closed it. Opened it again. Nothing has changed.",
      "I count ceiling tiles when I can't sleep. There are 64. There were 63 last night.",
      "Tried to remember my password. Tried 7 variations. Gave up. New password is 'password1'.",
      "I just remembered I have to do something tomorrow. I don't know what. But I have to.",
      "Currently having a deep conversation with my cat. She has good takes.",
      "Stared at my phone for 20 minutes. Did nothing. Felt productive.",
      "I think I left the stove on. I didn't. But I think I did.",
      "Currently replaying a conversation from 2019 in my head. Adding better comebacks.",
      "Contemplating the universe. The universe is contemplating me back. We're tied.",
      "I am the only person awake in this building. The building knows.",
    ],
  },
];

/* ============================================================
   HELPERS — deterministically pseudo-random per note id
   ============================================================ */

// Mulberry32 — small deterministic PRNG
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLORS: Color[] = ["yellow", "pink", "blue", "green", "orange", "purple"];
const AUTHORS = [
  "anon", "exposed", "doom-scroller", "corporate-me", "voicemail-phobic",
  "5am liar", "hoodler", "zen fraud", "aiport ghost", "stationery goblin",
  "midnight-me", "the friend who disappears", "k. just k.", "deep sigh", "tired™",
  "ghost of group chat past", "passenger of life", "deadline dodger",
];

function buildWalls(): Wall[] {
  return WALL_THEMES.map((t, wallIdx) => {
    const rand = rng((wallIdx + 1) * 1337 + 7);
    const notes: Note[] = t.confessions.map((text, i) => {
      const id = wallIdx * 100 + i + 1;
      // Distribute notes on a loose 5-col x 3-row grid with strong jitter
      // for a "scattered randomly" look rather than a perfect grid.
      const col = i % 5;
      const row = Math.floor(i / 5);
      const jitterX = (rand() - 0.5) * 12; // ±6%
      const jitterY = (rand() - 0.5) * 10; // ±5%
      const left = 3 + col * 18.5 + jitterX;
      const top = 10 + row * 27 + jitterY;
      const rot = (rand() - 0.5) * 18; // ±9°
      // Weighted aging: 25% fresh, then ~19% each for the others — so
      // most notes look aged/weathered, matching the "some torn, some old" brief.
      const agingRoll = rand();
      const aging: Aging =
        agingRoll < 0.25 ? "fresh" :
        agingRoll < 0.44 ? "faded" :
        agingRoll < 0.63 ? "torn" :
        agingRoll < 0.82 ? "crumpled" : "old";
      return {
        id,
        text,
        author: AUTHORS[Math.floor(rand() * AUTHORS.length)],
        color: COLORS[Math.floor(rand() * COLORS.length)],
        aging,
        top,
        left,
        rot,
        w: 150 + Math.floor(rand() * 60), // 150–210px
      };
    });
    return {
      id: wallIdx + 1,
      theme: t.theme,
      subtitle: t.subtitle,
      notes,
    };
  });
}

/* ============================================================
   BRICK WALL BACKGROUND — authentic weathered red brick
   Matches reference: running bond, #c24b3e dominant, #d05a3f
   burnt orange, #6b2c1e dark, #e8b8b0 faded, #e8d9c0 mortar,
   with random soot stains and color variation per brick.
   ============================================================ */

// BRICK_BG is imported from @/assets/brickBg (auto-generated by
// scripts/gen_brick_bg.py as a base64-encoded SVG data URL — more
// reliable than the inline ;utf8, form across browsers).

/* ============================================================
   AGING EFFECTS — applied per sticky note
   ============================================================ */

function agingStyle(aging: Aging): {
  filter?: string;
  clipPath?: string;
  opacity?: number;
  extraShadow?: string;
  overlay?: string; // a CSS background for crumpled folds / yellowing
} {
  switch (aging) {
    case "faded":
      // Sun-bleached — heavily desaturated + washed out
      return {
        filter: "saturate(0.2) brightness(1.18) contrast(0.85)",
        opacity: 0.75,
        extraShadow: "5px 7px 0 rgba(11,12,16,0.4)",
        overlay:
          "radial-gradient(ellipse at center, rgba(255,255,255,0.18) 0%, transparent 70%)",
      };
    case "torn":
      // Torn — LARGE jagged chunks missing from top-right and bottom-left
      return {
        clipPath:
          "polygon(0 6%, 55% 0, 62% 8%, 72% 2%, 82% 10%, 92% 4%, 100% 12%, 100% 88%, 78% 96%, 68% 100%, 58% 92%, 42% 100%, 32% 90%, 18% 96%, 8% 88%, 0 94%)",
        extraShadow: "5px 7px 0 rgba(11,12,16,0.4)",
      };
    case "crumpled":
      // Crumpled — heavy folds + desaturation + THICK visible crease lines
      return {
        filter: "contrast(1.3) saturate(0.6) brightness(0.88)",
        extraShadow:
          "6px 6px 0 rgba(11,12,16,0.45), inset 8px 8px 14px rgba(11,12,16,0.35), inset -6px -6px 12px rgba(255,255,255,0.35)",
        overlay:
          "repeating-linear-gradient(125deg, rgba(11,12,16,0.22) 0px, rgba(11,12,16,0.22) 3px, transparent 3px, transparent 14px), repeating-linear-gradient(55deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 3px, transparent 3px, transparent 18px), radial-gradient(ellipse at 30% 40%, rgba(11,12,16,0.2) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(11,12,16,0.18) 0%, transparent 45%)",
      };
    case "old":
      // Old/yellowed — strong sepia + dark edge vignette + brown spots
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

/* ============================================================
   COMPONENT
   ============================================================ */

const WALLS = buildWalls();

export default function ConfessionWall() {
  const root = useRef<HTMLDivElement>(null);
  const [wallIdx, setWallIdx] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [open, setOpen] = useState<Note | null>(null);
  const [dragHint, setDragHint] = useState(true);

  const wall = WALLS[wallIdx];

  /* GSAP reveal of header on first mount */
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
    }, root);
    return () => ctx.revert();
  }, []);

  /* GSAP sticky-note reveal whenever wall changes.
   * Animates a wrapper class (.sticky-wrap) so the inner .sticky-note
   * keeps its own inline opacity/filter/clipPath from agingStyle. */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".sticky-wrap",
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
  }, [wallIdx]);

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

  /* Right-arrow & 'd' key advance to next wall */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      if (e.key === "ArrowRight" || e.key === "d") goNext();
      if (e.key === "ArrowLeft" || e.key === "a") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, wallIdx]);

  const goNext = () => {
    setDirection(1);
    setWallIdx((i) => (i + 1) % WALLS.length);
    setDragHint(false);
  };
  const goPrev = () => {
    setDirection(-1);
    setWallIdx((i) => (i - 1 + WALLS.length) % WALLS.length);
    setDragHint(false);
  };

  /* Swipe handler — Tinder-style right swipe advances */
  const onDragEnd = (_e: unknown, info: PanInfo) => {
    const threshold = 80;
    if (info.offset.x > threshold && Math.abs(info.offset.y) < 120) {
      goNext();
    } else if (info.offset.x < -threshold && Math.abs(info.offset.y) < 120) {
      goPrev();
    }
  };

  return (
    <section
      id="wall"
      ref={root}
      className="relative h-screen w-full overflow-hidden"
      style={{
        backgroundColor: "#8b3a2b",
        backgroundImage: BRICK_BG,
        backgroundSize: "248px 158px",
        backgroundRepeat: "repeat",
      }}
    >
      {/* Subtle vignette for drama + readability */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(11,12,16,0) 40%, rgba(11,12,16,0.55) 100%)",
        }}
      />

      {/* Header — compact, fixed at top of viewport */}
      <header className="cw-reveal absolute left-0 right-0 top-0 z-30 px-4 pt-6 text-center sm:pt-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-center gap-3">
            <span className="inline-block rotate-[-2deg] rounded-full border-2 border-cream bg-pink px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-widest text-cream shadow-[3px_3px_0_#0b0c10] sm:text-xs">
              📌 wall {wallIdx + 1} / {WALLS.length}
            </span>
            <span className="font-hand text-base font-bold text-toxic drop-shadow-[2px_2px_0_rgba(11,12,16,0.6)] sm:text-xl">
              swipe right →
            </span>
          </div>
          <h2 className="mt-2 font-display text-3xl font-extrabold uppercase leading-[0.9] tracking-tight text-cream drop-shadow-[3px_3px_0_rgba(11,12,16,0.6)] sm:text-5xl">
            {wall.theme}
          </h2>
          <p className="mt-1 font-hand text-base font-bold text-cream/80 drop-shadow-[1px_1px_0_rgba(11,12,16,0.7)] sm:text-lg">
            ↳ {wall.subtitle}
          </p>
        </div>
      </header>

      {/* Swipe-able wall area (fits the screen) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragEnd={onDragEnd}
        className="absolute inset-0 z-10"
        style={{ cursor: "grab" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={wallIdx}
            initial={{ opacity: 0, x: direction * 80, rotate: direction * 1.5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: direction * -80, rotate: direction * -1.5 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="relative h-full w-full"
          >
            {/* 15 sticky notes scattered on this wall */}
            {wall.notes.map((n) => {
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
                opacity: ag.opacity,
                clipPath: ag.clipPath,
              };
              return (
                <div
                  key={n.id}
                  className="sticky-wrap absolute"
                  style={{ top: style.top, left: style.left, width: style.width }}
                >
                  <motion.button
                    onClick={() => setOpen(n)}
                    data-hover="READ"
                    aria-label={`Open confession #${n.id}`}
                    initial={false}
                    whileHover={{ scale: 1.1, rotate: n.rot * 0.4, zIndex: 50 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 320, damping: 20 }}
                    className="sticky-note group relative block w-full cursor-pointer p-3 text-left"
                    style={{
                      ...style,
                      top: undefined,
                      left: undefined,
                      // keep width 100% so the wrapper controls sizing
                      width: "100%",
                    }}
                  >
                    {/* Aging overlay (crumpled folds / yellowing vignette) */}
                    {ag.overlay && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{ background: ag.overlay }}
                      />
                    )}
                    {/* Tape strip */}
                    <span
                      aria-hidden
                      className="absolute -top-2 left-1/2 h-5 w-12 -translate-x-1/2 rotate-1 rounded-sm"
                      style={{
                        backgroundColor: col.tape,
                        boxShadow: "0 1px 2px rgba(11,12,16,0.2)",
                      }}
                    />
                    {/* Top-right fold corner (only on non-torn) */}
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

                    {/* Truncated confession text */}
                    <p className="relative line-clamp-5 font-hand text-sm font-bold leading-snug sm:text-base">
                      {n.text}
                    </p>

                    {/* Footer */}
                    <div className="relative mt-2 flex items-center justify-between border-t border-current/20 pt-1">
                      <span className="truncate text-[9px] font-bold uppercase tracking-wide opacity-60">
                        — {n.author}
                      </span>
                      <span className="ml-1 shrink-0 text-[9px] font-bold uppercase opacity-50">
                        #{n.id}
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
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Drag hint (first interaction) */}
      <AnimatePresence>
        {dragHint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="cw-reveal pointer-events-none absolute bottom-32 left-1/2 z-20 -translate-x-1/2 rounded-full border-2 border-cream bg-jet px-4 py-2 font-display text-xs font-bold uppercase tracking-widest text-toxic shadow-[3px_3px_0_#fcf7f8] sm:text-sm"
          >
            ← swipe right for next wall →
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom-right nav: prev / next + counter */}
      <div className="cw-reveal absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">
        <button
          onClick={goPrev}
          data-hover="PREV"
          aria-label="Previous wall"
          className="grid h-11 w-11 place-items-center rounded-xl border-2 border-cream bg-jet text-cream shadow-[3px_3px_0_#fcf7f8] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#fcf7f8] active:translate-y-0"
        >
          ←
        </button>

        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {WALLS.map((w, i) => (
            <button
              key={w.id}
              onClick={() => {
                setDirection(i > wallIdx ? 1 : -1);
                setWallIdx(i);
                setDragHint(false);
              }}
              aria-label={`Go to wall ${i + 1}`}
              data-hover={w.theme.split(" ")[0].toUpperCase()}
              className="h-2.5 w-2.5 rounded-full border-2 border-cream transition-all duration-200"
              style={{
                backgroundColor: i === wallIdx ? "var(--color-toxic)" : "transparent",
                transform: i === wallIdx ? "scale(1.4)" : "scale(1)",
              }}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          data-hover="NEXT"
          aria-label="Next wall"
          className="grid h-11 w-11 place-items-center rounded-xl border-2 border-cream bg-jet text-cream shadow-[3px_3px_0_#fcf7f8] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#fcf7f8] active:translate-y-0"
        >
          →
        </button>
      </div>

      {/* Back-home CTA — top-left */}
      <a
        href="#top"
        data-hover="BACK!"
        className="cw-reveal absolute left-4 top-6 z-30 inline-flex items-center gap-1.5 rounded-xl border-2 border-cream bg-jet px-3 py-2 font-display text-xs font-bold uppercase tracking-tight text-cream shadow-[3px_3px_0_#fcf7f8] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#fcf7f8]"
      >
        ← home
      </a>

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

              {/* Fold corner (skip on torn) */}
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

              {/* Meta */}
              <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest opacity-60">
                <span>confession #{open.id}</span>
                <span>·</span>
                <span>{open.color}</span>
                {open.aging !== "fresh" && (
                  <>
                    <span>·</span>
                    <span>{open.aging}</span>
                  </>
                )}
              </div>

              {/* Full confession */}
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
