import { useId } from "react";
import { cn } from "@/utils/cn";

type StampProps = {
  text: string;
  center?: string;
  className?: string;
  color?: "toxic" | "pink" | "electric" | "cream";
  spin?: boolean;
  /** rotation offset in deg */
  rotate?: number;
};

const colorMap = {
  toxic: "bg-toxic text-jet",
  pink: "bg-pink text-cream",
  electric: "bg-electric text-cream",
  cream: "bg-cream text-jet",
};

/**
 * A circular "seal" stamp with text running around the rim (SVG textPath)
 * and a symbol/word in the middle. Slowly spins. Each instance gets a
 * unique path id so multiple stamps can coexist on the page.
 */
export default function Stamp({
  text,
  center = "★",
  className,
  color = "toxic",
  spin = true,
  rotate = 0,
}: StampProps) {
  const id = useId().replace(/[:]/g, "");

  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-full border-[3px] border-jet shadow-brutal",
        colorMap[color],
        spin && "animate-spin-slow",
        className
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <path
            id={`stamp-${id}`}
            d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0"
            fill="none"
          />
        </defs>
        <text className="fill-current font-display font-extrab uppercase tracking-[0.18em]">
          <textPath
            href={`#stamp-${id}`}
            startOffset="0%"
            style={{ fontSize: "10.5px" }}
          >
            {text}
          </textPath>
        </text>
      </svg>
      <span className="pointer-events-none absolute font-display text-xl font-extrabold leading-none">
        {center}
      </span>
    </div>
  );
}
