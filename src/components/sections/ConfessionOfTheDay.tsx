import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Stamp from "@/components/ui/Stamp";
import { getFeaturedConfession, type Confession } from "@/lib/confessionsApi";

gsap.registerPlugin(ScrollTrigger);

type Color = "yellow" | "pink" | "blue" | "green" | "orange" | "purple";

const COLOR_MAP: Record<Color, { bg: string; edge: string; text: string }> = {
  yellow: { bg: "#fff3a3", edge: "#e6d97a", text: "#1b1c22" },
  pink: { bg: "#ffc6d4", edge: "#e597a9", text: "#1b1c22" },
  blue: { bg: "#c9e8f5", edge: "#9bc8de", text: "#1b1c22" },
  green: { bg: "#d4f0c4", edge: "#a3cd8e", text: "#1b1c22" },
  orange: { bg: "#ffe0c2", edge: "#e0b88e", text: "#1b1c22" },
  purple: { bg: "#ddd0f0", edge: "#b3a3d8", text: "#1b1c22" },
};

/* localStorage key — mirrors ConfessionWall's MINE_KEY */
const MINE_KEY = "osk.confessions.mine.v1";

function isMine(id: string): boolean {
  try {
    const raw = localStorage.getItem(MINE_KEY);
    if (!raw) return false;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.includes(id);
  } catch {
    return false;
  }
}

export default function ConfessionOfTheDay() {
  const root = useRef<HTMLDivElement>(null);
  const [confession, setConfession] = useState<Confession | null>(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cotd-reveal",
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
  }, [confession]);

  useEffect(() => {
    let cancelled = false;
    getFeaturedConfession().then((c) => {
      if (cancelled) return;
      setConfession(c);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Don't render anything if no confession exists (DB empty)
  if (!loading && !confession) return null;

  const col = confession
    ? COLOR_MAP[confession.color as Color] ?? COLOR_MAP.yellow
    : COLOR_MAP.yellow;
  const mine = confession ? isMine(confession.id) : false;

  return (
    <section
      id="cotd"
      ref={root}
      className="relative px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="cotd-reveal mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="inline-block rotate-[-3deg] font-hand text-2xl font-bold text-pink sm:text-3xl">
              ↳ today's most-witnessed confession
            </span>
            <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl">
              Confession
              <br />
              <span className="text-stroke-thick">of the Day</span>
            </h2>
          </div>
          <p className="max-w-sm font-body text-ink sm:text-right">
            The confession that resonated most in the last 24 hours.
            <span className="font-hand text-lg font-bold text-electric"> You're not alone.</span>
          </p>
          <Stamp
            text="· MOST WITNESSED · 24H ·"
            center="🏆"
            color="toxic"
            className="absolute -top-6 right-0 hidden h-24 w-24 sm:block"
          />
        </div>

        {/* Featured confession card */}
        <div className="cotd-reveal relative mx-auto max-w-2xl" style={{ perspective: "1000px" }}>
          {/* Tape strip */}
          <span
            aria-hidden
            className="absolute -top-3 left-1/2 z-20 h-7 w-24 -translate-x-1/2 rotate-1 rounded-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.55)",
              boxShadow: "0 1px 3px rgba(11,12,16,0.25)",
            }}
          />
          <motion.div
            initial={{ rotate: -2 }}
            whileHover={{ rotate: 0, y: -4 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="relative rounded-[2rem] border-[3px] border-jet p-7 shadow-brutal-xl sm:p-10"
            style={{
              backgroundColor: col.bg,
              color: col.text,
              boxShadow: "12px 12px 0 #0b0c10",
            }}
          >
            {/* Top-right fold corner */}
            <span
              aria-hidden
              className="absolute right-0 top-0 h-0 w-0"
              style={{
                borderTop: `18px solid ${col.edge}`,
                borderRight: "18px solid transparent",
              }}
            />

            {/* "★ yours" badge if it's the current user's confession */}
            {mine && (
              <span className="absolute -left-3 -top-3 z-10 rotate-[-6deg] rounded-full border-2 border-jet bg-jet px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-toxic shadow-[3px_3px_0_#fcf7f8]">
                ★ yours
              </span>
            )}

            {/* Meta row */}
            <div className="mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest opacity-60">
              <span>🏆 confession of the day</span>
              <span>·</span>
              <span>👁️ {confession?.witnessCount ?? 0} witnesses</span>
            </div>

            {/* The confession text */}
            {loading ? (
              <div className="flex min-h-[120px] items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="text-5xl"
                >
                  ⏳
                </motion.div>
              </div>
            ) : (
              <p className="font-hand text-3xl font-bold leading-tight sm:text-4xl">
                "{confession?.text}"
              </p>
            )}

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between border-t-2 border-current/20 pt-4">
              <span className="font-display text-sm font-extrabold uppercase tracking-wide">
                — {confession?.author ?? "anon"}
              </span>
              <a
                href="#/wall"
                data-hover="SEE MORE!"
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-jet bg-jet px-4 py-2 font-display text-xs font-bold uppercase tracking-tight text-cream shadow-[3px_3px_0_#fcf7f8] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#fcf7f8]"
              >
                see more on the wall →
              </a>
            </div>
          </motion.div>
        </div>

        {/* Footnote */}
        <p className="cotd-reveal mt-6 text-center font-hand text-base font-bold text-ink/60">
          ↳ refreshes daily. based on witness count from the last 24 hours.
        </p>
      </div>
    </section>
  );
}
