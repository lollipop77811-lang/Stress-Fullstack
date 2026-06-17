import { useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Stamp from "@/components/ui/Stamp";
import { cn } from "@/utils/cn";

gsap.registerPlugin(ScrollTrigger);

type Opt = { label: string; pts: number; emoji: string };

type Q = {
  id: number;
  q: string;
  opts: Opt[];
};

const QUESTIONS: Q[] = [
  {
    id: 1,
    q: "It's 2 AM. You're wide awake. Why?",
    opts: [
      { label: "Existential dread. The usual.", pts: 3, emoji: "🌑" },
      { label: "Replaying a conversation from 2019.", pts: 4, emoji: "🔁" },
      { label: "Actually asleep. Dreaming of snacks.", pts: 0, emoji: "😴" },
      { label: "Wikipedia rabbit hole: 'list of pasta shapes'.", pts: 2, emoji: "🍝" },
    ],
  },
  {
    id: 2,
    q: "An email says 'per my last email'. You feel:",
    opts: [
      { label: "Called out. Detected. Briefly invisible.", pts: 4, emoji: "🕵️" },
      { label: "Nothing. I am steel. I am a wall.", pts: 1, emoji: "🧱" },
      { label: "Hungry, suddenly.", pts: 3, emoji: "🍽️" },
      { label: "What email? I haven't opened it since 2021.", pts: 2, emoji: "📭" },
    ],
  },
  {
    id: 3,
    q: "Your to-do list right now is:",
    opts: [
      { label: "A scroll. A long, judgemental scroll.", pts: 3, emoji: "📜" },
      { label: "One item. It says 'survive'.", pts: 4, emoji: "🆘" },
      { label: "Three sticky notes I refuse to look at.", pts: 2, emoji: "📌" },
      { label: "To-do list? I am the to-do list.", pts: 1, emoji: "👑" },
    ],
  },
  {
    id: 4,
    q: "Someone says 'take a deep breath'. You:",
    opts: [
      { label: "Breathe so deep you disappear.", pts: 2, emoji: "💨" },
      { label: "Stare until they get uncomfortable.", pts: 3, emoji: "👁️" },
      { label: "Cry. Just a little. Quickly.", pts: 4, emoji: "💧" },
      { label: "Already breathing. Always breathing.", pts: 0, emoji: "🧘" },
    ],
  },
  {
    id: 5,
    q: "Pick your coping mechanism:",
    opts: [
      { label: "Scrolling until my thumb files a complaint.", pts: 4, emoji: "📱" },
      { label: "Snacks. All of them. Now.", pts: 3, emoji: "🍪" },
      { label: "Therapy. The real kind. I'm growing.", pts: 0, emoji: "🌱" },
      { label: "Aggressive optimism (it's a problem).", pts: 2, emoji: "🌈" },
    ],
  },
];

type Result = {
  min: number;
  max: number;
  label: string;
  emoji: string;
  blurb: string;
  accent: "toxic" | "electric" | "pink" | "jet";
};

const RESULTS: Result[] = [
  {
    min: 0,
    max: 4,
    label: "Suspiciously Chill",
    emoji: "😎",
    blurb:
      "Either you've genuinely found peace, or you've repressed so hard you forgot what year it is. Either way: respect.",
    accent: "toxic",
  },
  {
    min: 5,
    max: 9,
    label: "Mildly Toasty",
    emoji: "🫠",
    blurb:
      "You're holding it together. Barely. With tape. And one of those tapes is the cheap kind that won't stick.",
    accent: "electric",
  },
  {
    min: 10,
    max: 14,
    label: "Premium Unraveling",
    emoji: "🌀",
    blurb:
      "You're a runtime error in a trench coat pretending to be a person. We see you. We are you. Hydrate.",
    accent: "pink",
  },
  {
    min: 15,
    max: 99,
    label: "Legally A Tornado",
    emoji: "🌪️",
    blurb:
      "Congratulations, you are now classified as a natural disaster. Evacuation recommended. Snacks mandatory.",
    accent: "jet",
  },
];

const accentBox = {
  toxic: "bg-toxic text-jet",
  electric: "bg-electric text-cream",
  pink: "bg-pink text-cream",
  jet: "bg-jet text-cream",
};

export default function StressTestQuiz() {
  const root = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".qz-reveal",
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

  const total = QUESTIONS.length;
  const score = answers.reduce((s, p) => s + p, 0);
  const result = RESULTS.find((r) => score >= r.min && score <= r.max) ?? RESULTS[0];

  const pick = (pts: number) => {
    const next = [...answers, pts];
    setAnswers(next);
    if (step + 1 < total) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  };

  const restart = () => {
    setStep(0);
    setAnswers([]);
    setDone(false);
  };

  const progress = ((step + (done ? 1 : 0)) / total) * 100;

  return (
    <section
      id="quiz"
      ref={root}
      className="relative px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="qz-reveal relative mb-10 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-block rotate-[-3deg] font-hand text-2xl font-bold text-electric sm:text-3xl">
              not medical advice (definitely not) ↴
            </span>
            <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl">
              The Stress
              <br />
              <span className="text-stroke-thick">Detector 3000™</span>
            </h2>
          </div>
          <Stamp
            text="· 0% SCIENCE · 100% VIBES ·"
            center="🩺"
            color="pink"
            className="absolute -top-8 right-0 hidden h-24 w-24 sm:block"
          />
        </div>

        {/* Card */}
        <div className="qz-reveal relative rounded-[2rem] border-[3px] border-jet bg-cream p-2 shadow-brutal-xl">
          <div className="relative overflow-hidden rounded-[1.5rem] border-2 border-jet bg-cream">
            {/* Progress bar */}
            <div className="h-3 w-full bg-paper">
              <motion.div
                className="h-full bg-toxic"
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 26 }}
              />
            </div>

            <div className="p-6 sm:p-10">
              <AnimatePresence mode="wait">
                {!done ? (
                  <motion.div
                    key={`q-${step}`}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ type: "spring", stiffness: 280, damping: 26 }}
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <span className="rounded-full border-2 border-jet bg-jet px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-cream">
                        Q{step + 1} / {total}
                      </span>
                      <span className="font-hand text-xl font-bold text-pink">
                        answer honestly (or lie, idc)
                      </span>
                    </div>

                    <h3 className="font-display text-2xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
                      {QUESTIONS[step].q}
                    </h3>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {QUESTIONS[step].opts.map((o) => (
                        <motion.button
                          key={o.label}
                          onClick={() => pick(o.pts)}
                          data-hover="PICK"
                          whileHover={{ x: 4, y: 4, boxShadow: "0px 0px 0px #0b0c10" }}
                          whileTap={{ scale: 0.97 }}
                          className="group flex items-center gap-3 rounded-xl border-2 border-jet bg-cream px-4 py-4 text-left shadow-brutal-sm transition-[transform,box-shadow] duration-150 hover:bg-toxic"
                        >
                          <span className="text-2xl transition-transform duration-200 group-hover:scale-125 group-hover:rotate-6">
                            {o.emoji}
                          </span>
                          <span className="font-display text-sm font-bold uppercase tracking-tight sm:text-base">
                            {o.label}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 240, damping: 22 }}
                    className="text-center"
                  >
                    <div className="mb-2 font-hand text-xl font-bold text-electric">
                      diagnosis incoming...
                    </div>
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-2xl border-[3px] border-jet p-8 shadow-brutal sm:p-12",
                        accentBox[result.accent]
                      )}
                    >
                      <motion.div
                        initial={{ scale: 0.3, rotate: -25, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                        className="text-8xl drop-shadow-[5px_5px_0_rgba(11,12,16,0.3)] sm:text-9xl"
                      >
                        {result.emoji}
                      </motion.div>
                      <div className="mt-4 text-[11px] font-bold uppercase tracking-widest opacity-80">
                        stress score
                      </div>
                      <div className="font-display text-6xl font-extrabold leading-none sm:text-8xl">
                        {score}
                        <span className="text-3xl opacity-60">/{total * 4}</span>
                      </div>
                      <h3 className="mt-4 font-display text-3xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">
                        {result.label}
                      </h3>
                      <p className="mx-auto mt-4 max-w-md font-body text-base sm:text-lg">
                        {result.blurb}
                      </p>
                    </div>

                    <motion.button
                      onClick={restart}
                      data-hover="AGAIN!"
                      whileHover={{ x: 4, y: 4, boxShadow: "0px 0px 0px #0b0c10" }}
                      whileTap={{ scale: 0.96 }}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-jet bg-electric px-7 py-3.5 font-display text-base font-bold uppercase tracking-tight text-cream shadow-brutal transition-[transform,box-shadow] duration-150 sm:text-lg"
                    >
                      <span className="animate-wiggle">↻</span>
                      Retake the chaos
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* footnote */}
        <p className="qz-reveal mt-4 text-center font-hand text-lg font-bold text-ink/60">
          ↳ results are non-binding & legally meaningless. lol.
        </p>
      </div>
    </section>
  );
}
