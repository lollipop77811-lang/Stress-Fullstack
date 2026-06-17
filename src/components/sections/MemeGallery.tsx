import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/utils/cn";

gsap.registerPlugin(ScrollTrigger);

type Cat = "all" | "work" | "pets" | "wellness" | "chaos";

type Accent = "jet" | "toxic" | "electric" | "pink" | "cream";

type Meme = {
  id: number;
  emoji: string;
  top: string;
  bottom: string;
  cat: Exclude<Cat, "all">;
  accent: Accent;
};

const MEMES: Meme[] = [
  { id: 1, emoji: "💼", top: "MONDAY ME", bottom: "FRIDAY ALSO ME", cat: "work", accent: "jet" },
  { id: 2, emoji: "🐈", top: "I FILED FOR UNEMPLOYMENT", bottom: "GIVE ME THE TREATS", cat: "pets", accent: "pink" },
  { id: 3, emoji: "🧘", top: "INNER PEACE ACQUIRED", bottom: "MISPLACED IT 11 SECS LATER", cat: "wellness", accent: "toxic" },
  { id: 4, emoji: "🤖", top: "AI WILL REPLACE YOU", bottom: "OK BUT CAN IT DO MY LAUNDRY", cat: "chaos", accent: "electric" },
  { id: 5, emoji: "📋", top: "TO-DO LIST", bottom: "HAS FILED A RESTRAINING ORDER", cat: "work", accent: "cream" },
  { id: 6, emoji: "🐕", top: "DOG DOESN'T KNOW", bottom: "WHAT TAXES ARE. LUCKY.", cat: "pets", accent: "toxic" },
  { id: 7, emoji: "😴", top: "JUST FIVE MORE MINUTES", bottom: "IT'S BEEN 4 HOURS", cat: "chaos", accent: "pink" },
  { id: 8, emoji: "🍵", top: "DRINK WATER", bottom: "FORGET. REPEAT. DEHYDRATE.", cat: "wellness", accent: "electric" },
  { id: 9, emoji: "📅", top: "TUESDAY", bottom: "CANCELLING ITSELF. AGAIN.", cat: "work", accent: "jet" },
  { id: 10, emoji: "🐢", top: "SLOW AND STEADY", bottom: "WINS NOTHING. NAP WINS.", cat: "pets", accent: "cream" },
  { id: 11, emoji: "🌀", top: "I'M FINE", bottom: "(I AM NOT FINE)", cat: "wellness", accent: "pink" },
  { id: 12, emoji: "🔥", top: "THIS IS FINE", bottom: "SAID NOBODY EVER AT 3AM", cat: "chaos", accent: "toxic" },
];

const CATS: { id: Cat; label: string; emoji: string }[] = [
  { id: "all", label: "All", emoji: "✨" },
  { id: "work", label: "Work", emoji: "💼" },
  { id: "pets", label: "Pets", emoji: "🐾" },
  { id: "wellness", label: "Wellness", emoji: "🧘" },
  { id: "chaos", label: "Chaos", emoji: "🌀" },
];

const accentBox: Record<Accent, string> = {
  jet: "bg-jet text-cream",
  toxic: "bg-toxic text-jet",
  electric: "bg-electric text-cream",
  pink: "bg-pink text-cream",
  cream: "bg-cream text-jet",
};

export default function MemeGallery() {
  const root = useRef<HTMLDivElement>(null);
  const [cat, setCat] = useState<Cat>("all");
  const [open, setOpen] = useState<Meme | null>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".mg-reveal",
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

  // Lock scroll while lightbox is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const list = MEMES.filter((m) => cat === "all" || m.cat === cat);

  return (
    <section
      id="gallery"
      ref={root}
      className="relative px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mg-reveal relative mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="inline-block rotate-[-3deg] font-hand text-2xl font-bold text-pink sm:text-3xl">
              certified fresh nonsense ↴
            </span>
            <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl">
              The Meme
              <br />
              <span className="text-stroke-thick">Vault</span>
            </h2>
          </div>
          <p className="max-w-sm font-body text-ink sm:text-right">
            Tap any tile to enlarge, smirk, and silently judge. Filters exist
            but chaos is recommended.
          </p>
        </div>

        {/* Filters */}
        <div className="mg-reveal mb-8 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
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

        {/* Grid */}
        <motion.div
          layout
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {list.map((m) => (
              <motion.button
                layout
                key={m.id}
                onClick={() => setOpen(m)}
                data-hover="ZOOM"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                whileHover={{ y: -4, rotate: -1.5 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "group relative flex aspect-square flex-col items-center justify-between overflow-hidden rounded-2xl border-[3px] border-jet p-4 shadow-brutal transition-[box-shadow] duration-150 hover:shadow-brutal-lg",
                  accentBox[m.accent]
                )}
              >
                {/* top caption */}
                <span className="text-center font-display text-[11px] font-extrabold uppercase leading-tight tracking-tight sm:text-sm">
                  {m.top}
                </span>

                {/* emoji */}
                <span className="text-5xl drop-shadow-[3px_3px_0_rgba(11,12,16,0.25)] transition-transform duration-200 group-hover:scale-125 group-hover:rotate-6 sm:text-7xl">
                  {m.emoji}
                </span>

                {/* bottom caption */}
                <span className="text-center font-display text-[11px] font-extrabold uppercase leading-tight tracking-tight sm:text-sm">
                  {m.bottom}
                </span>

                {/* zoom hint */}
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-current bg-current/0 text-[10px] font-bold opacity-0 transition-opacity duration-200 group-hover:opacity-90">
                  ⤢
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* count */}
        <p className="mg-reveal mt-6 text-center font-hand text-lg font-bold text-ink/60">
          showing {list.length} / {MEMES.length} certified bangers · tap to zoom
        </p>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-[200] grid place-items-center bg-jet/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.7, rotate: -4, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.7, rotate: 4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "relative w-full max-w-md overflow-hidden rounded-[2rem] border-[3px] border-cream p-5 shadow-brutal-xl",
                accentBox[open.accent]
              )}
            >
              <button
                onClick={() => setOpen(null)}
                data-hover="CLOSE"
                aria-label="Close"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg border-2 border-current bg-current/0 text-lg font-bold transition-transform hover:rotate-90"
              >
                ✕
              </button>

              <span className="block text-center font-display text-base font-extrabold uppercase tracking-tight sm:text-xl">
                {open.top}
              </span>
              <span className="my-4 block text-center text-8xl drop-shadow-[5px_5px_0_rgba(11,12,16,0.3)] sm:text-9xl">
                {open.emoji}
              </span>
              <span className="block text-center font-display text-base font-extrabold uppercase tracking-tight sm:text-xl">
                {open.bottom}
              </span>

              <div className="mt-5 flex items-center justify-between border-t-2 border-dashed border-current/30 pt-4 text-[11px] font-bold uppercase tracking-widest opacity-70">
                <span>#{String(open.id).padStart(3, "0")}</span>
                <span>{open.cat}</span>
                <span>· lmao certified</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
