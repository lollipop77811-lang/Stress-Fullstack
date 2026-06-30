import { useEffect, useState } from "react";

/**
 * Routes:
 *   "" / "#top" / "#bento" / ... → "home"        (anchor-based in-page nav)
 *   "#/whisper"                  → "whisper"     (anonymous ephemeral confessions)
 *   "#/wall"                     → "wall"        (wall page, default to newest = displayN 1)
 *   "#/wall/3"                   → "wall"        (wall page, displayN = 3)
 *   "#/mine"                     → "mine"        (user's own confessions)
 *   "#/horoscope"                → "horoscope"   (daily stress horoscope)
 *   "#/c/<confessionId>"         → "confession"  (deep-link to a shared confession)
 *
 * Wall numbering is REVERSE-CHRONOLOGICAL:
 *   displayN = 1  → newest wall (where new confessions go)
 *   displayN = 2  → next newest
 *   displayN = N  → oldest wall
 *
 * When wall 1 fills up, it becomes wall 2, and a fresh wall 1 spawns.
 *
 * Internal wallIdx (used by the backend) is 0-indexed oldest-first:
 *   internal wallIdx = totalWalls - displayN
 *
 * The route hook returns displayN. The parent (App.tsx) fetches totalWalls
 * from the API and computes the internal wallIdx.
 */
export type Route =
  | "home"
  | "whisper"
  | "wall"
  | "mine"
  | "horoscope"
  | "confession"
  | "privacy"
  | "terms";

export type RouteState = {
  route: Route;
  /** Only for "wall" route. 1-indexed DISPLAY number (1 = newest).
   *  null = no wall specified (default to 1 = newest). */
  wallDisplayN: number | null;
  /** Only for "confession" route. The confession ID from the URL. */
  confessionId: string | null;
};

function parse(): RouteState {
  if (typeof window === "undefined")
    return { route: "home", wallDisplayN: null, confessionId: null };
  const h = window.location.hash;
  if (h.startsWith("#/whisper"))
    return { route: "whisper", wallDisplayN: null, confessionId: null };
  if (h.startsWith("#/mine"))
    return { route: "mine", wallDisplayN: null, confessionId: null };
  if (h.startsWith("#/horoscope"))
    return { route: "horoscope", wallDisplayN: null, confessionId: null };
  if (h.startsWith("#/privacy"))
    return { route: "privacy", wallDisplayN: null, confessionId: null };
  if (h.startsWith("#/terms"))
    return { route: "terms", wallDisplayN: null, confessionId: null };
  if (h.startsWith("#/c/")) {
    const id = h.slice("#/c/".length).trim();
    if (id)
      return { route: "confession", wallDisplayN: null, confessionId: id };
    return { route: "home", wallDisplayN: null, confessionId: null };
  }
  if (h.startsWith("#/wall/")) {
    const num = parseInt(h.slice("#/wall/".length), 10);
    if (Number.isInteger(num) && num >= 1) {
      return { route: "wall", wallDisplayN: num, confessionId: null };
    }
    return { route: "wall", wallDisplayN: null, confessionId: null };
  }
  if (h.startsWith("#/wall"))
    return { route: "wall", wallDisplayN: null, confessionId: null };
  return { route: "home", wallDisplayN: null, confessionId: null };
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
    if (
      state.route === "whisper" ||
      state.route === "wall" ||
      state.route === "mine" ||
      state.route === "horoscope" ||
      state.route === "confession" ||
      state.route === "privacy" ||
      state.route === "terms"
    ) {
      window.scrollTo(0, 0);
    }
  }, [state.route]);

  // When switching back to home via an anchor, wait a tick then scroll
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

/** Helper: build a wall URL from a displayN (1 = newest) */
export function wallUrl(displayN: number): string {
  return `#/wall/${displayN}`;
}

/** Helper: build a confession deep-link URL from an ID */
export function confessionUrl(id: string): string {
  return `#/c/${id}`;
}
