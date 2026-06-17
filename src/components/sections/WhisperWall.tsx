import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Stamp from "@/components/ui/Stamp";
import { cn } from "@/utils/cn";

gsap.registerPlugin(ScrollTrigger);

/* ---------- types ---------- */

type MoodId = "wilt" | "plead" | "boom" | "skull" | "burn" | "no";

type Mood = { id: MoodId; emoji: string; label: string };

const MOODS: Mood[] = [
  { id: "wilt", emoji: "😩", label: "Wilted" },
  { id: "plead", emoji: "🥺", label: "Pleading" },
  { id: "boom", emoji: "🤯", label: "Mind blown" },
  { id: "skull", emoji: "💀", label: "Dead inside" },
  { id: "burn", emoji: "🔥", label: "On fire (bad)" },
  { id: "no", emoji: "🚫", label: "Nope" },
];

type Whisper = {
  id: number;
  text: string;
  mood: MoodId;
  witnesses: number;
  witnessed: boolean;
  createdAt: number; // epoch ms
  ttl: number; // ms remaining at createdAt (default 24h)
  dissolved: boolean;
};

const TTL_24H = 24 * 60 * 60 * 1000;
const WITNESS_THRESHOLD = 100;

const KIND_NOTES = [
  "you survived every bad day so far. that's a 100% win rate. keep going, you absolute legend.",
  "the version of you reading this is doing better than you think. fr.",
  "future you is gonna be so proud of present you. even if present you is just lying down.",
  "hydrating counts as self-care. so does breathing. you're crushing it.",
  "you don't have to win today. you just have to show up. which you did. hi.",
  "the void says hi back. it's rooting for you. weird, but true.",
  "nobody has it together. they're just better at pretending. you're fine.",
  "every storm runs out of rain. even the dramatic ones. even yours.",
  "rest is productive. saying no is productive. lying on the floor counts.",
  "you are not behind. you are exactly here. that's enough for today.",
];

/* ---------- helpers ---------- */

const moodEmoji = (id: MoodId): string =>
  MOODS.find((m) => m.id === id)?.emoji ?? "😩";

