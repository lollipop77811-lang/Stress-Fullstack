import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Stamp from "@/components/ui/Stamp";

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   33 CHAOTIC HOROSCOPE PREDICTIONS
   One per day, deterministic by date so the same person sees the
   same horoscope all day. Refreshes at midnight (local time).
   ============================================================ */

const HOROSCOPES: { prediction: string; mood: string; emoji: string }[] = [
  { prediction: "Today Mercury is in retrograde and so is your motivation. Snacks will help. Probably.", mood: "cosmic", emoji: "🪐" },
  { prediction: "The universe has noticed you've been trying. It is unimpressed but mildly amused.", mood: "judged", emoji: "🌌" },
  { prediction: "A surprise email will ruin your afternoon. It's from yourself. Past you is a menace.", mood: "doomed", emoji: "📧" },
  { prediction: "Today you will achieve inner peace for approximately 4 seconds. Savor them.", mood: "zen", emoji: "🧘" },
  { prediction: "The stars suggest you should have stayed in bed. The stars are correct.", mood: "tired", emoji: "🛌" },
  { prediction: "Someone is thinking about you right now. It's not in a good way. Watch your back.", mood: "paranoid", emoji: "👀" },
  { prediction: "Your patience will be tested today. By you. You are your own antagonist.", mood: "self-sabotage", emoji: "🪞" },
  { prediction: "Today's lucky snack: whatever's closest. The universe rewards proximity, not effort.", mood: "snacky", emoji: "🍪" },
  { prediction: "A conversation you've been avoiding will find you. It has legs. It's fast. Run.", mood: "avoidant", emoji: "🏃" },
  { prediction: "The void is staring back. It's bored. Bring it a coffee or something.", mood: "existential", emoji: "🌑" },
  { prediction: "Today you will remember something embarrassing from 2017. There is no escape.", mood: "haunted", emoji: "👻" },
  { prediction: "Your to-do list is sentient and it's plotting revenge. Sleep with one eye open.", mood: "hunted", emoji: "📋" },
  { prediction: "The cosmos recommends lying down. Not in a productive way. Just lying down.", mood: "horizontal", emoji: "🛏️" },
  { prediction: "Someone will say 'no worries' and mean the opposite. Trust nothing.", mood: "suspicious", emoji: "🎭" },
  { prediction: "Today's vibe: aggressively beige. Embrace it. Resistance is futile.", mood: "beige", emoji: "🟫" },
  { prediction: "Your future self is face-palming. Try to give them less to face-palm about.", mood: "regretful", emoji: "🤦" },
  { prediction: "The universe is giving you a sign. It's a low-battery notification. Charge your phone.", mood: "low-battery", emoji: "🔋" },
  { prediction: "Today you will almost cry in public. Almost. You're a warrior. A damp warrior.", mood: "damp", emoji: "💧" },
  { prediction: "Mercury isn't in retrograde but your dopamine is. Treat yourself to a small chaos.", mood: "understimulated", emoji: "🎢" },
  { prediction: "The stars have decided you need a nap. Argue with them. See who wins. (They will.)", mood: "sleepy", emoji: "😴" },
  { prediction: "Someone will ask 'how are you?' and you'll say 'good!' and it'll be a lie. As always.", mood: "performative", emoji: "🙃" },
  { prediction: "Today's lucky number is whatever you want it to be. The universe stopped counting.", mood: "apathetic", emoji: "🔢" },
  { prediction: "A decision you've been putting off will put itself off further. Convenient.", mood: "procrastinating", emoji: "⏰" },
  { prediction: "The cosmos suggests 'per my last email' energy. Use it sparingly. It's potent.", mood: "corporate", emoji: "💼" },
  { prediction: "Today you will almost do the thing. Almost. Close enough. The void accepts almost.", mood: "almost", emoji: "🤏" },
  { prediction: "Your houseplant is judging you. Water it. Or don't. It's already disappointed.", mood: "judged-by-plant", emoji: "🪴" },
  { prediction: "The universe has scheduled a breakdown for 3:47 PM. Clear your calendar.", mood: "scheduled", emoji: "📆" },
  { prediction: "Today's alignment suggests petting a dog. Any dog. The cosmos are dog people.", mood: "canine", emoji: "🐕" },
  { prediction: "You will receive a compliment today. You will not know how to accept it. As always.", mood: "awkward", emoji: "😅" },
  { prediction: "The stars recommend leaving on read. Whoever it is. They'll understand. Eventually.", mood: "evading", emoji: "📩" },
  { prediction: "Today's forecast: 90% chance of pretending to be fine, 10% chance of snacks.", mood: "pretending", emoji: "🌤️" },
  { prediction: "Your aura is the color of 'I'll do it tomorrow.' It's a valid aura. Own it.", mood: "deferred", emoji: "🌈" },
  { prediction: "The universe is rooting for you. Quietly. From a distance. With snacks.", mood: "supported", emoji: "✨" },
];

