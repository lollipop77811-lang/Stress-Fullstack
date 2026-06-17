import { type ReactNode } from "react";
import Marquee from "@/components/ui/Marquee";
import { cn } from "@/utils/cn";

type TickerStripProps = {
  items: string[];
  speed?: number;
  reverse?: boolean;
  bg?: "jet" | "toxic" | "pink" | "electric" | "cream";
  className?: string;
};

const bgMap = {
  jet: "bg-jet text-cream border-jet",
  toxic: "bg-toxic text-jet border-jet",
  pink: "bg-pink text-cream border-jet",
  electric: "bg-electric text-cream border-jet",
  cream: "bg-cream text-jet border-jet",
};

export default function TickerStrip({
  items,
  speed = 26,
  reverse = false,
  bg = "jet",
  className = "",
}: TickerStripProps) {
  const Item = ({ children }: { children: ReactNode }) => (
    <span className="flex items-center gap-5 px-5 font-display text-lg font-extrabold uppercase tracking-tight sm:text-xl">
      {children}
      <span aria-hidden className="text-base opacity-80">
        ✦
      </span>
    </span>
  );

  return (
    <div
      className={cn(
        "border-y-[3px] py-3",
        bgMap[bg],
        className
      )}
    >
      <Marquee speed={speed} reverse={reverse}>
        {items.map((t, i) => (
          <Item key={i}>{t}</Item>
        ))}
      </Marquee>
    </div>
  );
}
