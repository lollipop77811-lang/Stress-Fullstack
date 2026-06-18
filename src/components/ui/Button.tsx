import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/utils/cn";

type Variant = "electric" | "pink" | "toxic" | "jet" | "cream";

type ButtonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  icon?: ReactNode;
} & Omit<HTMLMotionProps<"button">, "children">;

const variantClasses: Record<Variant, string> = {
  electric: "bg-electric text-cream",
  pink: "bg-pink text-cream",
  toxic: "bg-toxic text-jet",
  jet: "bg-jet text-cream",
  cream: "bg-cream text-jet",
};

const sizeClasses = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export default function Button({
  children,
  variant = "electric",
  size = "md",
  href,
  className,
  icon,
  ...rest
}: ButtonProps) {
  const classes = cn(
    "relative inline-flex items-center justify-center gap-2 border-2 border-jet font-display font-bold uppercase tracking-tight select-none",
    "shadow-brutal rounded-xl",
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  const baseStyle = { boxShadow: "8px 8px 0px #0b0c10" } as const;

  const whileHover = {
    x: 4,
    y: 4,
    boxShadow: "0px 0px 0px #0b0c10",
    transition: { type: "spring" as const, stiffness: 600, damping: 18 },
  };

  const whileTap = {
    x: 8,
    y: 8,
    scale: 0.97,
    boxShadow: "0px 0px 0px #0b0c10",
    transition: { type: "spring" as const, stiffness: 800, damping: 20 },
  };

  if (href) {
    return (
      <motion.a
        href={href}
        data-hover="GO!"
        className={classes}
        style={baseStyle}
        whileHover={whileHover}
        whileTap={whileTap}
      >
        {children}
        {icon}
      </motion.a>
    );
  }

  return (
    <motion.button
      className={classes}
      style={baseStyle}
      data-hover="GO!"
      whileHover={whileHover}
      whileTap={whileTap}
      {...rest}
    >
      {children}
      {icon}
    </motion.button>
  );
}
