import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Stamp from "@/components/ui/Stamp";
import { cn } from "@/utils/cn";

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   12 ZODIAC SIGNS — symbols, date ranges, elements
   ============================================================ */

type Zodiac = {
  name: string;
  symbol: string;
  emoji: string;
  element: "fire" | "earth" | "air" | "water";
  dateRange: string;
  start: [number, number]; // [month, day] — start date (1-indexed month)
  end: [number, number];   // end date
};

const ZODIACS: Zodiac[] = [
  { name: "Aries",       symbol: "♈", emoji: "🐏", element: "fire",  dateRange: "Mar 21 – Apr 19", start: [3, 21], end: [4, 19] },
  { name: "Taurus",      symbol: "♉", emoji: "🐂", element: "earth", dateRange: "Apr 20 – May 20", start: [4, 20], end: [5, 20] },
  { name: "Gemini",      symbol: "♊", emoji: "👯", element: "air",   dateRange: "May 21 – Jun 20", start: [5, 21], end: [6, 20] },
  { name: "Cancer",      symbol: "♋", emoji: "🦀", element: "water", dateRange: "Jun 21 – Jul 22", start: [6, 21], end: [7, 22] },
  { name: "Leo",         symbol: "♌", emoji: "🦁", element: "fire",  dateRange: "Jul 23 – Aug 22", start: [7, 23], end: [8, 22] },
  { name: "Virgo",       symbol: "♍", emoji: "🌾", element: "earth", dateRange: "Aug 23 – Sep 22", start: [8, 23], end: [9, 22] },
  { name: "Libra",       symbol: "♎", emoji: "⚖️", element: "air",   dateRange: "Sep 23 – Oct 22", start: [9, 23], end: [10, 22] },
  { name: "Scorpio",     symbol: "♏", emoji: "🦂", element: "water", dateRange: "Oct 23 – Nov 21", start: [10, 23], end: [11, 21] },
  { name: "Sagittarius", symbol: "♐", emoji: "🏹", element: "fire",  dateRange: "Nov 22 – Dec 21", start: [11, 22], end: [12, 21] },
  { name: "Capricorn",   symbol: "♑", emoji: "🐐", element: "earth", dateRange: "Dec 22 – Jan 19", start: [12, 22], end: [1, 19] },
  { name: "Aquarius",    symbol: "♒", emoji: "🌊", element: "air",   dateRange: "Jan 20 – Feb 18", start: [1, 20], end: [2, 18] },
  { name: "Pisces",      symbol: "♓", emoji: "🐟", element: "water", dateRange: "Feb 19 – Mar 20", start: [2, 19], end: [3, 20] },
];

const ELEMENT_COLORS: Record<
  Zodiac["element"],
  { bg: string; accent: string; text: string }
> = {
  fire:  { bg: "#f72585", accent: "#ccff00", text: "#fcf7f8" },
  earth: { bg: "#d4f0c4", accent: "#0b0c10", text: "#1b1c22" },
  air:   { bg: "#c9e8f5", accent: "#4361ee", text: "#1b1c22" },
  water: { bg: "#4361ee", accent: "#ccff00", text: "#fcf7f8" },
};

/* ============================================================
   60 CHAOTIC PREDICTIONS — pooled, deterministic per (date, sign)
   Each zodiac gets a different prediction each day via hashing
   (date + sign name). 60 predictions × 12 signs = lots of variety.
   ============================================================ */

