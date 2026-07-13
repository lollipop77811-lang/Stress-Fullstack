import { useEffect, useLayoutEffect, useRef, useState, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Stamp from "@/components/ui/Stamp";
import { cn } from "@/utils/cn";
import type { useAuth } from "@/hooks/useAuth";
import {
  listWhispers,
  createWhisper,
  witnessWhisper,
  type Whisper as ApiWhisper,
} from "@/lib/confessionsApi";

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   TYPING-REACTS — keyword responses + headline wobble
   The Whisper Wall headline reacts to what the user types.
   ============================================================ */

type KeywordResponse = {
  keywords: string[];
  subtitle: string;
  subtitleColor: string;
};

const KEYWORD_RESPONSES: KeywordResponse[] = [
  { keywords: ["alone"], subtitle: "you're not. 847 confessions say otherwise.", subtitleColor: "var(--color-toxic)" },
  { keywords: ["tired", "exhausted"], subtitle: "rest is valid. the wall will wait.", subtitleColor: "var(--color-toxic)" },
  { keywords: ["scared", "afraid", "anxious", "anxiety"], subtitle: "bravery is being scared and typing anyway.", subtitleColor: "var(--color-electric)" },
  { keywords: ["stress", "stressed", "overwhelmed"], subtitle: "we hear you. the bricks are listening.", subtitleColor: "var(--color-pink)" },
  { keywords: ["help"], subtitle: "💙 you matter. 988lifeline.org · text HOME to 741741", subtitleColor: "var(--color-electric)" },
  { keywords: ["fail", "failure", "failed"], subtitle: "failing is just data. the wall collects it.", subtitleColor: "var(--color-toxic)" },
  { keywords: ["hate"], subtitle: "the wall doesn't hate. it just holds.", subtitleColor: "var(--color-toxic)" },
  { keywords: ["can't", "cant", "cannot"], subtitle: "can't is just a tired 'not yet.' rest first.", subtitleColor: "var(--color-toxic)" },
  { keywords: ["nobody", "no one"], subtitle: "somebody is reading this wall right now. hi.", subtitleColor: "var(--color-toxic)" },
  { keywords: ["pretend", "pretending", "fake"], subtitle: "you can stop here. the wall doesn't pretend.", subtitleColor: "var(--color-toxic)" },
  { keywords: ["lost", "losing"], subtitle: "being lost means you're going somewhere new.", subtitleColor: "var(--color-electric)" },
  { keywords: ["give up", "giving up", "quit"], subtitle: "the wall has seen 'give up' before. they stayed. you can too.", subtitleColor: "var(--color-electric)" },
];

const DEFAULT_SUBTITLE = "Drop a secret. Strangers will witness it. Then it dissolves into the void.";
const DEFAULT_SUBTITLE_COLOR = "var(--color-toxic)";
const PAUSE_MSG = "take your time. the wall is patient.";

const LENGTH_NUDGES: { at: number; msg: string }[] = [
  { at: 100, msg: "↳ keep going. the wall is listening." },
  { at: 250, msg: "↳ that's real. the wall holds real things." },
  { at: 400, msg: "↳ almost there. one more breath." },
  { at: 500, msg: "↳ that's enough. the wall has it now." },
];

function getKeywordResponse(text: string): KeywordResponse | null {
  const lower = text.toLowerCase();
  // Use word-boundary matching to avoid false positives (e.g. "hate" in "that")
  for (const kr of KEYWORD_RESPONSES) {
    for (const kw of kr.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(lower)) return kr;
    }
  }
  return null;
}

function getLengthNudge(charCount: number): string | null {
  for (let i = LENGTH_NUDGES.length - 1; i >= 0; i--) {
    if (charCount >= LENGTH_NUDGES[i].at) return LENGTH_NUDGES[i].msg;
  }
  return null;
}

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
  id: string;
  text: string;
  mood: MoodId;
  witnesses: number;
  witnessed: boolean;
  createdAt: number; // epoch ms
  ttl: number; // ms remaining at createdAt (default 24h)
  dissolved: boolean;
  isMine?: boolean;
};

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

/* ---------- session id (for witness dedup on server) ---------- */

function getSessionId(): string {
  try {
    let id = localStorage.getItem("osk.sessionId.v1");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("osk.sessionId.v1", id);
    }
    return id;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
  }
}