const fmtRemaining = (ms: number): string => {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m left`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
};

const STORAGE_KEY = "osk.whispers.v1";

/* ---------- seed whispers ---------- */

const now = Date.now();
const SEED: Whisper[] = [
  { id: 4740, text: "I have a recurring nightmare where I'm late for an exam I never signed up for. I graduated in 2017.", mood: "boom", witnesses: 178, witnessed: false, createdAt: now - 11 * 3600_000, ttl: TTL_24H, dissolved: false },
  { id: 4735, text: "I told my houseplant I'd water it tomorrow. It is now day 9 of 'tomorrow'. We don't make eye contact.", mood: "plead", witnesses: 62, witnessed: false, createdAt: now - 12 * 60_000, ttl: TTL_24H, dissolved: false },
  { id: 4731, text: "Replied 'no worries!' to an email that contained many worries. I am the worries now.", mood: "skull", witnesses: 89, witnessed: false, createdAt: now - 5 * 3600_000, ttl: TTL_24H, dissolved: false },
  { id: 4729, text: "I've been pretending to understand my job for 3 years. Nobody has noticed. The fear is constant.", mood: "wilt", witnesses: 47, witnessed: false, createdAt: now - 2 * 3600_000, ttl: TTL_24H, dissolved: false },
  { id: 4725, text: "I rehearse phone calls out loud before making them. Even the ones to my mom. Especially those.", mood: "burn", witnesses: 134, witnessed: false, createdAt: now - 23.95 * 3600_000, ttl: TTL_24H, dissolved: false },
  { id: 4612, text: '"you survived every bad day so far. that\'s a 100% win rate. keep going, you absolute legend."', mood: "no", witnesses: 211, witnessed: false, createdAt: now - 26 * 3600_000, ttl: TTL_24H, dissolved: true },
];

/* ---------- component ---------- */

export default function WhisperWall() {
  const root = useRef<HTMLDivElement>(null);
  const [mood, setMood] = useState<MoodId>("wilt");
  const [text, setText] = useState("");
  const [whispers, setWhispers] = useState<Whisper[]>(SEED);
  const [tick, setTick] = useState(0); // forces re-render for countdowns
  const [nextId, setNextId] = useState(4750);

  /* GSAP reveal */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".wh-reveal",
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

  /* Load from localStorage */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Whisper[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setWhispers(parsed);
        const maxId = parsed.reduce((m, w) => Math.max(m, w.id), 0);
        setNextId(maxId + 1);
      }
    } catch {
      /* ignore */
    }
  }, []);

  /* Persist to localStorage */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(whispers));
    } catch {
      /* ignore */
    }
  }, [whispers]);

  /* Countdown tick — every 1s */
  useEffect(() => {
    const i = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(i);
  }, []);

  /* Auto-dissolve expired / over-witnessed */
  useEffect(() => {
    setWhispers((prev) =>
      prev.map((w) => {
        if (w.dissolved) return w;
        const remaining = w.ttl - (Date.now() - w.createdAt);
        if (remaining <= 0 || w.witnesses >= WITNESS_THRESHOLD) {
          return {
            ...w,
            dissolved: true,
            text: KIND_NOTES[w.id % KIND_NOTES.length],
            mood: "no",
          };
        }
        return w;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const w: Whisper = {
      id: nextId,
      text: t,
      mood,
      witnesses: 0,
      witnessed: false,
      createdAt: Date.now(),
      ttl: TTL_24H,
      dissolved: false,
    };
    setWhispers((prev) => [w, ...prev]);
    setNextId((n) => n + 1);
    setText("");
  };

  const witness = (id: number) => {
    setWhispers((prev) =>
      prev.map((w) => {
        if (w.id !== id || w.dissolved) return w;
        return {
          ...w,
          witnesses: w.witnessed ? w.witnesses - 1 : w.witnesses + 1,
          witnessed: !w.witnessed,
        };
      })
    );
  };

  const remaining = (w: Whisper): number =>
    w.dissolved ? 0 : Math.max(0, w.ttl - (Date.now() - w.createdAt));

  const charCount = text.length;
  const charMax = 200;

  return (
    <section
      id="whisper"
      ref={root}
      className="relative px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="wh-reveal relative mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="inline-block rotate-[-3deg] font-hand text-2xl font-bold text-pink sm:text-3xl">
              ↳ anonymous &amp; ephemeral
            </span>
            <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.3em] text-toxic">
              Anonymous
            </p>
            <h2 className="mt-1 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight text-cream sm:text-6xl">
              The Whisper
              <br />
              <span className="text-stroke-cream">Wall</span>
            </h2>
            <p className="mt-4 max-w-lg font-body text-base text-cream/70 sm:text-lg">
              Drop a secret. Strangers will witness it. Then it dissolves into
              the void.{" "}
              <span className="font-hand text-xl font-bold text-toxic">
                No usernames. No history. No vibe killer.
              </span>
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-cream bg-pink px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-cream">
              🕶️ 100% anonymous
            </span>
            <span className="font-hand text-lg font-bold text-cream/60">
              2,847 whispers witnessed today
            </span>
            <Stamp
              text="· NO HISTORY · MAX VIBES ·"
              center="🤫"
              color="toxic"
              className="mt-2 hidden h-24 w-24 sm:block"
            />
          </div>
        </div>

        {/* Composer */}
        <form
          onSubmit={onSubmit}
          className="wh-reveal relative mb-8 overflow-hidden rounded-[2rem] border-[3px] border-cream bg-ink p-2 shadow-[12px_12px_0_#f72585]"
        >
          <div className="rounded-[1.5rem] border-2 border-cream bg-jet p-5 sm:p-7">
            {/* Mood selector */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="font-display text-sm font-extrabold uppercase tracking-wide text-cream/70">
                Your mood:
              </span>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => {
                  const on = m.id === mood;
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setMood(m.id)}
                      data-hover={m.label.toUpperCase()}
                      title={m.label}
                      aria-label={`Mood: ${m.label}`}
                      className={cn(
                        "grid h-11 w-11 place-items-center rounded-xl border-2 border-cream text-xl transition-[transform,box-shadow] duration-150",
                        on
                          ? "scale-110 bg-toxic text-jet shadow-[3px_3px_0_#fcf7f8]"
                          : "bg-ink text-cream hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#f72585]"
                      )}
                    >
                      {m.emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Textarea + button */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="flex-1">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, charMax))}
                  placeholder="whisper something. no one will know. (200 chars of pure release)"
                  rows={2}
                  data-hover="VENT"
                  className="w-full resize-none rounded-xl border-2 border-cream bg-ink px-4 py-3 font-body text-base font-medium text-cream shadow-[3px_3px_0_#fcf7f8] outline-none placeholder:text-cream/40 focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-[transform,box-shadow] duration-150"
                />
                <div className="mt-1.5 flex items-center justify-between px-1">
                  <span className="font-hand text-sm font-bold text-cream/60">
                    yes, really anonymous. no, we won't tell.
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold uppercase tracking-wide",
                      charMax - charCount < 20 ? "text-pink" : "text-cream/50"
                    )}
                  >
                    {charCount}/{charMax} · dissolves in 24h
                  </span>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={!text.trim()}
                data-hover="SEND!"
                whileHover={
                  text.trim()
                    ? { x: 4, y: 4, boxShadow: "0px 0px 0px #f72585" }
                    : undefined
                }
                whileTap={text.trim() ? { scale: 0.97 } : undefined}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-jet px-7 py-4 font-display text-base font-bold uppercase tracking-tight shadow-[6px_6px_0_#f72585] transition-[transform,box-shadow,opacity] duration-150 sm:text-lg",
                  text.trim()
                    ? "bg-toxic text-jet"
                    : "cursor-not-allowed bg-ink text-cream/40 opacity-70"
                )}
              >
                <span className="animate-wiggle">📣</span>
                Send into the void
              </motion.button>
            </div>
          </div>
        </form>

        {/* Whispers grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {whispers.map((w) => {
              const ms = remaining(w);
              const expiring = !w.dissolved && ms < 5 * 60_000;
              return (
                <motion.article
                  layout
                  key={w.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95, rotate: -2 }}
                  animate={{
                    opacity: expiring ? [1, 0.45, 1] : 1,
                    y: 0,
                    scale: 1,
                    rotate: 0,
                  }}
                  exit={{ opacity: 0, scale: 0.9, rotate: 4 }}
                  transition={{
                    opacity: expiring
                      ? { duration: 2.4, repeat: Infinity }
                      : { type: "spring", stiffness: 280, damping: 24 },
                    y: { type: "spring", stiffness: 280, damping: 24 },
                    scale: { type: "spring", stiffness: 280, damping: 24 },
                  }}
                  whileHover={{ y: -4 }}
                  className={cn(
                    "group relative flex flex-col rounded-2xl border-[3px] border-jet p-5 shadow-brutal transition-[box-shadow] duration-150 hover:shadow-brutal-lg",
                    w.dissolved
                      ? "bg-toxic text-jet"
                      : expiring
                      ? "bg-cream text-jet shadow-[6px_6px_0_#f72585]"
                      : "bg-cream text-jet shadow-[6px_6px_0_#4361ee]"
                  )}
                >
                  {/* Head row */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-md border-2 border-jet bg-jet px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-cream">
                      #{w.id}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-jet/55">
                      {w.dissolved ? "✨ dissolved" : moodEmoji(w.mood)}
                    </span>
                  </div>

                  {/* Body */}
                  <p
                    className={cn(
                      "flex-1 font-body text-base font-medium leading-snug sm:text-lg",
                      w.dissolved &&
                        "font-hand text-xl font-bold leading-snug"
                    )}
                  >
                    {w.text}
                  </p>

                  {/* Foot */}
                  <div className="mt-4 flex items-center justify-between border-t-2 border-dashed border-jet/30 pt-3">
                    <button
                      onClick={() => witness(w.id)}
                      disabled={w.dissolved}
                      data-hover={w.dissolved ? "GONE" : "WITNESS"}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border-2 border-jet px-3 py-1 text-[11px] font-bold uppercase tracking-tight transition-[transform,box-shadow] duration-150",
                        w.dissolved
                          ? "cursor-default bg-toxic text-jet/40"
                          : w.witnessed
                          ? "bg-pink text-cream"
                          : "bg-cream text-jet hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#0b0c10]"
                      )}
                    >
                      <span>{w.dissolved ? "👋" : "👁️"}</span>
                      {w.dissolved ? "witnessed" : "witness"}
                      <span
                        className={cn(
                          "ml-0.5 tabular-nums",
                          w.witnessed ? "text-cream" : "text-jet/60"
                        )}
                      >
                        {w.witnesses}
                      </span>
                    </button>
                    <span
                      className={cn(
                        "font-display text-xs font-extrabold tracking-wide",
                        expiring ? "text-pink" : "text-jet/60"
                      )}
                    >
                      {w.dissolved ? "replaced · 👋" : fmtRemaining(ms)}
                    </span>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Footnote */}
        <p className="wh-reveal mt-8 text-center font-hand text-lg font-bold text-cream/55">
          ↳ after 24h or 100 witnesses, your whisper gets replaced by a
          stranger's kind note. it's the circle of vibes.
        </p>

        {/* Back-home CTA */}
        <div className="wh-reveal mt-10 flex justify-center">
          <a
            href="#top"
            data-hover="BACK!"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-cream bg-jet px-6 py-3 font-display text-sm font-bold uppercase tracking-tight text-cream shadow-[4px_4px_0_#fcf7f8] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#fcf7f8]"
          >
            <span>←</span> Back to the loud side
          </a>
        </div>
      </div>
    </section>
  );
}