const PREDICTIONS: string[] = [
  "Today Mercury is in retrograde and so is your motivation. Snacks will help. Probably.",
  "The universe has noticed you've been trying. It is unimpressed but mildly amused.",
  "A surprise email will ruin your afternoon. It's from yourself. Past you is a menace.",
  "Today you will achieve inner peace for approximately 4 seconds. Savor them.",
  "The stars suggest you should have stayed in bed. The stars are correct.",
  "Someone is thinking about you right now. It's not in a good way. Watch your back.",
  "Your patience will be tested today. By you. You are your own antagonist.",
  "Today's lucky snack: whatever's closest. The universe rewards proximity, not effort.",
  "A conversation you've been avoiding will find you. It has legs. It's fast. Run.",
  "The void is staring back. It's bored. Bring it a coffee or something.",
  "Today you will remember something embarrassing from 2017. There is no escape.",
  "Your to-do list is sentient and it's plotting revenge. Sleep with one eye open.",
  "The cosmos recommends lying down. Not in a productive way. Just lying down.",
  "Someone will say 'no worries' and mean the opposite. Trust nothing.",
  "Today's vibe: aggressively beige. Embrace it. Resistance is futile.",
  "Your future self is face-palming. Try to give them less to face-palm about.",
  "The universe is giving you a sign. It's a low-battery notification. Charge your phone.",
  "Today you will almost cry in public. Almost. You're a warrior. A damp warrior.",
  "Mercury isn't in retrograde but your dopamine is. Treat yourself to a small chaos.",
  "The stars have decided you need a nap. Argue with them. See who wins. (They will.)",
  "Someone will ask 'how are you?' and you'll say 'good!' and it'll be a lie. As always.",
  "Today's lucky number is whatever you want it to be. The universe stopped counting.",
  "A decision you've been putting off will put itself off further. Convenient.",
  "The cosmos suggests 'per my last email' energy. Use it sparingly. It's potent.",
  "Today you will almost do the thing. Almost. Close enough. The void accepts almost.",
  "Your houseplant is judging you. Water it. Or don't. It's already disappointed.",
  "The universe has scheduled a breakdown for 3:47 PM. Clear your calendar.",
  "Today's alignment suggests petting a dog. Any dog. The cosmos are dog people.",
  "You will receive a compliment today. You will not know how to accept it. As always.",
  "The stars recommend leaving on read. Whoever it is. They'll understand. Eventually.",
  "Today's forecast: 90% chance of pretending to be fine, 10% chance of snacks.",
  "Your aura is the color of 'I'll do it tomorrow.' It's a valid aura. Own it.",
  "The universe is rooting for you. Quietly. From a distance. With snacks.",
  "Today's cosmic assignment: stare at a wall. Reflect. The wall has notes.",
  "Someone will text you 'we need to talk.' It's about a group project. From 2018.",
  "The stars align for a dramatic sigh today. Practice in advance. Make it count.",
  "Your vibe today: 'almost ready to leave but haven't put on shoes.' Valid.",
  "The cosmos recommend saying 'no' more. Start with 'no worries.' End with 'no.'",
  "Today you will google something embarrassing. Clear your history. The stars see all.",
  "A snack will fix everything today. The stars are snack-aligned. Trust them.",
  "The universe has a plan for you. The plan is 'sit down for a sec.' Comply.",
  "Today's lucky color is 'whatever's clean.' The cosmos are pragmatic.",
  "Someone is wrong on the internet. The stars say: let them be wrong. Touch grass.",
  "The alignment suggests canceling plans. Any plans. All plans. The cosmos approve.",
  "Your energy today: 'replied to one email, need a nap.' Sustainable. Barely.",
  "The stars have logged your existential dread. It's on the record. Forever.",
  "Today's vibe: aggressively horizontal. The cosmos are horizontal people.",
  "You will crave a specific food. Don't get it. The stars want you to suffer. Slightly.",
  "The universe is testing your patience. With traffic. With emails. With yourself.",
  "Today's cosmic forecast: cloudy with a chance of 'I'll deal with it tomorrow.'",
  "The stars suggest wearing the comfy thing. The fancy thing can wait. Forever.",
  "Your vibe today: 'almost had a breakdown but got distracted by a snack.' Healthy.",
  "The cosmos recommend deep breaths. And by deep breaths, they mean a deep snack.",
  "Today's alignment: favorable for naps. Unfavorable for responsibilities. Choose wisely.",
  "The universe is sending you a sign. It's a 'low storage' notification. Delete something.",
  "Your aura is 'trying your best.' The stars see it. They're proud. Quietly.",
  "Today's cosmic task: reply to the text. Any text. Just one. The stars believe in you.",
  "The alignment suggests 'per my last email' but with more vulnerability. And snacks.",
  "The universe has noted your effort. It is filed under 'barely adequate.' Keep going.",
  "Today's vibe: 'one more episode' energy. The stars endorse it. They're binge-watchers too.",
];