/* ============================================================
   DETERMINISTIC DATE-BASED SELECTION
   Hash the date string → pick a horoscope index.
   Same date = same horoscope for everyone, all day.
   ============================================================ */

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function getTodayHoroscope() {
  const today = getTodayString();
  const idx = hashString(today) % HOROSCOPES.length;
  return { ...HOROSCOPES[idx], idx, date: today };
}

/* ============================================================
   MOOD-BASED COLOR PALETTE
   Each mood maps to a brutalist color combo for the card.
   ============================================================ */

const MOOD_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  cosmic: { bg: "#4361ee", accent: "#ccff00", text: "#fcf7f8" },
  judged: { bg: "#0b0c10", accent: "#f72585", text: "#fcf7f8" },
  doomed: { bg: "#1b1c22", accent: "#ccff00", text: "#fcf7f8" },
  zen: { bg: "#d4f0c4", accent: "#0b0c10", text: "#1b1c22" },
  tired: { bg: "#ddd0f0", accent: "#0b0c10", text: "#1b1c22" },
  paranoid: { bg: "#0b0c10", accent: "#ccff00", text: "#fcf7f8" },
  "self-sabotage": { bg: "#ffc6d4", accent: "#0b0c10", text: "#1b1c22" },
  snacky: { bg: "#fff3a3", accent: "#0b0c10", text: "#1b1c22" },
  avoidant: { bg: "#c9e8f5", accent: "#0b0c10", text: "#1b1c22" },
  existential: { bg: "#0b0c10", accent: "#4361ee", text: "#fcf7f8" },
  haunted: { bg: "#1b1c22", accent: "#f72585", text: "#fcf7f8" },
  hunted: { bg: "#ffe0c2", accent: "#0b0c10", text: "#1b1c22" },
  horizontal: { bg: "#ddd0f0", accent: "#f72585", text: "#1b1c22" },
  suspicious: { bg: "#0b0c10", accent: "#ccff00", text: "#fcf7f8" },
  beige: { bg: "#f4edee", accent: "#1b1c22", text: "#1b1c22" },
  regretful: { bg: "#ffc6d4", accent: "#0b0c10", text: "#1b1c22" },
  "low-battery": { bg: "#1b1c22", accent: "#ccff00", text: "#fcf7f8" },
  damp: { bg: "#c9e8f5", accent: "#4361ee", text: "#1b1c22" },
  understimulated: { bg: "#f72585", accent: "#ccff00", text: "#fcf7f8" },
  sleepy: { bg: "#ddd0f0", accent: "#4361ee", text: "#1b1c22" },
  performative: { bg: "#fff3a3", accent: "#f72585", text: "#1b1c22" },
  apathetic: { bg: "#0b0c10", accent: "#888", text: "#fcf7f8" },
  procrastinating: { bg: "#ffe0c2", accent: "#f72585", text: "#1b1c22" },
  corporate: { bg: "#1b1c22", accent: "#ccff00", text: "#fcf7f8" },
  almost: { bg: "#d4f0c4", accent: "#f72585", text: "#1b1c22" },
  "judged-by-plant": { bg: "#d4f0c4", accent: "#0b0c10", text: "#1b1c22" },
  scheduled: { bg: "#0b0c10", accent: "#f72585", text: "#fcf7f8" },
  canine: { bg: "#ffe0c2", accent: "#4361ee", text: "#1b1c22" },
  awkward: { bg: "#ffc6d4", accent: "#0b0c10", text: "#1b1c22" },
  evading: { bg: "#1b1c22", accent: "#ccff00", text: "#fcf7f8" },
  pretending: { bg: "#c9e8f5", accent: "#f72585", text: "#1b1c22" },
  deferred: { bg: "#ddd0f0", accent: "#4361ee", text: "#1b1c22" },
  supported: { bg: "#fff3a3", accent: "#f72585", text: "#1b1c22" },
};

/* ============================================================
   COMPONENT
   ============================================================ */