/* Local set of whisper IDs this session has witnessed (for optimistic UI). */
const WITNESSED_KEY = "osk.whispers.witnessed.v1";
function loadWitnessedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(WITNESSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === "string"));
  } catch { /* ignore */ }
  return new Set();
}
function saveWitnessedSet(set: Set<string>) {
  try { localStorage.setItem(WITNESSED_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

/* ---------- component ---------- */

export default function WhisperWall({
  auth,
  onAuthClick,
}: {
  auth?: ReturnType<typeof useAuth>;
  onAuthClick?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [mood, setMood] = useState<MoodId>("wilt");
  const [text, setText] = useState("");
  const [whispers, setWhispers] = useState<Whisper[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // forces re-render for countdowns
  const sessionIdRef = useRef<string>(getSessionId());
  const witnessedRef = useRef<Set<string>>(loadWitnessedSet());

  // Auth gate: posting requires sign-in
  const requiresAuth = !!auth?.firebaseEnabled;
  const isLoggedIn = !!auth?.user && !!auth?.account;
  const authBlocked = requiresAuth && !isLoggedIn;

  // --- Typing-reacts state ---
  const [wobbleKey, setWobbleKey] = useState(0); // increments on each keystroke to trigger wobble
  const [panicMode, setPanicMode] = useState(false); // true when typing fast
  const [reactiveSubtitle, setReactiveSubtitle] = useState(DEFAULT_SUBTITLE);
  const [reactiveSubtitleColor, setReactiveSubtitleColor] = useState(DEFAULT_SUBTITLE_COLOR);
  const [lengthNudge, setLengthNudge] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const lastKeyTimeRef = useRef<number>(0);
  const keyDeltaRef = useRef<number>(300);
  const pauseTimerRef = useRef<number | null>(null);
  const keywordTimerRef = useRef<number | null>(null);

  // Headline letters for wobble — split "The Whisper Wall" into spans
  const headlineParts = [
    { text: "The Whisper", className: "text-cream" },
    { text: "Wall", className: "text-stroke-cream" },
  ];
  const headlineLetters = headlineParts.flatMap((part, partIdx) =>
    part.text.split("").map((ch, i) => ({
      key: `${partIdx}-${i}`,
      char: ch,
      className: part.className,
    }))
  );

  const handleTextChange = useCallback((newText: string) => {
    setText(newText.slice(0, charMax));
    setWobbleKey((k) => k + 1);
    setPaused(false);

    // Detect typing speed
    const now = Date.now();
    const delta = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;
    keyDeltaRef.current = delta;
    setPanicMode(delta < 120); // fast typing = panic

    // Length nudge
    setLengthNudge(getLengthNudge(newText.length));

    // Debounced keyword scan (500ms after user stops typing)
    if (keywordTimerRef.current) window.clearTimeout(keywordTimerRef.current);
    keywordTimerRef.current = window.setTimeout(() => {
      const kr = getKeywordResponse(newText);
      if (kr) {
        setReactiveSubtitle(kr.subtitle);
        setReactiveSubtitleColor(kr.subtitleColor);
      } else {
        setReactiveSubtitle(DEFAULT_SUBTITLE);
        setReactiveSubtitleColor(DEFAULT_SUBTITLE_COLOR);
      }
    }, 400);

    // Pause detection (3s of no typing)
    if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = window.setTimeout(() => {
      setPaused(true);
      setPanicMode(false);
    }, 3000);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
      if (keywordTimerRef.current) window.clearTimeout(keywordTimerRef.current);
    };
  }, []);

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

  /* Convert API whisper → local Whisper type */
  const apiToLocal = useCallback(
    (w: ApiWhisper): Whisper => {
      const createdAtMs = new Date(w.createdAt).getTime();
      const expiresAtMs = new Date(w.expiresAt).getTime();
      const ttl = Math.max(0, expiresAtMs - createdAtMs);
      const witnessed = witnessedRef.current.has(w.id);
      return {
        id: w.id,
        text: w.text,
        mood: w.mood as MoodId,
        witnesses: w.witnesses,
        witnessed,
        createdAt: createdAtMs,
        ttl,
        dissolved: w.dissolved,
        isMine: w.isMine,
      };
    },
    []
  );

  /* Fetch whispers from backend on mount + when auth state changes.
   * If logged in, merge the public feed with the user's own whispers
   * (cross-device sync — shows whispers from all their devices). */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const idToken = auth?.user ? await auth.user.getIdToken() : undefined;
        // Fetch public feed
        const pubRes = await listWhispers(idToken);
        let all = pubRes.whispers;

        // If logged in, also fetch user's own whispers (cross-device sync)
        if (idToken) {
          try {
            const mineRes = await listWhispers(idToken, true);
            // Merge: own whispers not already in the public feed
            const existingIds = new Set(all.map((w) => w.id));
            for (const w of mineRes.whispers) {
              if (!existingIds.has(w.id)) all.push(w);
            }
          } catch {
            // mine fetch failed — non-fatal, continue with public feed
          }
        }

        if (cancelled) return;
        // Sort by createdAt desc
        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWhispers(all.map(apiToLocal));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "couldn't reach the void.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [auth?.user, apiToLocal]);

  /* Countdown tick — every 1s */
  useEffect(() => {
    const i = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(i);
  }, []);

  /* Client-side cleanup: hide whispers whose TTL has fully expired.
   * The backend's MongoDB TTL index will delete them server-side, but
   * this keeps the UI tidy in real-time without waiting for a refetch. */
  useEffect(() => {
    setWhispers((prev) =>
      prev.filter((w) => {
        if (w.dissolved) return true; // keep dissolved (kind note) until refetch
        const rem = w.ttl - (Date.now() - w.createdAt);
        return rem > 0;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    // Auth gate — if sign-in required and user isn't logged in, open auth modal
    if (authBlocked) {
      onAuthClick?.();
      return;
    }
    if (!auth?.user) {
      setError("you need to be signed in to whisper.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const idToken = await auth.user.getIdToken();
      const result = await createWhisper(idToken, {
        text: t,
        mood,
        author: auth.account?.username,
      });
      // Optimistically add to the top of the list
      setWhispers((prev) => [apiToLocal(result.whisper), ...prev]);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't send whisper. try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const witness = async (id: string) => {
    // Optimistic UI update
    const wasWitnessed = witnessedRef.current.has(id);
    setWhispers((prev) =>
      prev.map((w) => {
        if (w.id !== id || w.dissolved) return w;
        return {
          ...w,
          witnesses: wasWitnessed ? w.witnesses - 1 : w.witnesses + 1,
          witnessed: !wasWitnessed,
        };
      })
    );

    // Update local witnessed set
    const newSet = new Set(witnessedRef.current);
    if (wasWitnessed) newSet.delete(id);
    else newSet.add(id);
    witnessedRef.current = newSet;
    saveWitnessedSet(newSet);

    // Sync with server
    try {
      const result = await witnessWhisper(id, sessionIdRef.current);
      // Server may have dissolved the whisper (threshold reached)
      setWhispers((prev) =>
        prev.map((w) => {
          if (w.id !== id) return w;
          return {
            ...w,
            witnesses: result.witnesses,
            witnessed: result.witnessed,
            dissolved: result.dissolved,
            text: result.dissolved ? result.text : w.text,
            mood: result.dissolved ? (result.mood as MoodId) : w.mood,
          };
        })
      );
    } catch (err) {
      // Roll back optimistic update
      const rollbackSet = new Set(witnessedRef.current);
      if (wasWitnessed) rollbackSet.add(id);
      else rollbackSet.delete(id);
      witnessedRef.current = rollbackSet;
      saveWitnessedSet(rollbackSet);
      setWhispers((prev) =>
        prev.map((w) => {
          if (w.id !== id || w.dissolved) return w;
          return {
            ...w,
            witnesses: wasWitnessed ? w.witnesses + 1 : w.witnesses - 1,
            witnessed: wasWitnessed,
          };
        })
      );
      setError("couldn't witness. try again.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const remaining = (w: Whisper): number =>
    w.dissolved ? 0 : Math.max(0, w.ttl - (Date.now() - w.createdAt));

  const charCount = text.length;
  const charMax = 500;

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
            <h2 className="mt-1 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl">
              {headlineLetters.map((letter, i) => (
                <motion.span
                  key={letter.key}
                  className={cn("inline-block", letter.className)}
                  animate={
                    wobbleKey > 0
                      ? {
                          y: panicMode
                            ? [0, -3, 2, -1, 0]
                            : [0, -6, 0],
                          rotate: panicMode
                            ? [0, -2, 2, -1, 0]
                            : [0, -4, 0],
                        }
                      : {}
                  }
                  transition={{
                    duration: panicMode ? 0.2 : 0.4,
                    ease: "easeOut",
                    delay: panicMode ? 0 : (i % 5) * 0.02,
                  }}
                >
                  {letter.char === " " ? "\u00A0" : letter.char}
                </motion.span>
              ))}
            </h2>
            {/* Tagline — stays below the headline */}
            <p className="mt-2 font-hand text-2xl font-bold text-pink sm:text-3xl">
              (raat gai baat gai)
            </p>
            {/* Reactive subtitle — changes based on what the user types */}
            <p className="mt-4 max-w-lg font-body text-base text-cream/70 sm:text-lg">
              <AnimatePresence mode="wait">
                <motion.span
                  key={reactiveSubtitle + paused}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="inline-block"
                >
                  {paused ? (
                    <span className="font-hand text-xl font-bold text-toxic">
                      {PAUSE_MSG}
                    </span>
                  ) : (
                    <>
                      {reactiveSubtitle}{" "}
                      <span
                        className="font-hand text-xl font-bold"
                        style={{ color: reactiveSubtitleColor }}
                      >
                        No usernames. No history. No vibe killer.
                      </span>
                    </>
                  )}
                </motion.span>
              </AnimatePresence>
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
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="whisper something. no one will know. (500 chars of pure release)"
                  rows={2}
                  data-hover="VENT"
                  className="w-full resize-none rounded-xl border-2 border-cream bg-ink px-4 py-3 font-body text-base font-medium text-cream shadow-[3px_3px_0_#fcf7f8] outline-none placeholder:text-cream/40 focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-[transform,box-shadow] duration-150"
                />
                <div className="mt-1.5 flex items-center justify-between px-1">
                  <span className="font-hand text-sm font-bold text-cream/60">
                    {lengthNudge || "yes, really anonymous. no, we won't tell."}
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
                disabled={!text.trim() || submitting || authBlocked}
                data-hover={authBlocked ? "SIGN IN!" : "SEND!"}
                whileHover={
                  text.trim() && !submitting && !authBlocked
                    ? { x: 4, y: 4, boxShadow: "0px 0px 0px #f72585" }
                    : undefined
                }
                whileTap={text.trim() && !submitting && !authBlocked ? { scale: 0.97 } : undefined}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-jet px-7 py-4 font-display text-base font-bold uppercase tracking-tight shadow-[6px_6px_0_#f72585] transition-[transform,box-shadow,opacity] duration-150 sm:text-lg",
                  text.trim() && !submitting && !authBlocked
                    ? "bg-toxic text-jet"
                    : authBlocked
                    ? "bg-jet text-toxic"
                    : "cursor-not-allowed bg-ink text-cream/40 opacity-70"
                )}
              >
                {submitting ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      ⏳
                    </motion.span>
                    Sending…
                  </>
                ) : authBlocked ? (
                  <>
                    <span>🔒</span>
                    Sign in to whisper →
                  </>
                ) : (
                  <>
                    <span className="animate-wiggle">📣</span>
                    Send into the void
                  </>
                )}
              </motion.button>
            </div>

            {/* Auth gate banner — shown when whispering requires sign-in */}
            {authBlocked && (
              <div className="mt-4 rounded-xl border-2 border-cream bg-jet px-4 py-3 text-cream shadow-[3px_3px_0_#f72585]">
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <p className="font-display text-xs font-extrabold uppercase tracking-widest text-toxic">
                      🔒 sign in required
                    </p>
                    <p className="mt-0.5 font-body text-sm text-cream/80">
                      you need an account to whisper. it stays anonymous — the account syncs your whispers across devices.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAuthClick?.()}
                    data-hover="JOIN!"
                    className="shrink-0 rounded-lg border-2 border-cream bg-toxic px-4 py-2 font-display text-xs font-bold uppercase tracking-tight text-jet shadow-sm transition-transform hover:-translate-y-0.5"
                  >
                    Sign in →
                  </button>
                </div>
              </div>
            )}

            {/* Error toast */}
            {error && (
              <p className="mt-3 font-hand text-sm font-bold text-pink">
                ⚠️ {error}
              </p>
            )}
          </div>
        </form>

        {/* Whispers grid */}
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="text-5xl"
            >
              ⏳
            </motion.span>
          </div>
        ) : whispers.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
            <span className="text-6xl mb-4">🌌</span>
            <p className="font-hand text-xl font-bold text-cream/70">
              the void is empty. be the first to whisper.
            </p>
          </div>
        ) : (
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
        )}

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
