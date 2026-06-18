import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Wraps the app in a Lenis-powered smooth scroll context and wires it into
 * the GSAP ticker so ScrollTrigger animations stay perfectly in sync.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Respect reduced-motion: skip smoothing, let native scroll happen.
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tickerFn = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    // Refresh once everything (fonts/images) has settled.
    const refreshTimeout = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 400);

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    return () => {
      window.clearTimeout(refreshTimeout);
      window.removeEventListener("load", onLoad);
      gsap.ticker.remove(tickerFn);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
