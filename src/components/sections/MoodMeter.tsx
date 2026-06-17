import { useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Mood = {
  id: string;
  emoji: string;
  label: string;
  blurb: string;
  rx: string;
  bg: string;
  card: string;
  accent: string;
  text: string;
  cursor: string;
};

const MOODS: Mood[] = [
  {
    id: "stressed",
    emoji: "🥵",
    label: "Stressed",
    blurb: "Blinking has become a luxury.",
    rx: "2 memes + a snack. Do not skip the snack.",
    bg: "bg-pink",
    card: "bg-cream",
    accent: "bg-pink",
    text: "text-jet",
    cursor: "pink",
  },
  {
    id: "meh",
    emoji: "😐",
    label: "Meh",
    blurb: "Vibes: aggressively beige.",
    rx: "One (1) joke. Sip slowly. Reassess.",
    bg: "bg-cream",
    card: "bg-paper",
    accent: "bg-electric",
    text: "text-jet",
    cursor: "cream",
  },
  {
    id: "chill",
    emoji: "😎",
    label: "Chill",
    blurb: "Operating at 12% capacity, on purpose.",
    rx: "Maintain. Maybe scroll the gallery. Hydrate.",
    bg: "bg-toxic",
    card: "bg-cream",
    accent: "bg-jet",
    text: "text-jet",
    cursor: "toxic",
  },
  {
    id: "giggly",
    emoji: "🤭",
    label: "Giggly",
    blurb: "You just remembered something from 2014.",
    rx: "Ride the wave. Tell exactly zero people why.",
    bg: "bg-electric",
    card: "bg-cream",
    accent: "bg-toxic",
    text: "text-cream",
    cursor: "electric",
  },
  {
    id: "lmao",
    emoji: "😂",
    label: "LMAO",
    blurb: "Tears. Snorting. Concern from coworkers.",
    rx: "Share one meme. Send no context. Deny everything.",
    bg: "bg-jet",
    card: "bg-toxic",
    accent: "bg-pink",
    text: "text-cream",
    cursor: "jet",
  },
  {
    id: "unhinged",
    emoji: "🤪",
    label: "Unhinged",
    blurb: "You are now the main character. Sorry.",
    rx: "Touch grass. Then touch more grass. Call your mom.",
    bg: "bg-pink",
    card: "bg-jet",
    accent: "bg-toxic",
    text: "text-cream",
    cursor: "pink",
  },
];

export default function MoodMeter() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Mood>(MOODS[2]); // start "chill"

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".mm-reveal",
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

  const isDark = active.text === "text-cream";
  const subText = isDark ? "text-cream/80" : "text-ink/70";
  const headKicker = isDark ? "text-toxic" : "text-pink";

  return (
    <section
      id="mood"
      ref={root}
      className="relative px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mm-reveal mb-10 max-w-2xl">
          <span className="inline-block rotate-[-3deg] font-hand text-2xl font-bold text-electric sm:text-3xl">
            pick your poison (mood) ↴
          </span>
          <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl">
            The Mood
            <br />
            <span className="text-stroke-thick">Meter</span>
          </h2>
        </div>

        {/* Mood pills */}
        <div className="mm-reveal mb-8 flex flex-wrap gap-2.5">
          {MOODS.map((m) => {
            const on = m.id === active.id;
            return (
              <button
                key={m.id}
                onClick={() => setActive(m)}
                data-hover={m.label.toUpperCase()}
                className={
                  "inline-flex items-center gap-2 rounded-full border-2 border-jet px-4 py-2 font-display text-sm font-bold uppercase tracking-tight transition-[transform,box-shadow] duration-150 sm:text-base " +
                  (on
                    ? "bg-jet text-cream shadow-brutal-sm"
                    : "bg-cream text-jet hover:-translate-y-0.5 hover:shadow-brutal-sm")
                }
              >
                <span className="text-lg">{m.emoji}</span>
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Mood panel */}
        <div className="mm-reveal relative overflow-hidden rounded-[2rem] border-[3px] border-jet shadow-brutal-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={
                "relative grid items-stretch gap-0 md:grid-cols-12 " +
                active.bg +
                " " +
                active.text
              }
            >
              {/* Left: big emoji + label */}
              <div className="relative flex flex-col items-start justify-center p-7 sm:p-12 md:col-span-7">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border-2 border-current px-3 py-1 text-[11px] font-bold uppercase tracking-widest opacity-80">
                    current diagnosis
                  </span>
                  <span className="font-hand text-xl font-bold opacity-80">
                    legit medical info*
                  </span>
                </div>

                <motion.div
                  key={active.emoji}
                  initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 14 }}
                  className="my-4 text-[26vw] leading-none drop-shadow-[6px_6px_0_rgba(11,12,16,0.18)] sm:text-[18vw] md:text-[12rem]"
                >
                  {active.emoji}
                </motion.div>

                <h3 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-6xl">
                  {active.label}
                </h3>
                <p className={"mt-3 font-body text-lg sm:text-xl " + subText}>
                  {active.blurb}
                </p>
              </div>

              {/* Right: prescription card */}
              <div className="flex items-center p-7 sm:p-10 md:col-span-5">
                <div
                  className={
                    "w-full rounded-2xl border-[3px] border-jet p-6 shadow-brutal " +
                    active.card +
                    " " +
                    (active.card === "bg-jet" ? "text-cream" : "text-jet")
                  }
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "grid h-9 w-9 place-items-center rounded-lg border-2 border-current text-lg " +
                        active.accent +
                        " " +
                        (active.accent === "bg-jet"
                          ? "text-cream"
                          : "text-jet")
                      }
                    >
                      💊
                    </span>
                    <span className="font-display text-sm font-extrabold uppercase tracking-widest">
                      official prescription
                    </span>
                  </div>
                  <p className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                    {active.rx}
                  </p>
                  <div
                    className={
                      "mt-5 border-t-2 border-dashed pt-4 text-[11px] font-bold uppercase tracking-wide " +
                      (active.card === "bg-jet"
                        ? "border-cream/30 text-cream/60"
                        : "border-jet/30 text-jet/60")
                    }
                  >
                    *not a doctor. barely a website.
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Tiny disclaimer */}
        <p
          className={
            "mm-reveal mt-4 text-center font-hand text-lg font-bold " +
            headKicker
          }
        >
          ↳ mood swings are a feature, not a bug
        </p>
      </div>
    </section>
  );
}
