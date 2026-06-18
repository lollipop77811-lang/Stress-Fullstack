import { useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
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

type Reaction = "same" | "relatable" | "kalaana" | "bhai";

type Post = {
  id: number;
  text: string;
  mood: MoodId;
  reactions: Record<Reaction, number>;
  reacted: Record<Reaction, boolean>;
  mine?: boolean;
};

const REACTIONS: { id: Reaction; label: string; emoji: string }[] = [
  { id: "same", label: "Same", emoji: "🙏" },
  { id: "relatable", label: "Relatable", emoji: "💯" },
  { id: "kalaana", label: "Kalaana", emoji: "😤" },
  { id: "bhai", label: "Bhai", emoji: "🤝" },
];

/* ---------- seed posts ---------- */

const SEED: Post[] = [
  {
    id: 1,
    text: "My to-do list has its own to-do list.",
    mood: "boom",
    reactions: { same: 12, relatable: 8, kalaana: 3, bhai: 5 },
    reacted: { same: false, relatable: false, kalaana: false, bhai: false },
  },
  {
    id: 2,
    text: 'I googled "how to relax" and now I have 47 tabs open.',
    mood: "skull",
    reactions: { same: 24, relatable: 15, kalaana: 7, bhai: 2 },
    reacted: { same: false, relatable: false, kalaana: false, bhai: false },
  },
  {
    id: 3,
    text: 'My manager: "Just a quick call." It has been 2 hours.',
    mood: "wilt",
    reactions: { same: 31, relatable: 20, kalaana: 5, bhai: 8 },
    reacted: { same: false, relatable: false, kalaana: false, bhai: false },
  },
  {
    id: 4,
    text: "Wrote 'per my last email' and immediately felt powerful. Then scared. Then hungry.",
    mood: "burn",
    reactions: { same: 9, relatable: 14, kalaana: 2, bhai: 6 },
    reacted: { same: false, relatable: false, kalaana: false, bhai: false },
  },
  {
    id: 5,
    text: "Achieved inbox zero by deleting the inbox. Bold move. Consequences pending.",
    mood: "no",
    reactions: { same: 18, relatable: 11, kalaana: 4, bhai: 9 },
    reacted: { same: false, relatable: false, kalaana: false, bhai: false },
  },
  {
    id: 6,
    text: "Therapist said 'set boundaries.' Set them. Now I have no friends and a very calm plant.",
    mood: "plead",
    reactions: { same: 7, relatable: 13, kalaana: 1, bhai: 4 },
    reacted: { same: false, relatable: false, kalaana: false, bhai: false },
  },
];

/* ---------- sort options ---------- */

type Sort = "fresh" | "relatable" | "random";

const SORTS: { id: Sort; label: string; emoji: string }[] = [
  { id: "fresh", label: "Freshest Pain", emoji: "🩹" },
  { id: "relatable", label: "Most Relatable", emoji: "💯" },
  { id: "random", label: "Random Chaos", emoji: "🎲" },
];

/* ---------- helpers ---------- */

const moodEmoji = (id: MoodId): string =>
  MOODS.find((m) => m.id === id)?.emoji ?? "😩";

const totalReactions = (p: Post): number =>
  p.reactions.same + p.reactions.relatable + p.reactions.kalaana + p.reactions.bhai;

/* ---------- component ---------- */

export default function StressWall() {
  const root = useRef<HTMLDivElement>(null);
  const [mood, setMood] = useState<MoodId>("wilt");
  const [text, setText] = useState("");
  const [posts, setPosts] = useState<Post[]>(SEED);
  const [sort, setSort] = useState<Sort>("fresh");
  const [seed, setSeed] = useState(1); // for "random chaos" re-shuffle

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".sw-reveal",
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

  const visible = useMemo(() => {
    const list = [...posts];
    if (sort === "fresh") {
      list.sort((a, b) => b.id - a.id);
    } else if (sort === "relatable") {
      list.sort((a, b) => totalReactions(b) - totalReactions(a));
    } else {
      // random chaos — shuffle deterministically by seed
      list.sort((a, b) => {
        const h = (n: number) => ((n * 9301 + seed * 49297) % 233280) / 233280;
        return h(b.id) - h(a.id);
      });
    }
    return list;
  }, [posts, sort, seed]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const newPost: Post = {
      id: Math.max(...posts.map((p) => p.id)) + 1,
      text: t,
      mood,
      reactions: { same: 0, relatable: 0, kalaana: 0, bhai: 0 },
      reacted: { same: false, relatable: false, kalaana: false, bhai: false },
      mine: true,
    };
    setPosts((p) => [newPost, ...p]);
    setText("");
    setSort("fresh");
  };

  const react = (postId: number, r: Reaction) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const already = p.reacted[r];
        return {
          ...p,
          reactions: {
            ...p.reactions,
            [r]: p.reactions[r] + (already ? -1 : 1),
          },
          reacted: { ...p.reacted, [r]: !already },
        };
      })
    );
  };

  const remaining = 140 - text.length;

  return (
    <section
      id="wall"
      ref={root}
      className="relative px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="sw-reveal relative mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="inline-block rotate-[-3deg] font-hand text-2xl font-bold text-pink sm:text-3xl">
              community wall of feelings ↴
            </span>
            <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.3em] text-pink">
              Community
            </p>
            <h2 className="mt-1 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl">
              The Stress
              <br />
              <span className="text-stroke-thick">Wall</span>
            </h2>
            <p className="mt-4 max-w-lg font-body text-base text-ink sm:text-lg">
              You are not alone.{" "}
              <span className="font-hand text-xl font-bold text-electric">
                (But you kind of are.)
              </span>{" "}
              Drop your stress, watch strangers react, feel slightly less doomed.
            </p>
          </div>
          <Stamp
            text="· 0 JUDGEMENT · MAX LOLS ·"
            center="🗣️"
            color="electric"
            className="absolute -top-6 right-0 hidden h-24 w-24 sm:block"
          />
        </div>

        {/* Composer card */}
        <form
          onSubmit={onSubmit}
          className="sw-reveal relative mb-8 overflow-hidden rounded-[2rem] border-[3px] border-jet bg-cream p-2 shadow-brutal-xl"
        >
          <div className="rounded-[1.5rem] border-2 border-jet bg-cream p-5 sm:p-7">
            {/* Mood selector */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="font-display text-sm font-extrabold uppercase tracking-wide text-ink/70">
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
                        "grid h-11 w-11 place-items-center rounded-xl border-2 border-jet text-xl transition-[transform,box-shadow] duration-150",
                        on
                          ? "scale-110 bg-toxic shadow-brutal-sm"
                          : "bg-paper hover:-translate-y-0.5 hover:shadow-brutal-sm"
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
                  onChange={(e) => setText(e.target.value.slice(0, 140))}
                  placeholder="What's stressing you right now? (140 chars of honesty)"
                  rows={2}
                  data-hover="VENT"
                  className="w-full resize-none rounded-xl border-2 border-jet bg-paper px-4 py-3 font-body text-base font-medium text-jet shadow-brutal-sm outline-none placeholder:text-jet/40 focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-[transform,box-shadow] duration-150"
                />
                <div className="mt-1.5 flex items-center justify-between px-1">
                  <span className="font-hand text-sm font-bold text-ink/60">
                    no spam, just pain
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold uppercase tracking-wide",
                      remaining < 20 ? "text-pink" : "text-ink/50"
                    )}
                  >
                    {text.length}/140
                  </span>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={!text.trim()}
                data-hover="POST!"
                whileHover={
                  text.trim()
                    ? { x: 4, y: 4, boxShadow: "0px 0px 0px #0b0c10" }
                    : undefined
                }
                whileTap={text.trim() ? { scale: 0.97 } : undefined}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-jet px-7 py-4 font-display text-base font-bold uppercase tracking-tight shadow-brutal transition-[transform,box-shadow,opacity] duration-150 sm:text-lg",
                  text.trim()
                    ? "bg-pink text-cream"
                    : "cursor-not-allowed bg-paper text-jet/40 opacity-70"
                )}
              >
                <span className="animate-wiggle">📣</span>
                Unleash It
              </motion.button>
            </div>
          </div>
        </form>

        {/* Sort tabs */}
        <div className="sw-reveal mb-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 font-display text-sm font-extrabold uppercase tracking-wide text-ink/60">
            Sort:
          </span>
          {SORTS.map((s) => {
            const on = s.id === sort;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSort(s.id);
                  if (s.id === "random") setSeed((n) => n + 1);
                }}
                data-hover={s.label.toUpperCase()}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border-2 border-jet px-4 py-2 font-display text-sm font-bold uppercase tracking-tight transition-[transform,box-shadow] duration-150",
                  on
                    ? "bg-jet text-cream shadow-brutal-sm"
                    : "bg-cream text-jet hover:-translate-y-0.5 hover:shadow-brutal-sm"
                )}
              >
                <span>{s.emoji}</span>
                {s.label}
              </button>
            );
          })}

          <span className="ml-auto font-hand text-lg font-bold text-ink/60">
            {posts.length} stressors on the wall · sort yourselves out
          </span>
        </div>

        {/* Posts grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((p) => (
              <motion.article
                layout
                key={p.id}
                initial={{ opacity: 0, y: 30, scale: 0.95, rotate: -2 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9, rotate: 4 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                whileHover={{ y: -4 }}
                className={cn(
                  "group relative flex flex-col rounded-2xl border-[3px] border-jet p-5 shadow-brutal transition-[box-shadow] duration-150 hover:shadow-brutal-lg",
                  p.mine ? "bg-toxic text-jet" : "bg-cream text-jet"
                )}
              >
                {/* Top row: emoji + mine badge */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-3xl drop-shadow-[2px_2px_0_rgba(11,12,16,0.25)] sm:text-4xl">
                    {moodEmoji(p.mood)}
                  </span>
                  {p.mine && (
                    <span className="rounded-full border-2 border-jet bg-jet px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-cream">
                      ★ yours
                    </span>
                  )}
                </div>

                {/* Body */}
                <p className="flex-1 font-body text-base font-medium leading-snug sm:text-lg">
                  {p.text}
                </p>

                {/* Reactions */}
                <div className="mt-4 flex flex-wrap gap-1.5 border-t-2 border-dashed border-jet/30 pt-3">
                  {REACTIONS.map((r) => {
                    const reacted = p.reacted[r.id];
                    return (
                      <button
                        key={r.id}
                        onClick={() => react(p.id, r.id)}
                        data-hover={r.label.toUpperCase()}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border-2 border-jet px-2.5 py-1 text-xs font-bold uppercase tracking-tight transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-brutal-sm",
                          reacted
                            ? "bg-pink text-cream"
                            : "bg-cream text-jet"
                        )}
                      >
                        <span>{r.emoji}</span>
                        {r.label}
                        <span
                          className={cn(
                            "ml-0.5 tabular-nums",
                            reacted ? "text-cream" : "text-ink/60"
                          )}
                        >
                          {p.reactions[r.id]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>

        {/* Footnote */}
        <p className="sw-reveal mt-8 text-center font-hand text-lg font-bold text-ink/60">
          ↳ posts are anonymous, ephemeral & legally meaningless. like all feelings.
        </p>

        {/* Cross-link CTA → Whisper Wall */}
        <div className="sw-reveal mt-6 flex justify-center">
          <a
            href="#/whisper"
            data-hover="SHHH"
            className="group inline-flex items-center gap-3 rounded-2xl border-2 border-jet bg-jet px-6 py-3.5 text-cream shadow-brutal transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-brutal-lg"
          >
            <span className="text-xl">🤫</span>
            <span className="font-display text-sm font-extrabold uppercase tracking-tight sm:text-base">
              Want true anonymity?
            </span>
            <span className="font-hand text-lg font-bold text-toxic">
              → Whisper Wall
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
