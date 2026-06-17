import { useEffect } from "react";
import { useMotionValue, useSpring, type MotionValue } from "framer-motion";

type Options = {
  stiffness?: number;
  damping?: number;
};

/**
 * Tracks the pointer and returns smoothed (springy) motion values for x/y.
 * Uses motion values instead of state so it never triggers React re-renders
 * — perfect for buttery parallax effects.
 */
export function useMousePosition({
  stiffness = 150,
  damping = 20,
}: Options = {}): { x: MotionValue<number>; y: MotionValue<number> } {
  const x = useMotionValue(
    typeof window !== "undefined" ? window.innerWidth / 2 : 0
  );
  const y = useMotionValue(
    typeof window !== "undefined" ? window.innerHeight / 2 : 0
  );

  const springX = useSpring(x, { stiffness, damping });
  const springY = useSpring(y, { stiffness, damping });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [x, y]);

  return { x: springX, y: springY };
}

/**
 * Normalised pointer position relative to viewport centre.
 * Returns -1..1 ranges on each axis for easy parallax math.
 */
export function useMouseParallax({
  stiffness = 80,
  damping = 18,
}: Options = {}) {
  const { x, y } = useMousePosition({ stiffness, damping });

  const nx = useSpring(0, { stiffness, damping });
  const ny = useSpring(0, { stiffness, damping });

  useEffect(() => {
    const update = () => {
      const vx = x.get();
      const vy = y.get();
      nx.set((vx / window.innerWidth - 0.5) * 2);
      ny.set((vy / window.innerHeight - 0.5) * 2);
    };
    const unsubX = x.on("change", update);
    const unsubY = y.on("change", update);
    return () => {
      unsubX();
      unsubY();
    };
  }, [x, y, nx, ny]);

  return { x: nx, y: ny };
}
