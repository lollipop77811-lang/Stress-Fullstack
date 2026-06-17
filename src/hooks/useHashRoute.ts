import { useEffect, useState } from "react";

/**
 * Routes:
 *   "" / "#top" / "#bento" / ... → "home"  (anchor-based in-page nav)
 *   "#/whisper"                  → "whisper" (dedicated page)
 *
 * Anything that starts with "#/" is treated as a route. Everything else
 * (including empty hash and section anchors) falls back to "home" so the
 * existing in-page navigation keeps working as-is.
 */
export type Route = "home" | "whisper";

function parse(): Route {
  if (typeof window === "undefined") return "home";
  const h = window.location.hash;
  if (h.startsWith("#/whisper")) return "whisper";
  return "home";
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse());

  useEffect(() => {
    const onHash = () => setRoute(parse());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Scroll to top whenever we switch to the whisper page
  useEffect(() => {
    if (route === "whisper") {
      window.scrollTo(0, 0);
    }
  }, [route]);

  // When switching back to home via an anchor (e.g. from #/whisper → #bento),
  // the target element may not exist yet because React hasn't re-rendered.
  // Wait a tick, then scroll into view.
  useEffect(() => {
    if (route !== "home") return;
    const hash = window.location.hash;
    if (!hash || hash.startsWith("#/")) return;
    const id = hash.slice(1);
    if (!id) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [route]);

  return route;
}
