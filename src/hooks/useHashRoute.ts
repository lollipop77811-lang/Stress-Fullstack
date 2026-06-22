import { useEffect, useState } from "react";

/**
 * Routes:
 *   "" / "#top" / "#bento" / ... → "home"    (anchor-based in-page nav)
 *   "#/whisper"                  → "whisper" (anonymous ephemeral confessions)
 *   "#/wall"                     → "wall"    (wall page, default to newest wall)
 *   "#/wall/5"                   → "wall"    (wall page, wallIdx = 4 — 1-indexed URL)
 *   "#/mine"                     → "mine"    (user's own confessions)
 *
 * Wall URLs are 1-indexed: #/wall/1 = wallIdx 0, #/wall/5 = wallIdx 4.
 * Internal wallIdx is always 0-indexed (matches the backend).
 */
export type Route = "home" | "whisper" | "wall" | "mine";

export type RouteState = {
  route: Route;
  /** Only for "wall" route. null = no wall specified (default to newest).
   *  0-indexed internal wall index. */
  wallIdx: number | null;
};

function parse(): RouteState {
  if (typeof window === "undefined") return { route: "home", wallIdx: null };
  const h = window.location.hash;
  if (h.startsWith("#/whisper")) return { route: "whisper", wallIdx: null };
  if (h.startsWith("#/mine")) return { route: "mine", wallIdx: null };
  if (h.startsWith("#/wall/")) {
    const num = parseInt(h.slice("#/wall/".length), 10);
    if (Number.isInteger(num) && num >= 1) {
      return { route: "wall", wallIdx: num - 1 }; // 1-indexed URL → 0-indexed internal
    }
    return { route: "wall", wallIdx: null };
  }
  if (h.startsWith("#/wall")) return { route: "wall", wallIdx: null };
  return { route: "home", wallIdx: null };
}

export function useHashRoute(): RouteState {
  const [state, setState] = useState<RouteState>(() => parse());

  useEffect(() => {
    const onHash = () => setState(parse());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Scroll to top whenever we switch to a dedicated route page
  useEffect(() => {
    if (state.route === "whisper" || state.route === "wall" || state.route === "mine") {
      window.scrollTo(0, 0);
    }
  }, [state.route]);

  // When switching back to home via an anchor (e.g. from #/whisper → #bento),
  // the target element may not exist yet because React hasn't re-rendered.
  // Wait a tick, then scroll into view.
  useEffect(() => {
    if (state.route !== "home") return;
    const hash = window.location.hash;
    if (!hash || hash.startsWith("#/")) return;
    const id = hash.slice(1);
    if (!id) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [state.route]);

  return state;
}

/** Helper: build a wall URL from a 0-indexed wallIdx */
export function wallUrl(wallIdx: number): string {
  return `#/wall/${wallIdx + 1}`;
}
