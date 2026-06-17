import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";

/**
 * Brutalist custom cursor:
 *  - a small dot that tracks the pointer instantly
 *  - a larger ring that lags behind with a spring
 *  - over any [data-hover] element it morphs into a filled disc with a label
 * Desktop / fine-pointer only.
 */
export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [label, setLabel] = useState<string>("HA!");
  const [down, setDown] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  const ringX = useSpring(x, { stiffness: 350, damping: 30, mass: 0.4 });
  const ringY = useSpring(y, { stiffness: 350, damping: 30, mass: 0.4 });

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;
    setEnabled(true);

    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };

    const over = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(
        "[data-hover]"
      ) as HTMLElement | null;
      if (target) {
        setHovering(true);
        setLabel(target.dataset.hover || "HA!");
      } else {
        setHovering(false);
      }
    };

    const onDown = () => setDown(true);
    const onUp = () => setDown(false);

    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseover", over, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] hidden md:block">
      {/* Lagging ring / hover disc */}
      <motion.div
        className="absolute top-0 left-0 flex items-center justify-center rounded-full border-2 border-jet"
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          width: hovering ? 84 : 38,
          height: hovering ? 84 : 38,
          backgroundColor: hovering
            ? "var(--color-toxic)"
            : "rgba(252,247,248,0)",
          borderWidth: hovering ? 0 : 2,
          scale: down ? 0.8 : 1,
        }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
      >
        <AnimatePresence mode="wait">
          {hovering && (
            <motion.span
              key={label}
              initial={{ opacity: 0, scale: 0.4, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="font-display text-[15px] font-extrabold leading-none text-jet"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Instant dot */}
      <motion.div
        className="absolute top-0 left-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-jet"
        style={{ x, y }}
        animate={{ opacity: hovering ? 0 : 1, scale: down ? 1.6 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
      />
    </div>
  );
}
