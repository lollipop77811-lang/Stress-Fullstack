import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BRICK_BG } from "@/assets/brickBg";
import ShareButtons from "@/components/ui/ShareButtons";
import ReportModal from "@/components/ui/ReportModal";
import CommentThread from "@/components/ui/CommentThread";
import {
  listConfessions,
  witnessConfession,
  reportConfession,
  type Confession as UserConfession,
} from "@/lib/confessionsApi";

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   TYPES
   ============================================================ */

type Color = "yellow" | "pink" | "blue" | "green" | "orange" | "purple";
type Aging = "fresh" | "faded" | "torn" | "crumpled" | "old";

type Note = {
  /** Numeric id for seed notes (e.g. 4740); string Mongo id for user notes */
  id: number | string;
  text: string;
  author: string;
  color: Color;
  aging: Aging;
  top: number; // % within wall area
  left: number;
  rot: number; // deg
  w: number; // px width (varies for realism)
  /** True if this note was added by the current user (shows "★ yours" badge) */
  isMine?: boolean;
  /** Number of witnesses (from backend). 0 if not yet witnessed. */
  witnessCount?: number;
  /** True if the current browser session has already witnessed this note. */
  witnessed?: boolean;
  /** Internal: preferred grid slot (0..14) before collision resolution.
   *  May be reassigned by assignPositions/placeNoteAmong to avoid overlap. */
  preferredSlot?: number;
  /** Internal: per-note jitter within a slot (set once at creation). */
  jitterX?: number;
  jitterY?: number;
};

/* ============================================================
   GRID LAYOUT & COLLISION RESOLUTION
   The wall is a 5-col × 3-row grid (15 slots). Each note hashes to
   a preferred slot, but two notes can collide. assignPositions() and
   placeNoteAmong() move colliding notes to the nearest free slot so
   no two notes stick on top of each other.
   ============================================================ */

const GRID_COLS = 5;
const GRID_ROWS = 3;
const GRID_SLOTS = GRID_COLS * GRID_ROWS;
const COL_STEP = 18.5;
const ROW_STEP = 22;
const COL_START = 3;
const ROW_START = 28;

function slotToPos(slot: number, jitterX: number, jitterY: number) {
  const col = slot % GRID_COLS;
  const row = Math.floor(slot / GRID_COLS);
  return {
    left: COL_START + col * COL_STEP + jitterX,
    top: ROW_START + row * ROW_STEP + jitterY,
  };
}

/**
 * Reassign positions across a batch of notes so no two share a slot.
 * - Pass 1: each note keeps its preferred slot if free.
 * - Pass 2: colliding notes move to the nearest free slot.
 * - Pass 3: if the wall is full (>15 notes), extras stack on their
 *   preferred slot with extra random offset so they don't perfectly
 *   overlap.
 */
function assignPositions(notes: Note[]): Note[] {
  const result = notes.map((n) => ({ ...n }));
  const taken = new Array(GRID_SLOTS).fill(false);
  const extras: number[] = [];

  // Pass 1: greedy assignment by preferred slot
  for (let i = 0; i < result.length; i++) {
    const pref = result[i].preferredSlot ?? 0;
    if (pref >= 0 && pref < GRID_SLOTS && !taken[pref]) {
      taken[pref] = true;
    } else {
      extras.push(i);
    }
  }

  // Pass 2: for each extra, find the nearest free slot
  const stillExtras: number[] = [];
  for (const i of extras) {
    const pref = result[i].preferredSlot ?? 0;
    let found = -1;
    for (let dist = 1; dist < GRID_SLOTS && found === -1; dist++) {
      const lo = pref - dist;
      const hi = pref + dist;
      if (lo >= 0 && !taken[lo]) found = lo;
      else if (hi < GRID_SLOTS && !taken[hi]) found = hi;
    }
    if (found !== -1) {
      taken[found] = true;
      result[i].preferredSlot = found;
      const pos = slotToPos(found, result[i].jitterX ?? 0, result[i].jitterY ?? 0);
      result[i].left = pos.left;
      result[i].top = pos.top;
    } else {
      stillExtras.push(i);
    }
  }

  // Pass 3: stack extras on preferred slot with larger offset
  for (const i of stillExtras) {
    result[i].left += (Math.random() - 0.5) * 24;
    result[i].top += (Math.random() - 0.5) * 16;
  }

  return result;
}

/**
 * Place a single new note among existing ones WITHOUT moving existing
 * notes. Returns a copy of newNote with an adjusted position that avoids
 * collisions. Used when a fresh confession lands on the wall so it never
 * sticks on top of an existing one.
 */
