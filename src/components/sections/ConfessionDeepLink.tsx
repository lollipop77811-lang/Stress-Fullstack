import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Stamp from "@/components/ui/Stamp";
import ShareButtons from "@/components/ui/ShareButtons";
import CommentThread from "@/components/ui/CommentThread";
import { getConfessionById, type Confession } from "@/lib/confessionsApi";

gsap.registerPlugin(ScrollTrigger);

type Color = "yellow" | "pink" | "blue" | "green" | "orange" | "purple";

const COLOR_MAP: Record<Color, { bg: string; edge: string; tape: string; text: string }> = {
  yellow: { bg: "#fff3a3", edge: "#e6d97a", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  pink:   { bg: "#ffc6d4", edge: "#e597a9", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  blue:   { bg: "#c9e8f5", edge: "#9bc8de", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  green:  { bg: "#d4f0c4", edge: "#a3cd8e", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  orange: { bg: "#ffe0c2", edge: "#e0b88e", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  purple: { bg: "#ddd0f0", edge: "#b3a3d8", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
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

export default function ConfessionDeepLink({ id }: { id: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [confession, setConfession] = useState<Confession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cdl-reveal",
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
    setLoading(true);
    setNotFound(false);
    getConfessionById(id).then((c) => {
      if (cancelled) return;
      if (!c) {
        setNotFound(true);
      } else {
        setConfession(c);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <section
      id="confession-view"
      ref={root}
      className="relative min-h-screen overflow-hidden px-4 py-20 sm:px-6 sm:py-28"
      style={{ backgroundColor: "var(--color-cream)" }}
    >
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-20 top-10 hidden select-none font-display text-[26vw] font-extrabold leading-none text-jet/[0.04] lg:block">
          SHARED
        </div>
        <div className="absolute left-6 top-1/3 h-72 w-72 rounded-full bg-electric/20 blur-3xl" />
        <div className="absolute right-10 bottom-10 h-72 w-72 rounded-full bg-pink/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="cdl-reveal mb-10 text-center">
          <span className="inline-block rotate-[-3deg] font-hand text-2xl font-bold text-pink sm:text-3xl">
            ↳ someone shared this with you
          </span>
          <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.3em] text-electric">
            🔗 Shared Confession
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl">
            A Confession
            <br />
            <span className="text-stroke-thick">from the Wall</span>
          </h1>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="cdl-reveal flex min-h-[300px] items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="text-6xl"
            >
              ⏳
            </motion.div>
          </div>
        )}

        {/* Not found state */}
        {!loading && notFound && (
          <div className="cdl-reveal flex min-h-[300px] flex-col items-center justify-center text-center">
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="mb-6 text-8xl"
            >
              🗒️
            </motion.div>
            <h2 className="font-display text-3xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-5xl">
              This confession
              <br />
              <span className="text-stroke-thick">is gone.</span>
            </h2>
            <p className="mt-4 max-w-md font-hand text-xl font-bold text-ink/70">
              either it never existed, or the wall forgot it. the void is
              mysterious. try the live wall instead.
            </p>
            <a
              href="#/wall"
              data-hover="WALL!"
              className="mt-8 inline-flex items-center gap-2 rounded-xl border-2 border-jet bg-toxic px-7 py-4 font-display text-base font-bold uppercase tracking-tight text-jet shadow-brutal transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-brutal-lg"
            >
              <span>🧱</span>
              go to the wall →
            </a>
          </div>
        )}

        {/* The confession card */}
        {!loading && confession && (
          <ConfessionCard confession={confession} mine={isMine(confession.id)} />
        )}

        {/* Back-home CTAs */}
        {!loading && (
          <div className="cdl-reveal mt-10 flex flex-wrap justify-center gap-3">
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
              🧱 see more on the wall →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================
   ConfessionCard — the big featured sticky note
   ============================================================ */

function ConfessionCard({
  confession,
  mine,
}: {
  confession: Confession;
  mine: boolean;
}) {
  const col = COLOR_MAP[confession.color as Color] ?? COLOR_MAP.yellow;
  const date = new Date(confession.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="cdl-reveal relative" style={{ perspective: "1000px" }}>
      {/* Tape strip */}
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 z-20 h-7 w-24 -translate-x-1/2 rotate-1 rounded-sm"
        style={{
          backgroundColor: col.tape,
          boxShadow: "0 1px 3px rgba(11,12,16,0.25)",
        }}
      />
      <motion.div
        initial={{ rotate: -2 }}
        whileHover={{ rotate: 0, y: -4 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="relative overflow-hidden rounded-[2rem] border-[3px] border-jet p-8 shadow-brutal-xl sm:p-12"
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
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest opacity-60">
          <span>🔗 shared confession</span>
          <span>·</span>
          <span>👁️ {confession.witnessCount ?? 0} witnesses</span>
          {confession.isArchived && (
            <>
              <span>·</span>
              <span className="text-pink">📦 archived</span>
            </>
          )}
        </div>

        {/* The confession text — preserve the author's original whitespace
            (line breaks + multiple spaces) so it renders exactly as typed. */}
        <p className="whitespace-pre-wrap break-words font-hand text-3xl font-bold leading-tight sm:text-4xl">
          "{confession.text}"
        </p>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t-2 border-current/20 pt-4">
          <span className="font-display text-sm font-extrabold uppercase tracking-wide">
            — {confession.author}
          </span>
          <span className="font-hand text-base font-bold opacity-60">{date}</span>
        </div>

        {/* Share buttons */}
        <div className="mt-4 border-t-2 border-current/20 pt-4">
          <p className="mb-2 font-display text-[10px] font-extrabold uppercase tracking-widest opacity-60">
            ↳ share this confession
          </p>
          <ShareButtons
            text={confession.text}
            author={confession.author}
            id={confession.id}
          />
        </div>

        {/* Comment thread */}
        <CommentThread
          confessionId={confession.id}
          commentsEnabled={true}
        />
      </motion.div>

      {/* Floating stamp */}
      <div className="absolute -bottom-6 -right-4 hidden sm:block">
        <Stamp
          text="· SHARED · FROM THE WALL ·"
          center="🔗"
          color="toxic"
          className="h-24 w-24"
        />
      </div>
    </div>
  );
}
