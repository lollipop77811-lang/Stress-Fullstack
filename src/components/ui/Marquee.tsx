import { type ReactNode } from "react";
import { motion } from "framer-motion";

type MarqueeProps = {
  children: ReactNode;
  /** seconds for one full loop */
  speed?: number;
  reverse?: boolean;
  className?: string;
  pauseOnHover?: boolean;
};

/**
 * Seamless infinite marquee. Renders the children twice and slides the
 * track by -50% so the duplicate creates a perfect loop.
 */
export default function Marquee({
  children,
  speed = 24,
  reverse = false,
  className = "",
  pauseOnHover = false,
}: MarqueeProps) {
  const Track = () => (
    <div className="flex shrink-0 items-center" aria-hidden>
      {children}
    </div>
  );

  return (
    <div className={`group flex w-full overflow-hidden ${className}`}>
      <motion.div
        className="flex min-w-full"
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
        whileHover={pauseOnHover ? { animationPlayState: "paused" } : undefined}
      >
        <Track />
        <Track />
      </motion.div>
    </div>
  );
}