function placeNoteAmong(existing: Note[], newNote: Note): Note {
  const taken = new Array(GRID_SLOTS).fill(false);
  for (const n of existing) {
    const slot = n.preferredSlot ?? 0;
    if (slot >= 0 && slot < GRID_SLOTS) taken[slot] = true;
  }

  const pref = newNote.preferredSlot ?? 0;
  let finalSlot = pref;
  let isExtra = false;

  if (taken[pref]) {
    let found = -1;
    for (let dist = 1; dist < GRID_SLOTS && found === -1; dist++) {
      const lo = pref - dist;
      const hi = pref + dist;
      if (lo >= 0 && !taken[lo]) found = lo;
      else if (hi < GRID_SLOTS && !taken[hi]) found = hi;
    }
    if (found !== -1) {
      finalSlot = found;
    } else {
      // Wall is full — stack on preferred slot with extra offset
      isExtra = true;
    }
  }

  const jx = newNote.jitterX ?? 0;
  const jy = newNote.jitterY ?? 0;
  const pos = slotToPos(finalSlot, jx, jy);

  return {
    ...newNote,
    preferredSlot: finalSlot,
    left: pos.left + (isExtra ? (Math.random() - 0.5) * 24 : 0),
    top: pos.top + (isExtra ? (Math.random() - 0.5) * 16 : 0),
  };
}

/* ============================================================
   STICKY NOTE COLORS (Post-it palette)
   ============================================================ */

const COLOR_MAP: Record<
  Color,
  { bg: string; edge: string; tape: string; text: string }
