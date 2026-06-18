import { useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Stamp from "@/components/ui/Stamp";
import { cn } from "@/utils/cn";

gsap.registerPlugin(ScrollTrigger);

type Cat = "all" | "work" | "life" | "tech" | "dad";

type Joke = {
  q: string;
  a: string;
  cat: Exclude<Cat, "all">;
};

const JOKES: Joke[] = [
  {
    q: "I told my stress it was cancelled.",
    a: "It left me on read. Rude.",
    cat: "life",
  },
  {
    q: "Why did the developer quit?",
    a: "He didn't get arrays. Like, at all.",
    cat: "tech",
  },
  {
    q: "I'm not procrastinating.",
    a: "I'm stress-marinating. It's a process.",
    cat: "work",
  },
  {
    q: "My therapist quit mid-session.",
    a: "She said I was 'too much for a Tuesday.'",
    cat: "life",
  },
  {
    q: "Why don't I trust stairs?",
    a: "They're always up to something.",
    cat: "dad",
  },
  {
    q: "I told my boss I needed a mental health day.",
    a: "He sent a calendar invite titled 'Mental Health Day (Optional)'.",
    cat: "work",
  },
  {
    q: "Why did the Wi-Fi break up with the router?",
    a: "No connection anymore. Classic.",
    cat: "tech",
  },
  {
    q: "I've achieved inner peace.",
    a: "Outer peace, however, has filed a complaint.",
    cat: "life",
  },
  {
    q: "What do you call a fake noodle?",
    a: "An impasta. (Yes. I went there.)",
    cat: "dad",
  },
  {
    q: "My to-do list and I are no longer speaking.",
    a: "It said I 'wasn't pulling my weight.' Bold of it.",
    cat: "work",
  },
  {
    q: "I tried to hug my stress goodbye.",
    a: "It hugged back. Now we own a dog together.",
    cat: "life",
  },
  {
    q: "Why don't programmers like nature?",
    a: "Too many bugs. Not enough stack overflow.",
    cat: "tech",
  },
];

const CATS: { id: Cat; label: string; emoji: string }[] = [
  { id: "all", label: "All chaos", emoji: "🎲" },
  { id: "work", label: "Workplace", emoji: "💼" },
  { id: "life", label: "Life lol", emoji: "🫠" },
  { id: "tech", label: "Tech pain", emoji: "💻" },
  { id: "dad", label: "Dad jokes", emoji: "👴" },
];

export default function JokeGenerator() {
  const root = useRef<HTMLDivElement>(null);
  const [cat, setCat] = useState<Cat>("all");
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".jk-reveal",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 78%" },
        }
      );
    }, root);
    return () => ctx.revert();
  }, []);

  const pool = JOKES.filter((j) => cat === "all" || j.cat === cat);
  const safe = pool.length > 0 ? pool : JOKES;
  const current = safe[idx % safe.length];

  const next = () => {
    if (safe.length <= 1) {
      setIdx((i) => i + 1);
    } else {
      let n = idx;
      while (n === idx) n = Math.floor(Math.random() * safe.length);
      setIdx(n);
    }
    setCount((c) => c + 1);
  };

  const onCat = (c: Cat) => {
    setCat(c);
    setIdx(0);
  };

  return (
    <section
      id="jokes"
      ref={root}
      className="relative px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="jk-reveal relative mb-10 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-block rotate-[-3deg] font-hand text-2xl font-bold text-electric sm:text-3xl">
              one tap, one laugh ↴
            </span>
            <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl">
              The Joke
              <br />
              <span className="text-stroke-thick">Slot Machine</span>
            </h2>
          </div>
          <p className="max-w-sm font-body text-ink sm:text-right">
            Press the button. Receive a joke. Repeat until stress flees the
            premises. Side effects: groaning, smirking, and accidental joy.
          </p>
          <Stamp
            text="· CERTIFIED LMAO · OFFICIAL ·"
            center="😂"
            color="toxic"
            className="absolute -top-8 right-0 hidden h-24 w-24 sm:block"
          />
        </div>

        {/* Category pills */}
        <div className="jk-reveal mb-6 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => onCat(c.id)}
              data-hover={c.label.toUpperCase()}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border-2 border-jet px-4 py-2 font-display text-sm font-bold uppercase tracking-tight transition-[transform,box-shadow] duration-150",
                cat === c.id
                  ? "bg-jet text-cream shadow-brutal-sm"
                  : "bg-cream text-jet hover:-translate-y-0.5 hover:shadow-brutal-sm"
              )}
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>

        {/* Joke card */}
        <div className="jk-reveal relative rounded-[2rem] border-[3px] border-jet bg-toxic p-2 shadow-brutal-xl">
          <div className="relative overflow-hidden rounded-[1.5rem] border-2 border-jet bg-cream p-7 sm:p-12">
            {/* corner badges */}
            <div className="absolute right-5 top-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-jet/60">
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-toxic" />
              live · legit funny
            </div>

            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-lg border-2 border-jet bg-pink px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-cream">
                {current.cat}
              </span>
              <span className="font-hand text-xl font-bold text-electric">
                joke #{(count % 999) + 1}
              </span>
            </div>

            {/* Animated joke swap */}
            <div className="min-h-[200px] sm:min-h-[180px]">
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={`${cat}-${idx}`}
                  initial={{ opacity: 0, y: 24, rotate: -2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  exit={{ opacity: 0, y: -24, rotate: 2 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className="space-y-4"
                >
                  <p className="font-display text-2xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
                    {current.q}
                  </p>
                  <p className="font-body text-lg font-medium text-ink sm:text-2xl">
                    <span className="mr-2 text-pink">→</span>
                    {current.a}
                  </p>
                </motion.blockquote>
              </AnimatePresence>
            </div>

            {/* Footer: counter + button */}
            <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t-2 border-dashed border-jet/30 pt-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-5">
                <div>
                  <div className="font-display text-3xl font-extrabold leading-none">
                    {count}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-jet/60">
                    laughs served
                  </div>
                </div>
                <div className="h-10 w-px bg-jet/20" />
                <p className="font-hand text-lg font-bold text-ink/70">
                  keep going, stress is shaking 👀
                </p>
              </div>

              <motion.button
                onClick={next}
                data-hover="HIT ME!"
                whileHover={{ x: 4, y: 4, boxShadow: "0px 0px 0px #0b0c10" }}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-jet bg-electric px-7 py-3.5 font-display text-base font-bold uppercase tracking-tight text-cream shadow-brutal transition-[transform,box-shadow] duration-150 sm:text-lg"
              >
                <span className="animate-wiggle">🎲</span>
                Drop a new one
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