export default function DailyStressHoroscope() {
  const root = useRef<HTMLDivElement>(null);
  const [horoscope] = useState(getTodayHoroscope);
  const palette = MOOD_COLORS[horoscope.mood] ?? MOOD_COLORS.cosmic;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hs-reveal",
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

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section
      id="horoscope"
      ref={root}
      className="relative min-h-screen overflow-hidden px-4 py-20 sm:px-6 sm:py-28"
      style={{ backgroundColor: "var(--color-cream)" }}
    >
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-20 top-10 hidden select-none font-display text-[26vw] font-extrabold leading-none text-jet/[0.04] lg:block">
          STARS
        </div>
        <div className="absolute left-6 top-1/3 h-72 w-72 rounded-full bg-electric/20 blur-3xl" />
        <div className="absolute right-10 bottom-10 h-72 w-72 rounded-full bg-pink/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="hs-reveal mb-12 text-center">
          <span className="inline-block rotate-[-3deg] font-hand text-2xl font-bold text-pink sm:text-3xl">
            ↳ the cosmos have notes
          </span>
          <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.3em] text-electric">
            🔮 Daily Horoscope
          </p>
          <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-7xl">
            Stress
            <br />
            <span className="text-stroke-thick">Horoscope</span>
          </h1>
          <p className="mt-4 font-hand text-xl font-bold text-ink/70 sm:text-2xl">
            {today}
          </p>
        </div>

        {/* The horoscope card */}
        <div className="hs-reveal relative" style={{ perspective: "1000px" }}>
          <motion.div
            initial={{ rotate: -2 }}
            whileHover={{ rotate: 0, y: -4 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="relative overflow-hidden rounded-[2rem] border-[3px] border-jet p-8 shadow-brutal-xl sm:p-12"
            style={{
              backgroundColor: palette.bg,
              color: palette.text,
              boxShadow: "12px 12px 0 #0b0c10",
            }}
          >
            {/* Decorative top bar */}
            <div
              className="absolute left-0 right-0 top-0 h-2"
              style={{ backgroundColor: palette.accent }}
            />

            {/* Top-right fold corner */}
            <span
              aria-hidden
              className="absolute right-0 top-0 h-0 w-0"
              style={{
                borderTop: `18px solid ${palette.accent}`,
                borderRight: "18px solid transparent",
              }}
            />

            {/* Big emoji */}
            <motion.div
              initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.2 }}
              className="mb-4 text-7xl sm:text-8xl"
              style={{ filter: "drop-shadow(4px 4px 0 rgba(11,12,16,0.25))" }}
            >
              {horoscope.emoji}
            </motion.div>

            {/* Mood badge */}
            <span
              className="inline-block rotate-[-2deg] rounded-full border-2 border-jet px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-widest shadow-[3px_3px_0_#0b0c10] sm:text-xs"
              style={{ backgroundColor: palette.accent, color: "#0b0c10" }}
            >
              mood: {horoscope.mood}
            </span>

            {/* The prediction */}
            <p className="mt-6 font-hand text-3xl font-bold leading-tight sm:text-4xl">
              "{horoscope.prediction}"
            </p>

            {/* Footer */}
            <div className="mt-8 flex items-center justify-between border-t-2 border-current/20 pt-4">
              <span className="font-display text-xs font-extrabold uppercase tracking-widest opacity-60">
                — the cosmos (probably)
              </span>
              <span className="font-hand text-base font-bold opacity-60">
                prediction #{horoscope.idx + 1} of {HOROSCOPES.length}
              </span>
            </div>
          </motion.div>

          {/* Floating stamp */}
          <Stamp
            text="· COSMIC · UNRELIABLE · DAILY ·"
            center="🔮"
            color="toxic"
            className="absolute -bottom-6 -right-4 hidden h-24 w-24 sm:block"
          />
        </div>

        {/* Refresh note */}
        <p className="hs-reveal mt-10 text-center font-hand text-lg font-bold text-ink/60">
          ↳ comes back tomorrow with a new prediction. the stars wait for no one. (they actually do. they're just slow.)
        </p>

        {/* Back-home CTA */}
        <div className="hs-reveal mt-10 flex justify-center gap-3">
          <a
            href="#top"
            data-hover="BACK!"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-jet bg-jet px-6 py-3 font-display text-sm font-bold uppercase tracking-tight text-cream shadow-brutal transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-brutal-lg"
          >
            <span>←</span> home
          </a>
          <a
            href="#/wall"
            data-hover="WALL!"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-jet bg-pink px-6 py-3 font-display text-sm font-bold uppercase tracking-tight text-cream shadow-brutal transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-brutal-lg"
          >
            confess on the wall →
          </a>
        </div>
      </div>
    </section>
  );
}