> = {
  yellow: { bg: "#fff3a3", edge: "#e6d97a", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  pink:   { bg: "#ffc6d4", edge: "#e597a9", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  blue:   { bg: "#c9e8f5", edge: "#9bc8de", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  green:  { bg: "#d4f0c4", edge: "#a3cd8e", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  orange: { bg: "#ffe0c2", edge: "#e0b88e", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
  purple: { bg: "#ddd0f0", edge: "#b3a3d8", tape: "rgba(255,255,255,0.55)", text: "#1b1c22" },
};

/* ============================================================
   BRICK WALL BACKGROUND — authentic weathered red brick
   Matches reference: running bond, #c24b3e dominant, #d05a3f
   burnt orange, #6b2c1e dark, #e8b8b0 faded, #e8d9c0 mortar,
   with random soot stains and color variation per brick.
   ============================================================ */

// BRICK_BG is imported from @/assets/brickBg (auto-generated by
// scripts/gen_brick_bg.py as a base64-encoded SVG data URL — more
// reliable than the inline ;utf8, form across browsers).

/* ============================================================
   AGING EFFECTS — applied per sticky note
   ============================================================ */

function agingStyle(aging: Aging): {
  filter?: string;
  clipPath?: string;
  opacity?: number;
  extraShadow?: string;
  overlay?: string; // a CSS background for crumpled folds / yellowing
} {
  switch (aging) {
    case "faded":
      // Sun-bleached — heavily desaturated + washed out
      return {
        filter: "saturate(0.2) brightness(1.18) contrast(0.85)",
        opacity: 0.75,
        extraShadow: "5px 7px 0 rgba(11,12,16,0.4)",
        overlay:
          "radial-gradient(ellipse at center, rgba(255,255,255,0.18) 0%, transparent 70%)",
      };
    case "torn":
      // Torn — LARGE jagged chunks missing from top-right and bottom-left
      return {
        clipPath:
          "polygon(0 6%, 55% 0, 62% 8%, 72% 2%, 82% 10%, 92% 4%, 100% 12%, 100% 88%, 78% 96%, 68% 100%, 58% 92%, 42% 100%, 32% 90%, 18% 96%, 8% 88%, 0 94%)",
        extraShadow: "5px 7px 0 rgba(11,12,16,0.4)",
      };
    case "crumpled":
      // Crumpled — heavy folds + desaturation + THICK visible crease lines
      return {
        filter: "contrast(1.3) saturate(0.6) brightness(0.88)",
        extraShadow:
          "6px 6px 0 rgba(11,12,16,0.45), inset 8px 8px 14px rgba(11,12,16,0.35), inset -6px -6px 12px rgba(255,255,255,0.35)",
        overlay:
          "repeating-linear-gradient(125deg, rgba(11,12,16,0.22) 0px, rgba(11,12,16,0.22) 3px, transparent 3px, transparent 14px), repeating-linear-gradient(55deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 3px, transparent 3px, transparent 18px), radial-gradient(ellipse at 30% 40%, rgba(11,12,16,0.2) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(11,12,16,0.18) 0%, transparent 45%)",
      };
    case "old":
      // Old/yellowed — strong sepia + dark edge vignette + brown spots
      return {
        filter: "sepia(0.75) saturate(0.55) brightness(0.88) contrast(1.08)",
        opacity: 0.85,
        extraShadow: "5px 6px 0 rgba(11,12,16,0.5)",
        overlay:
          "radial-gradient(ellipse at center, transparent 30%, rgba(74,44,30,0.38) 100%), radial-gradient(circle at 25% 30%, rgba(74,44,30,0.22) 0%, transparent 12%), radial-gradient(circle at 75% 70%, rgba(74,44,30,0.18) 0%, transparent 10%)",
      };
    case "fresh":
    default:
      return {};
  }
}

/* ============================================================
   COMPONENT
   ============================================================ */

/* localStorage key for tracking which confession IDs are the current
 * user's (so the "★ yours" badge persists across refreshes). */
const MINE_KEY = "osk.confessions.mine.v1";

function loadMine(): Set<string> {
  try {
    const raw = localStorage.getItem(MINE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveMine(set: Set<string>) {
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

/* localStorage key for tracking which confessions the current browser
 * session has witnessed (for the witness button dedup). */
const WITNESSED_KEY = "osk.confessions.witnessed.v1";
/* localStorage key for the session ID (used as the dedup key on the
 * server — one witness per browser session per confession). */
const SESSION_KEY = "osk.sessionId.v1";

function loadWitnessed(): Set<string> {
  try {
    const raw = localStorage.getItem(WITNESSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveWitnessed(set: Set<string>) {
  try {
    localStorage.setItem(WITNESSED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
  }
}

/* localStorage key for tracking which confessions the current session
 * has reported (for the report button dedup UI). */
const REPORTED_KEY = "osk.confessions.reported.v1";

function loadReported(): Set<string> {
  try {
    const raw = localStorage.getItem(REPORTED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveReported(set: Set<string>) {
  try {
    localStorage.setItem(REPORTED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

/**
 * Convert a user confession fetched from the API into a Note the wall
 * can render. Positions are assigned deterministically by hashing the
 * confession id so the same note always lands in the same spot.
 */
function userConfessionToNote(
  c: UserConfession,
  isMine: boolean,
  witnessed: boolean
): Note {
  // Hash the id → 0..1 for position & rotation
  const str = typeof c.id === "string" ? c.id : String(c.id);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  const rand = (seed: number) => ((h ^ (seed * 2654435761)) >>> 0) / 4294967296;

  // Distribute across 5 cols × 3 rows, like seed notes
  const preferredSlot = Math.floor(rand(1) * GRID_SLOTS);
  const jitterX = (rand(2) - 0.5) * 12;
  const jitterY = (rand(3) - 0.5) * 8;
  const col = preferredSlot % GRID_COLS;
  const row = Math.floor(preferredSlot / GRID_COLS);
  const left = COL_START + col * COL_STEP + jitterX;
  const top = ROW_START + row * ROW_STEP + jitterY;
  const rot = (rand(4) - 0.5) * 18;
  const w = 150 + Math.floor(rand(5) * 60);

  return {
    id: c.id,
    text: c.text,
    author: c.author,
    color: c.color as Color,
    aging: c.aging as Aging,
    top,
    left,
    rot,
    w,
    isMine,
    witnessCount: c.witnessCount ?? 0,
    witnessed,
    preferredSlot,
    jitterX,
    jitterY,
  };
}

export default function ConfessionWall({
  wallIdx,
  displayN,
  totalWalls,
  onNavigate,
  onNewConfession,
}: {
  /** Internal 0-indexed wall index (oldest-first, used for API calls) */
  wallIdx: number;
  /** Display number (1-indexed, 1 = newest). Shown in the UI. */
  displayN: number;
  /** Total number of walls that exist. */
  totalWalls: number;
  /** Navigate to a different wall by displayN (1 = newest). Updates the URL. */
  onNavigate: (nextDisplayN: number) => void;
  /** Called when a new user confession is created (lifted to parent so
   *  the composer can trigger it). Receives the new confession. */
  onNewConfession: (cb: (c: UserConfession) => void) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [open, setOpen] = useState<Note | null>(null);
  const [, setDragHint] = useState(true);

  // User confessions fetched from the backend (per wall)
  const [userNotes, setUserNotes] = useState<Note[]>([]);
  // Loading state for the initial fetch
  const [loading, setLoading] = useState(true);
  // Set of confession IDs (as strings) that the current user has posted
  const [mine, setMine] = useState<Set<string>>(() => loadMine());
  // Set of confession IDs this browser session has witnessed (for dedup UI)
  const [witnessed, setWitnessed] = useState<Set<string>>(() => loadWitnessed());
  // Stable session ID for witness dedup on the server
  const sessionIdRef = useRef<string>(getSessionId());
  // Set of confession IDs the current session has reported (for dedup UI)
  const [reported, setReported] = useState<Set<string>>(() => loadReported());
  // The note currently being reported (opens the report modal)
  const [reportingNote, setReportingNote] = useState<Note | null>(null);
  // The note currently in flight (composer → wall). When set, a FlyingNote
  // portal is rendered; on landing it's swapped for a real wall note.
  const [flyingNote, setFlyingNote] = useState<{
    note: Note;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
  } | null>(null);

  /* Register the new-confession handler with the parent so the composer
   * can call it. Orchestrates the flying-note animation:
   *   1. Update `mine` + localStorage
   *   2. If reduced-motion: just add the note + scroll
   *   3. Else: scroll to wall → wait → spawn flying note → on landing,
   *      add to userNotes + dust puffs + wall shake
   */
  useEffect(() => {
    onNewConfession((c: UserConfession) => {
      const idStr = String(c.id);
      const newMine = new Set(mine);
      newMine.add(idStr);
      setMine(newMine);
      saveMine(newMine);

      // If the confession landed on a different wall (auto-spawned because
      // this wall was full), navigate to the NEWEST wall (displayN=1).
      // The new wall is always the newest, so displayN=1 is where it landed.
      if (c.wallIdx !== wallIdx) {
        onNavigate(1);
        return;
      }

      const rawNote = userConfessionToNote(c, true, false);
      // Pick a free slot so the new note doesn't stick on an existing one.
      // Reads current userNotes (closure) — fine because no other notes are
      // added during the flight.
      const futureNote = placeNoteAmong(userNotes, rawNote);
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReduced) {
        // Skip the flight — just add the note + scroll
        setUserNotes((prev) => [futureNote, ...prev]);
        document.getElementById("wall")?.scrollIntoView({ behavior: "smooth" });
        return;
      }

      // Smooth-scroll to the wall first so the user can see the landing
      document.getElementById("wall")?.scrollIntoView({ behavior: "smooth" });

      // Wait for scroll to settle, then spawn the flying note
      window.setTimeout(() => {
        const composerEl = document.querySelector("[data-composer-card]");
        const wallArea = root.current?.querySelector(
          ".relative.h-full.w-full"
        ) as HTMLElement | null;

        if (!composerEl || !wallArea) {
          // Fallback: just add the note
          setUserNotes((prev) => [futureNote, ...prev]);
          return;
        }

        const composerRect = composerEl.getBoundingClientRect();
        const wallRect = wallArea.getBoundingClientRect();

        // Source: top-center of the composer card
        const sourceX = composerRect.left + composerRect.width / 2;
        const sourceY = composerRect.top + 20;

        // Target: the note's deterministic position on the wall
        const targetX = wallRect.left + (futureNote.left / 100) * wallRect.width;
        const targetY = wallRect.top + (futureNote.top / 100) * wallRect.height;

        setFlyingNote({
          note: futureNote,
          sourceX,
          sourceY,
          targetX,
          targetY,
        });
      }, 450);
    });
  }, [wallIdx, mine, onNewConfession]);

  /* Clean up flying note if wall changes mid-flight */
  useEffect(() => {
    setFlyingNote(null);
  }, [wallIdx]);

  /** Called when the FlyingNote finishes its animation. Swaps it for the
   *  real wall note + triggers dust puffs + wall shake. */
  function handleFlyingNoteLanded() {
    if (!flyingNote) return;
    setUserNotes((prev) => [flyingNote.note, ...prev]);
    spawnDustPuffs(flyingNote.targetX, flyingNote.targetY);
    shakeWall();
    setFlyingNote(null);
  }

  /** Spawn 5 dust-puff particles at the landing point. */
  function spawnDustPuffs(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      const p = document.createElement("div");
      p.style.cssText = `
        position: fixed;
        width: 8px; height: 8px;
        background: rgba(252,247,248,0.7);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9998;
        left: ${x + (Math.random() - 0.5) * 60}px;
        top: ${y + (Math.random() - 0.5) * 20}px;
      `;
      document.body.appendChild(p);
      const dx = (Math.random() - 0.5) * 80;
      const dy = -20 - Math.random() * 30;
      p.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 0.9 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0 },
        ],
        { duration: 600, easing: "ease-out" }
      );
      window.setTimeout(() => p.remove(), 650);
    }
  }

  /** Subtle 2px wall shake on landing. */
  function shakeWall() {
    const el = root.current;
    if (!el) return;
    el.animate(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-2px,1px)" },
        { transform: "translate(2px,-1px)" },
        { transform: "translate(-1px,2px)" },
        { transform: "translate(0,0)" },
      ],
      { duration: 200, easing: "ease-out" }
    );
  }

  /** Witness a confession: optimistic +1, send to API, sync on response. */
  async function handleWitness(noteId: string | number) {
    const idStr = String(noteId);
    if (witnessed.has(idStr)) return; // already witnessed — no-op

    // Optimistic: immediately mark as witnessed + bump count in local state
    const newWitnessed = new Set(witnessed);
    newWitnessed.add(idStr);
    setWitnessed(newWitnessed);
    saveWitnessed(newWitnessed);

    setUserNotes((prev) =>
      prev.map((n) =>
        String(n.id) === idStr
          ? {
              ...n,
              witnessed: true,
              witnessCount: (n.witnessCount ?? 0) + 1,
            }
          : n
      )
    );

    try {
      await witnessConfession(idStr, sessionIdRef.current);
      // Success — optimistic state is correct, nothing more to do
    } catch (err) {
      // Roll back on failure
      console.warn("[witness] failed, rolling back:", err);
      const rolledBack = new Set(witnessed);
      rolledBack.delete(idStr);
      setWitnessed(rolledBack);
      saveWitnessed(rolledBack);
      setUserNotes((prev) =>
        prev.map((n) =>
          String(n.id) === idStr
            ? {
                ...n,
                witnessed: false,
                witnessCount: Math.max(0, (n.witnessCount ?? 1) - 1),
              }
            : n
        )
      );
    }
  }

  /** Submit a report for the currently-reporting note. */
  async function handleReportSubmit(
    reason: "spam" | "hate" | "self-harm" | "doxxing" | "other"
  ) {
    if (!reportingNote) return;
    const idStr = String(reportingNote.id);
    if (reported.has(idStr)) return;

    // Optimistic: mark as reported locally
    const newReported = new Set(reported);
    newReported.add(idStr);
    setReported(newReported);
    saveReported(newReported);

    try {
      const result = await reportConfession(idStr, sessionIdRef.current, reason);
      // If the confession was auto-hidden, remove it from the wall
      if (result.isHidden) {
        setUserNotes((prev) => prev.filter((n) => String(n.id) !== idStr));
      }
      // Close the report modal + close the enlarge modal if open
      setReportingNote(null);
      if (open && String(open.id) === idStr) setOpen(null);
    } catch (err) {
      console.warn("[report] failed, rolling back:", err);
      const rolledBack = new Set(reported);
      rolledBack.delete(idStr);
      setReported(rolledBack);
      saveReported(rolledBack);
    }
  }

  /* Fetch user confessions whenever wallIdx changes */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listConfessions(wallIdx).then((list) => {
      if (cancelled) return;
      const rawNotes = list.map((c) =>
        userConfessionToNote(c, mine.has(String(c.id)), witnessed.has(String(c.id)))
      );
      // Resolve slot collisions so no two notes overlap
      const notes = assignPositions(rawNotes);
      setUserNotes(notes);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [wallIdx, mine, witnessed]);

  /* GSAP reveal of header on first mount */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cw-reveal",
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

  /* GSAP sticky-note reveal whenever wall changes.
   * Animates a wrapper class (.sticky-wrap) so the inner .sticky-note
   * keeps its own inline opacity/filter/clipPath from agingStyle. */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".sticky-wrap",
        { opacity: 0, scale: 0.6, y: -20 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.04,
          ease: "back.out(1.5)",
          clearProps: "opacity,transform",
        }
      );
    }, root);
    return () => ctx.revert();
  }, [wallIdx]);

  /* Modal: lock scroll + Esc to close */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* Right-arrow & 'd' key advance to next wall */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      if (e.key === "ArrowRight" || e.key === "d") goNext();
      if (e.key === "ArrowLeft" || e.key === "a") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, wallIdx]);

  // Navigation is reverse-chronological: displayN=1 is newest, displayN=totalWalls is oldest.
  // Next = older (higher displayN), Prev = newer (lower displayN, toward 1).
  const canGoNext = displayN < totalWalls; // can go to an older wall
  const canGoPrev = displayN > 1;          // can go to a newer wall

  const goNext = () => {
    if (!canGoNext) return; // already on the oldest wall
    setDirection(1);
    onNavigate(displayN + 1);
    setDragHint(false);
  };
  const goPrev = () => {
    if (!canGoPrev) return; // already on the newest wall (displayN=1)
    setDirection(-1);
    onNavigate(displayN - 1);
    setDragHint(false);
  };

  /* Swipe handler — Tinder-style right swipe advances */
  const onDragEnd = (_e: unknown, info: PanInfo) => {
    const threshold = 80;
    if (info.offset.x > threshold && Math.abs(info.offset.y) < 120) {
      goNext();
    } else if (info.offset.x < -threshold && Math.abs(info.offset.y) < 120) {
      goPrev();
    }
  };

  return (
    <section
      id="wall"
      ref={root}
      className="relative h-screen w-full overflow-hidden"
      style={{
        backgroundColor: "#8b3a2b",
        backgroundImage: BRICK_BG,
        backgroundSize: "375px 108px",
        backgroundRepeat: "repeat",
      }}
    >
      {/* Subtle vignette for drama + readability */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(11,12,16,0) 40%, rgba(11,12,16,0.55) 100%)",
        }}
      />

      {/* Header — compact, fixed at top of viewport.
       * All 5 walls share the SAME title: "WALL OF CONFESSION".
       * The wall-counter badge shows which wall you're currently on. */}
      <header className="cw-reveal absolute left-0 right-0 top-0 z-30 px-4 pt-5 text-center sm:pt-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-center gap-3">
            <span className="inline-block rotate-[-2deg] rounded-full border-2 border-cream bg-pink px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-widest text-cream shadow-[3px_3px_0_#0b0c10] sm:text-xs">
              📌 wall {displayN} / {totalWalls}
            </span>
          </div>
          <h2 className="mt-2 font-display text-3xl font-extrabold uppercase leading-[0.9] tracking-tight text-cream drop-shadow-[3px_3px_0_rgba(11,12,16,0.6)] sm:text-5xl">
            Wall of
            <br />
            <span className="text-toxic">Confession</span>
          </h2>
        </div>
      </header>

      {/* Swipe-able wall area (fits the screen) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragEnd={onDragEnd}
        className="absolute inset-0 z-10"
        style={{ cursor: "grab" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={wallIdx}
            initial={{ opacity: 0, x: direction * 80, rotate: direction * 1.5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: direction * -80, rotate: direction * -1.5 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="relative h-full w-full"
          >
            {/* Loading state */}
            {loading && (
              <div className="flex h-full items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="text-6xl"
                >
                  ⏳
                </motion.div>
              </div>
            )}

            {/* Empty state — no confessions on this wall yet */}
            {!loading && userNotes.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <motion.div
                  animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="mb-6 text-8xl"
                >
                  🗒️
                </motion.div>
                <h3 className="font-display text-2xl font-extrabold uppercase leading-[0.9] tracking-tight text-cream drop-shadow-[2px_2px_0_rgba(11,12,16,0.6)] sm:text-4xl">
                  This wall is fresh.
                </h3>
                <p className="mt-4 max-w-md font-hand text-xl font-bold text-cream/80 drop-shadow-[1px_1px_0_rgba(11,12,16,0.7)]">
                  be the first to pin something here. the bricks are listening.
                </p>
                <button
                  onClick={() => document.getElementById("composer")?.scrollIntoView({ behavior: "smooth" })}
                  data-hover="WRITE!"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl border-2 border-jet bg-toxic px-7 py-4 font-display text-base font-bold uppercase tracking-tight text-jet shadow-[6px_6px_0_#0b0c10] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#0b0c10] sm:text-lg"
                >
                  <span className="animate-wiggle">✍️</span>
                  Write the first confession →
                </button>
              </div>
            )}

            {/* User confession sticky notes */}
            {!loading && userNotes.length > 0 && userNotes.map((n) => {
              const col = COLOR_MAP[n.color];
              const ag = agingStyle(n.aging);
              const style: CSSProperties = {
                top: `${n.top}%`,
                left: `${n.left}%`,
                width: `${n.w}px`,
                backgroundColor: col.bg,
                color: col.text,
                transform: `rotate(${n.rot}deg)`,
                boxShadow: ag.extraShadow
                  ? ag.extraShadow
                  : "6px 6px 0 rgba(11,12,16,0.45), 0 2px 4px rgba(11,12,16,0.3)",
                filter: ag.filter,
                opacity: ag.opacity,
                clipPath: ag.clipPath,
              };
              return (
                <div
                  key={n.id}
                  className="sticky-wrap absolute"
                  style={{ top: style.top, left: style.left, width: style.width }}
                >
                  <motion.button
                    onClick={() => setOpen(n)}
                    data-hover="READ"
                    aria-label={`Open confession #${n.id}`}
                    initial={false}
                    whileHover={{ scale: 1.1, rotate: n.rot * 0.4, zIndex: 50 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 320, damping: 20 }}
                    className="sticky-note group relative block w-full cursor-pointer p-3 text-left"
                    style={{
                      ...style,
                      top: undefined,
                      left: undefined,
                      // keep width 100% so the wrapper controls sizing
                      width: "100%",
                    }}
                  >
                    {/* Aging overlay (crumpled folds / yellowing vignette) */}
                    {ag.overlay && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{ background: ag.overlay }}
                      />
                    )}
                    {/* Tape strip */}
                    <span
                      aria-hidden
                      className="absolute -top-2 left-1/2 h-5 w-12 -translate-x-1/2 rotate-1 rounded-sm"
                      style={{
                        backgroundColor: col.tape,
                        boxShadow: "0 1px 2px rgba(11,12,16,0.2)",
                      }}
                    />
                    {/* Top-right fold corner (only on non-torn) */}
                    {n.aging !== "torn" && (
                      <span
                        aria-hidden
                        className="absolute right-0 top-0 h-0 w-0"
                        style={{
                          borderTop: `12px solid ${col.edge}`,
                          borderRight: "12px solid transparent",
                        }}
                      />
                    )}

                    {/* "★ yours" badge — only on notes the current user posted */}
                    {n.isMine && (
                      <span className="absolute -left-2 -top-2 z-10 rotate-[-6deg] rounded-full border-2 border-jet bg-jet px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-toxic shadow-[2px_2px_0_#fcf7f8]">
                        ★ yours
                      </span>
                    )}

                    {/* Truncated confession text */}
                    <p className="relative line-clamp-5 font-hand text-sm font-bold leading-snug sm:text-base">
                      {n.text}
                    </p>

                    {/* Footer — author + witness button */}
                    <div className="relative mt-2 flex items-center justify-between gap-1.5 border-t border-current/20 pt-1.5">
                      <span className="truncate text-[9px] font-bold uppercase tracking-wide opacity-60">
                        — {n.author}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWitness(n.id);
                          }}
                          disabled={n.witnessed}
                          data-hover={n.witnessed ? "SEEN" : "WITNESS"}
                          aria-label={n.witnessed ? "Already witnessed" : "Witness this confession"}
                          className={
                            "inline-flex items-center gap-1 rounded-full border border-current px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide transition-[transform,opacity,background-color] duration-150 " +
                            (n.witnessed
                              ? "opacity-50 cursor-default"
                              : "hover:scale-110 hover:bg-current/10")
                          }
                        >
                          <span>👁️</span>
                          <span className="tabular-nums">{n.witnessCount ?? 0}</span>
                        </button>
                        {/* Report button — only on user confessions (string id) */}
                        {typeof n.id === "string" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportingNote(n);
                            }}
                            disabled={reported.has(String(n.id))}
                            data-hover={reported.has(String(n.id)) ? "SENT" : "REPORT"}
                            aria-label={reported.has(String(n.id)) ? "Already reported" : "Report this confession"}
                            className={
                              "inline-flex items-center gap-0.5 rounded-full border border-current px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide transition-[transform,opacity] duration-150 " +
                              (reported.has(String(n.id))
                                ? "opacity-30 cursor-default"
                                : "hover:scale-110")
                            }
                          >
                            🚩
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hover hint */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-2 whitespace-nowrap rounded border border-current bg-current/0 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest opacity-0 transition-opacity duration-200 group-hover:opacity-90"
                    >
                      tap to enlarge
                    </span>
                  </motion.button>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Drag hint (first interaction) */}
      {/* Bottom-center nav: prev / next + wall counter */}
      <div className="cw-reveal absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">
        <button
          onClick={goPrev}
          disabled={!canGoPrev}
          data-hover="PREV"
          aria-label="Previous wall"
          className="grid h-11 w-11 place-items-center rounded-xl border-2 border-cream bg-jet text-cream shadow-[3px_3px_0_#fcf7f8] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#fcf7f8] active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_#fcf7f8]"
        >
          ←
        </button>

        {/* Wall counter — shows current wall number / total walls */}
        <div className="flex items-center gap-1.5 rounded-full border-2 border-cream bg-jet px-4 py-2 font-display text-xs font-extrabold uppercase tracking-widest text-cream shadow-[3px_3px_0_#fcf7f8]">
          <span className="text-toxic">{displayN}</span>
          <span className="opacity-50">/</span>
          <span className="opacity-70">{totalWalls}</span>
        </div>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          data-hover="NEXT"
          aria-label="Next wall"
          className="grid h-11 w-11 place-items-center rounded-xl border-2 border-cream bg-jet text-cream shadow-[3px_3px_0_#fcf7f8] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#fcf7f8] active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_#fcf7f8]"
        >
          →
        </button>
      </div>

      {/* Back-home CTA — top-left */}
      <a
        href="#top"
        data-hover="BACK!"
        className="cw-reveal absolute left-4 top-6 z-30 inline-flex items-center gap-1.5 rounded-xl border-2 border-cream bg-jet px-3 py-2 font-display text-xs font-bold uppercase tracking-tight text-cream shadow-[3px_3px_0_#fcf7f8] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#fcf7f8]"
      >
        ← home
      </a>

      {/* Top-right CTA cluster: "My Confessions" + "Write yours" */}
      <div className="cw-reveal absolute right-4 top-6 z-30 flex flex-wrap items-center justify-end gap-2">
        {/* My Confessions — opens #/mine route showing all user's confessions */}
        <a
          href="#/mine"
          data-hover="MINE!"
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-cream bg-pink px-3 py-2 font-display text-xs font-bold uppercase tracking-tight text-cream shadow-[3px_3px_0_#0b0c10] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#0b0c10]"
        >
          ★ my confessions
        </a>
        {/* Write your own — scrolls down to the composer */}
        <button
          onClick={() => document.getElementById("composer")?.scrollIntoView({ behavior: "smooth" })}
          data-hover="WRITE!"
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-jet bg-toxic px-3 py-2 font-display text-xs font-bold uppercase tracking-tight text-jet shadow-[3px_3px_0_#0b0c10] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#0b0c10]"
        >
          ✍️ write yours ↓
        </button>
      </div>

      {/* Flying note portal — rendered to document.body so it's not clipped
          by the wall's overflow:hidden. Animates from composer to wall. */}
      {flyingNote &&
        createPortal(
          <FlyingNote
            key={String(flyingNote.note.id)}
            note={flyingNote.note}
            sourceX={flyingNote.sourceX}
            sourceY={flyingNote.sourceY}
            targetX={flyingNote.targetX}
            targetY={flyingNote.targetY}
            onLanded={handleFlyingNoteLanded}
          />,
          document.body
        )}

      {/* Enlarge modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-[200] grid place-items-center bg-jet/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.4, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.4, rotate: 8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md p-8 sm:p-12"
              style={{
                backgroundColor: COLOR_MAP[open.color].bg,
                color: COLOR_MAP[open.color].text,
                boxShadow: "12px 12px 0 rgba(11,12,16,0.6)",
                clipPath: open.aging === "torn"
                  ? "polygon(0 0, 88% 0, 96% 6%, 100% 4%, 100% 100%, 0 100%)"
                  : undefined,
                filter:
                  open.aging === "faded" ? "saturate(0.6)"
                  : open.aging === "old" ? "sepia(0.35) saturate(0.75)"
                  : open.aging === "crumpled" ? "contrast(1.1)"
                  : undefined,
              }}
            >
              {/* Tape */}
              <span
                aria-hidden
                className="absolute -top-3 left-1/2 h-7 w-20 -translate-x-1/2 rotate-1 rounded-sm"
                style={{
                  backgroundColor: COLOR_MAP[open.color].tape,
                  boxShadow: "0 1px 2px rgba(11,12,16,0.2)",
                }}
              />

              {/* Close */}
              <button
                onClick={() => setOpen(null)}
                data-hover="CLOSE"
                aria-label="Close"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg border-2 border-current bg-current/0 text-lg font-bold transition-transform hover:rotate-90"
              >
                ✕
              </button>

              {/* Fold corner (skip on torn) */}
              {open.aging !== "torn" && (
                <span
                  aria-hidden
                  className="absolute right-0 top-0 h-0 w-0"
                  style={{
                    borderTop: `18px solid ${COLOR_MAP[open.color].edge}`,
                    borderRight: "18px solid transparent",
                  }}
                />
              )}

              {/* "★ yours" badge — only on user's own notes */}
              {open.isMine && (
                <span className="absolute -left-3 -top-3 z-10 rotate-[-6deg] rounded-full border-2 border-jet bg-jet px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-toxic shadow-[3px_3px_0_#fcf7f8]">
                  ★ yours
                </span>
              )}

              {/* Meta */}
              <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest opacity-60">
                <span>confession #{open.id}</span>
                <span>·</span>
                <span>{open.color}</span>
                {open.aging !== "fresh" && (
                  <>
                    <span>·</span>
                    <span>{open.aging}</span>
                  </>
                )}
              </div>

              {/* Full confession */}
              <p className="font-hand text-2xl font-bold leading-tight sm:text-3xl">
                {open.text}
              </p>

              <div className="mt-6 flex items-center justify-between border-t-2 border-current/20 pt-4">
                <span className="font-display text-sm font-extrabold uppercase tracking-wide">
                  — {open.author}
                </span>
                <span className="font-hand text-base font-bold opacity-60">
                  stay anonymous · stay honest
                </span>
              </div>

              {/* Share buttons — only on user confessions (have a string id) */}
              {typeof open.id === "string" && (
                <div className="mt-4 border-t-2 border-current/20 pt-4">
                  <p className="mb-2 font-display text-[10px] font-extrabold uppercase tracking-widest opacity-60">
                    ↳ share this confession
                  </p>
                  <ShareButtons
                    text={open.text}
                    author={open.author}
                    id={open.id}
                  />
                </div>
              )}

              {/* Comment thread — only on user confessions */}
              {typeof open.id === "string" && (
                <CommentThread confessionId={open.id} commentsEnabled={true} />
              )}

              {/* Report button — only on user confessions */}
              {typeof open.id === "string" && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => setReportingNote(open)}
                    disabled={reported.has(String(open.id))}
                    data-hover={reported.has(String(open.id)) ? "SENT" : "REPORT"}
                    className={
                      "inline-flex items-center gap-1.5 rounded-lg border-2 border-current px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-tight transition-[transform,opacity] duration-150 " +
                      (reported.has(String(open.id))
                        ? "opacity-30 cursor-default"
                        : "hover:-translate-y-0.5")
                    }
                  >
                    <span>🚩</span>
                    {reported.has(String(open.id)) ? "reported" : "report"}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report modal */}
      <ReportModal
        show={!!reportingNote}
        onClose={() => setReportingNote(null)}
        onSubmit={handleReportSubmit}
        alreadyReported={!!reportingNote && reported.has(String(reportingNote.id))}
      />
    </section>
  );
}

/* ============================================================
   FlyingNote — the note that flies from composer to wall.
   Rendered via createPortal to document.body with position: fixed
   so it can travel across the entire viewport without being clipped
   by the wall's overflow:hidden or any parent transforms.
   ============================================================ */

function FlyingNote({
  note,
  sourceX,
  sourceY,
  targetX,
  targetY,
  onLanded,
}: {
  note: Note;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  onLanded: () => void;
}) {
  const col = COLOR_MAP[note.color];
  const ag = agingStyle(note.aging);

  // Arc peak: 120px above the higher of source/target
  const midX = (sourceX + targetX) / 2;
  const midY = Math.min(sourceY, targetY) - 120;

  return (
    <motion.div
      initial={{
        x: sourceX,
        y: sourceY,
        scale: 1,
        rotate: -3,
        opacity: 1,
      }}
      animate={{
        // 5 keyframes: lift-off → arc peak → descent → squish → settle
        x: [sourceX, sourceX + (midX - sourceX) * 0.3, midX, targetX, targetX],
        y: [sourceY, sourceY - 20, midY, targetY, targetY],
        scale: [1, 1.15, 1.05, 0.92, 1],
        rotate: [-3, -8, -12, -4, -4],
      }}
      transition={{
        duration: 0.9,
        times: [0, 0.2, 0.5, 0.85, 1],
        ease: "easeInOut",
      }}
      onAnimationComplete={onLanded}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: `${note.w}px`,
        backgroundColor: col.bg,
        color: col.text,
        border: "3px solid #0b0c10",
        borderRadius: 12,
        padding: 12,
        boxShadow: "6px 6px 0 rgba(11,12,16,0.6)",
        zIndex: 9999,
        pointerEvents: "none",
        transformOrigin: "center",
        filter: ag.filter,
        opacity: ag.opacity,
        clipPath: ag.clipPath,
      }}
    >
      {/* Tape strip */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: -8,
          left: "50%",
          transform: "translateX(-50%) rotate(1deg)",
          width: 48,
          height: 18,
          backgroundColor: col.tape,
          borderRadius: 3,
          boxShadow: "0 1px 2px rgba(11,12,16,0.2)",
        }}
      />
      {/* Folded corner (skip on torn) */}
      {note.aging !== "torn" && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: 0,
            height: 0,
            borderTop: `12px solid ${col.edge}`,
            borderRight: "12px solid transparent",
          }}
        />
      )}
      {/* Text */}
      <p
        style={{
          fontFamily: '"Caveat", cursive',
          fontWeight: 700,
          fontSize: 16,
          lineHeight: 1.2,
          margin: 0,
          position: "relative",
        }}
      >
        {note.text}
      </p>
    </motion.div>
  );
}