/* ============================================================
   DETERMINISTIC SELECTION — hash(dateString + signName) → index
   Same sign + same date = same prediction for everyone, all day.
   Different signs get different predictions on the same day.
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

function getPredictionForSign(signName: string): string {
  const today = getTodayString();
  const idx = hashString(today + "|" + signName) % PREDICTIONS.length;
  return PREDICTIONS[idx];
}

/* ============================================================
   COMPONENT
   ============================================================ */

const SIGN_KEY = "osk.horoscope.sign.v1";

export default function DailyStressHoroscope() {
  const root = useRef<HTMLDivElement>(null);
  const [selectedSign, setSelectedSign] = useState<Zodiac | null>(() => {
    try {
      const saved = localStorage.getItem(SIGN_KEY);
      if (saved) {
        const z = ZODIACS.find((z) => z.name === saved);
        if (z) return z;
      }
    } catch {
      /* ignore */
    }
    return null;
  });

  // API-driven predictions: if admin has set a prediction for a sign
  // today, use it. Otherwise fall back to the deterministic hardcoded one.
  const [apiPredictions, setApiPredictions] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/horoscope/today")
      .then((res) => res.json())
      .then((data) => {
        const map: Record<string, string> = {};
        for (const h of data.horoscopes || []) {
          if (h.prediction) map[h.sign] = h.prediction;
        }
        if (Object.keys(map).length > 0) {
          setApiPredictions(map);
        }
      })
      .catch(() => {
        /* fallback to hardcoded predictions */
      });
  }, []);

  const getPrediction = (signName: string): string => {
    // API prediction takes priority over hardcoded
    if (apiPredictions[signName]) return apiPredictions[signName];
    return getPredictionForSign(signName);
  };

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

  const selectSign = (z: Zodiac) => {
    setSelectedSign(z);
    try {
      localStorage.setItem(SIGN_KEY, z.name);
    } catch {
      /* ignore */
    }
  };

  return (
    <section
      id="horoscope"
      ref={root}
      className="relative min-h-[100dvh] overflow-hidden px-4 py-20 sm:px-6 sm:py-28"
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

      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="hs-reveal mb-12 text-center">
          <span className="inline-block rotate-[-3deg] font-hand text-2xl font-bold text-pink sm:text-3xl">
            ↳ the cosmos have notes (for everyone)
          </span>
          <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.3em] text-electric">
            🔮 Daily Horoscope
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-5xl lg:text-7xl">
            Stress
            <br />
            <span className="text-stroke-thick">Horoscope</span>
          </h1>
          <p className="mt-4 font-hand text-xl font-bold text-ink/70 sm:text-2xl">
            {today}
          </p>
          <p className="mx-auto mt-3 max-w-md font-body text-base text-ink/70">
            Tap your sign to read today's prediction — or scroll through all 12.
            The stars wait for no one. (They actually do. They're just slow.)
          </p>
        </div>

        {/* Selected sign — big featured card */}
        <AnimatePresence mode="wait">
          {selectedSign && (
            <motion.div
              key={selectedSign.name}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="hs-reveal relative mb-12"
            >
              <FeaturedSignCard sign={selectedSign} prediction={getPrediction(selectedSign.name)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid of all 12 zodiac signs */}
        <div className="hs-reveal mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">
            All 12 Signs
          </h2>
          <span className="font-hand text-lg font-bold text-ink/60">
            tap to read yours →
          </span>
        </div>

        <div className="hs-reveal grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {ZODIACS.map((z) => {
            const palette = ELEMENT_COLORS[z.element];
            const isSelected = selectedSign?.name === z.name;
            return (
              <motion.button
                key={z.name}
                onClick={() => selectSign(z)}
                data-hover={z.name.toUpperCase()}
                whileHover={{ y: -4, rotate: isSelected ? 0 : -1.5 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border-[3px] border-jet p-4 text-left shadow-brutal transition-[box-shadow] duration-150",
                  isSelected ? "ring-4 ring-toxic ring-offset-2 ring-offset-cream" : "hover:shadow-brutal-lg"
                )}
                style={{
                  backgroundColor: palette.bg,
                  color: palette.text,
                }}
              >
                {/* Top-right fold corner */}
                <span
                  aria-hidden
                  className="absolute right-0 top-0 h-0 w-0"
                  style={{
                    borderTop: `12px solid ${palette.accent}`,
                    borderRight: "12px solid transparent",
                  }}
                />

                {/* Symbol + emoji row */}
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className="font-display text-3xl font-extrabold leading-none"
                    style={{ color: palette.accent }}
                  >
                    {z.symbol}
                  </span>
                  <span className="text-2xl">{z.emoji}</span>
                </div>

                {/* Name */}
                <h3 className="font-display text-base font-extrabold uppercase tracking-tight">
                  {z.name}
                </h3>

                {/* Date range */}
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide opacity-70">
                  {z.dateRange}
                </p>

                {/* Element badge */}
                <span
                  className="mt-2 inline-block rounded-full border border-current px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest opacity-80"
                >
                  {z.element}
                </span>

                {/* Hover hint */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-2 whitespace-nowrap rounded border border-current bg-current/0 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest opacity-0 transition-opacity duration-200 group-hover:opacity-90"
                >
                  read today →
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Refresh note */}
        <p className="hs-reveal mt-10 text-center font-hand text-lg font-bold text-ink/60">
          ↳ predictions refresh daily at midnight. each sign gets its own forecast. the stars are thorough.
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

/* ============================================================
   FeaturedSignCard — the big card shown when a sign is selected
   ============================================================ */

function FeaturedSignCard({ sign, prediction }: { sign: Zodiac; prediction: string }) {
  const palette = ELEMENT_COLORS[sign.element];

  return (
    <div
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

      {/* Floating stamp */}
      <div className="absolute -bottom-6 -right-4 hidden sm:block">
        <Stamp
          text={`· ${sign.name.toUpperCase()} · ${sign.element.toUpperCase()} · DAILY ·`}
          center={sign.symbol}
          color="toxic"
          className="h-24 w-24"
        />
      </div>

      {/* Symbol + emoji row */}
      <div className="mb-4 flex items-center gap-4">
        <motion.span
          initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
          className="text-7xl sm:text-8xl"
          style={{ filter: "drop-shadow(4px 4px 0 rgba(11,12,16,0.25))" }}
        >
          {sign.emoji}
        </motion.span>
        <span
          className="font-display text-6xl font-extrabold leading-none sm:text-7xl"
          style={{ color: palette.accent }}
        >
          {sign.symbol}
        </span>
      </div>

      {/* Sign name + date range */}
      <h3 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">
        {sign.name}
      </h3>
      <p className="mt-1 font-hand text-lg font-bold opacity-70">
        {sign.dateRange} · {sign.element} sign
      </p>

      {/* Mood badge */}
      <span
        className="mt-4 inline-block rotate-[-2deg] rounded-full border-2 border-jet px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-widest shadow-[3px_3px_0_#0b0c10] sm:text-xs"
        style={{ backgroundColor: palette.accent, color: "#0b0c10" }}
      >
        🔮 today's forecast
      </span>

      {/* The prediction */}
      <p className="mt-6 max-w-xl font-hand text-2xl font-bold leading-tight sm:text-3xl">
        "{prediction}"
      </p>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between border-t-2 border-current/20 pt-4">
        <span className="font-display text-xs font-extrabold uppercase tracking-widest opacity-60">
          — the cosmos (probably)
        </span>
        <span className="font-hand text-base font-bold opacity-60">
          tap another sign to compare →
        </span>
      </div>
    </div>
  );
}
