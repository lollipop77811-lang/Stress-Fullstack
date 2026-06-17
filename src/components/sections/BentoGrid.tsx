import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Stamp from "@/components/ui/Stamp";
import { cn } from "@/utils/cn";

gsap.registerPlugin(ScrollTrigger);

type Accent = "jet" | "toxic" | "electric" | "pink" | "cream";

const accentMap: Record<Accent, { box: string; tag: string; bar: string }> = {
  jet: { box: "bg-jet text-cream", tag: "bg-cream text-jet", bar: "bg-toxic" },
  toxic: {
    box: "bg-toxic text-jet",
    tag: "bg-jet text-cream",
    bar: "bg-jet",
  },
  electric: {
    box: "bg-electric text-cream",
    tag: "bg-cream text-jet",
    bar: "bg-toxic",
  },
  pink: {
    box: "bg-pink text-cream",
    tag: "bg-cream text-pink",
    bar: "bg-toxic",
  },
  cream: {
    box: "bg-cream text-jet",
    tag: "bg-electric text-cream",
    bar: "bg-electric",
  },
};

type Card = {
  id: string;
  tag: string;
  title: string;
  emoji?: string;
  accent: Accent;
  span: string;
  children?: ReactNode;
  hover?: string;
};

const CARDS: Card[] = [
  {
    id: "c1",
    tag: "BREAKING (probably)",
    title: "Procrastination Hits Record High; Researchers Too Lazy to Publish It",
    emoji: "🛌",
    accent: "jet",
    span: "md:col-span-2 md:row-span-2",
    hover: "LOL",
    children: (
      <div className="mt-auto flex items-end justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide opacity-80">
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-toxic" />
          LIVE · nobody is working
        </div>
        <span className="font-display text-5xl sm:text-7xl">🛌</span>
      </div>
    ),
  },
  {
    id: "c2",
    tag: "WORKPLACE",
    title: "I said I'd 'circle back' and now I'm lost inside the circle.",
    emoji: "🔄",
    accent: "toxic",
    span: "md:col-span-2",
    hover: "OOF",
  },
  {
    id: "c3",
    tag: "WELLNESS",
    title: "Meditation app crashed — now I'm stressing in glorious 4K.",
    emoji: "🧘",
    accent: "cream",
    span: "",
    hover: "LOL",
  },
  {
    id: "c4",
    tag: "TEAMWORK",
    title: "Group project update: I am the group now.",
    emoji: "👑",
    accent: "electric",
    span: "",
    hover: "BIG",
  },
  {
    id: "c5",
    tag: "PET NEWS",
    title: "Cat files for unemployment, demands treats as severance.",
    emoji: "🐈",
    accent: "pink",
    span: "md:row-span-2",
    hover: "MEOW",
    children: (
      <div className="mt-auto flex justify-end">
        <span className="font-display text-6xl sm:text-7xl">🐈</span>
      </div>
    ),
  },
  {
    id: "c6",
    tag: "STATS",
    title: "99% of stats in this card are made up. Trust me, I'm a card.",
    accent: "toxic",
    span: "md:row-span-2",
    hover: "FACT",
    children: (
      <div className="mt-auto flex items-end gap-1.5">
        {[40, 70, 50, 90, 60, 100].map((h, i) => (
          <div
            key={i}
            className="w-3 rounded-sm border-2 border-jet bg-jet"
            style={{ height: `${h * 0.4}px` }}
          />
        ))}
      </div>
    ),
  },
  {
    id: "c7",
    tag: "PRODUCTIVITY",
    title: "My to-do list filed a restraining order against me.",
    emoji: "📋",
    accent: "cream",
    span: "",
    hover: "YIKES",
  },
  {
    id: "c8",
    tag: "CALENDAR",
    title: "Tuesday called. It's cancelling itself. Again.",
    emoji: "📅",
    accent: "electric",
    span: "col-span-2 md:col-span-2",
    hover: "LOL",
    children: (
      <div className="mt-auto flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide opacity-80">
        <span>📅 Mon · </span>
        <span className="text-toxic">❌ Tue (cancelled)</span>
        <span> · Wed</span>
      </div>
    ),
  },
];

function BentoCard({ card }: { card: Card }) {
  const a = accentMap[card.accent];
  return (
    <article
      data-hover={card.hover ?? "LOL"}
      className={cn(
        "bento-card group relative flex flex-col overflow-hidden rounded-2xl border-[3px] border-jet p-5 shadow-brutal",
        "transition-[transform,box-shadow] duration-150 ease-out will-change-transform",
        "hover:-translate-y-1 hover:translate-x-1 hover:shadow-none",
        a.box,
        card.span
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={cn(
            "rounded-full border-2 border-jet px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            a.tag
          )}
        >
          {card.tag}
        </span>
        {card.emoji && (
          <span className="text-xl transition-transform duration-200 group-hover:scale-125 group-hover:rotate-6">
            {card.emoji}
          </span>
        )}
      </div>
      <h3 className="font-display text-lg font-extrabold uppercase leading-tight tracking-tight sm:text-xl">
        {card.title}
      </h3>
      {card.children}
    </article>
  );
}

export default function BentoGrid() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bento-card",
        { opacity: 0, y: 50, rotate: -4, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          rotate: 0,
          scale: 1,
          duration: 0.7,
          stagger: 0.09,
          ease: "back.out(1.4)",
          clearProps: "transform",
          scrollTrigger: {
            trigger: root.current,
            start: "top 78%",
          },
        }
      );
      gsap.fromTo(
        ".bento-head",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 85%" },
        }
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="bento"
      ref={root}
      className="relative px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="bento-head relative mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="inline-block rotate-[-3deg] font-hand text-2xl font-bold text-pink sm:text-3xl">
              fresh chaos, served daily ↴
            </span>
            <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl">
              The Daily
              <br />
              <span className="text-stroke-thick">Nonsense Feed</span>
            </h2>
          </div>
          <p className="max-w-sm font-body text-ink sm:text-right">
            Hand-picked(ish) memes, hot takes &amp; satire. Side effects: smirking,
            snorting, and looking suspiciously happy in meetings.
          </p>
          <Stamp
            text="· FRESH · FUNNY · SLIGHTLY UNHINGED ·"
            center="🔥"
            color="pink"
            className="absolute -top-6 right-0 hidden h-24 w-24 sm:block"
          />
        </div>

        {/* Bento grid */}
        <div className="grid auto-rows-[150px] grid-cols-2 gap-4 md:auto-rows-[185px] md:grid-cols-4 md:gap-5 [grid-auto-flow:dense]">
          {CARDS.map((card) => (
            <BentoCard key={card.id} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
