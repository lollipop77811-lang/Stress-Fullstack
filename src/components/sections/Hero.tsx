import { useLayoutEffect, useRef } from "react";
import { motion, useTransform } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Button from "@/components/ui/Button";
import Stamp from "@/components/ui/Stamp";
import { useMouseParallax } from "@/hooks/useMousePosition";
import heroMascot from "@/assets/hero-mascot.jpg";

gsap.registerPlugin(ScrollTrigger);

function Floating({
  depth = 12,
  rotate = 0,
  className = "",
  children,
}: {
  depth?: number;
  rotate?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const { x, y } = useMouseParallax({ stiffness: 90, damping: 16 });
  const tx = useTransform(x, [-1, 1], [-depth, depth]);
  const ty = useTransform(y, [-1, 1], [-depth, depth]);
  return (
    <motion.div style={{ x: tx, y: ty, rotate }} className={className}>
      {children}
    </motion.div>
  );
}

export default function Hero() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Headline words pop in
      gsap.fromTo(
        ".hero-word",
        { y: 70, opacity: 0, rotate: -6 },
        {
          y: 0,
          opacity: 1,
          rotate: 0,
          duration: 0.9,
          stagger: 0.09,
          ease: "back.out(1.6)",
          delay: 0.15,
        }
      );
      gsap.fromTo(
        ".hero-fade",
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          delay: 0.5,
        }
      );
      // Scroll parallax
      gsap.to(".hero-parallax-up", {
        yPercent: -18,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to(".hero-parallax-down", {
        yPercent: 12,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const headline = [
    { text: "O", className: "text-jet" },
    { text: "STRESS", className: "text-pink" },
    { text: "KAL ANA", className: "text-stroke-thick" },
  ];

  return (
    <section
      id="top"
      ref={root}
      className="relative overflow-hidden px-4 pb-24 pt-10 sm:px-6 sm:pt-14 lg:pt-16"
    >
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-parallax-down absolute -right-16 top-24 hidden select-none font-display text-[26vw] font-extrabold leading-none text-jet/[0.04] lg:block">
          HAHA
        </div>
        <div className="absolute left-6 top-1/3 h-72 w-72 rounded-full bg-toxic/30 blur-3xl" />
        <div className="absolute right-10 top-10 h-72 w-72 rounded-full bg-electric/20 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Left: copy */}
        <div className="relative order-2 lg:order-1 lg:col-span-7">
          <motion.div className="hero-fade inline-flex items-center gap-2 rounded-full border-2 border-jet bg-cream px-3 py-1.5 text-[10px] font-bold shadow-brutal-sm sm:px-4 sm:text-xs">
            <span className="animate-wiggle">⚠️</span>
            HUMOR · MEMES · SATIRE · STRESS-RELIEF
          </motion.div>

          <h1 className="mt-4 font-display font-extrabold uppercase leading-[0.86] tracking-tight sm:mt-6">
            <span className="block text-[14vw] sm:text-[12vw] lg:text-[8.5rem]">
              {headline.slice(0, 2).map((w, i) => (
                <span
                  key={w.text}
                  className={`hero-word inline-block ${w.className}`}
                >
                  {w.text}
                  {i === 0 ? "\u00A0" : ""}
                </span>
              ))}
            </span>
            <span className="mt-1 block text-[14vw] sm:text-[12vw] lg:text-[8.5rem] sm:mt-2">
              <span
                className={`hero-word inline-block ${headline[2].className}`}
              >
                {headline[2].text}
              </span>
            </span>
          </h1>

          {/* Caveat annotation */}
          <span className="hero-fade mt-2 inline-block rotate-[-4deg] font-hand text-xl font-bold text-electric sm:mt-3 sm:text-2xl lg:text-3xl">
            ↳ aka: killing the stress (duh)
          </span>

          <p className="hero-fade mt-4 max-w-xl font-body text-sm text-ink sm:mt-6 sm:text-base lg:text-lg">
            We murder stress for a living.{" "}
            <span className="bg-toxic px-1 font-semibold">Legally.</span>{" "}
            (Probably.) A humor &amp; satire platform engineered to melt your
            worries into uncontrollable, slightly suspicious joy.
          </p>

          <div className="hero-fade mt-6 flex flex-wrap items-center gap-3 sm:mt-8 sm:gap-4">
            <Button href="#bento" variant="electric" size="lg">
              Get your daily dose
              <span className="text-lg">↓</span>
            </Button>
            <Button href="#featured" variant="cream" size="lg">
              The hot take
            </Button>
          </div>

          <div className="hero-fade mt-8 flex flex-wrap gap-x-6 gap-y-3 sm:mt-10 sm:gap-x-8">
            {[
              ["0%", "Stress"],
              ["100%", "Vibes"],
              ["∞", "Laughs served"],
            ].map(([n, l]) => (
              <div key={l} className="flex flex-col">
                <span className="font-display text-2xl font-extrabold leading-none sm:text-3xl">
                  {n}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink/70 sm:text-xs">
                  {l}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: mascot + floating bits */}
        <div className="relative order-1 lg:order-2 lg:col-span-5">
          <div className="hero-parallax-up relative mx-auto max-w-xs sm:max-w-md">
            <Floating depth={14} className="relative">
              <div className="relative rounded-[2rem] border-[3px] border-jet bg-electric p-3 shadow-brutal-xl">
                <div className="aspect-[4/5] overflow-hidden rounded-[1.5rem] border-2 border-jet bg-cream">
                  <img
                    src={heroMascot}
                    alt="A joyful blob character defeating a spiky stress monster"
                    className="h-full w-full object-cover"
                    loading="eager"
                  />
                </div>
                <span className="absolute -left-4 top-6 -rotate-6 rounded-lg border-2 border-jet bg-cream px-3 py-1 font-hand text-xl font-bold shadow-brutal-sm">
                  stress = gone 😌
                </span>
              </div>
            </Floating>

            {/* Floating stamps & emoji */}
            <Floating depth={26} className="absolute -right-4 -top-6 hidden sm:block sm:-right-10 sm:-top-8">
              <Stamp
                text="· LMAO CERTIFIED · OFFICIAL"
                center="😂"
                color="toxic"
                className="h-24 w-24 sm:h-28 sm:w-28"
              />
            </Floating>

            <Floating depth={20} rotate={-8} className="absolute -bottom-6 -left-4 hidden sm:block sm:-bottom-8 sm:-left-12">
              <div className="rounded-2xl border-2 border-jet bg-pink px-4 py-3 text-center shadow-brutal">
                <div className="font-display text-2xl font-extrabold text-cream leading-none">
                  0% Stress
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-cream/80">
                  right now, fr
                </div>
              </div>
            </Floating>

            <Floating depth={32} className="absolute -right-2 bottom-10 hidden sm:block">
              <span className="animate-wiggle block text-4xl drop-shadow-[2px_2px_0_#0b0c10]">
                💀
              </span>
            </Floating>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="hero-fade mt-10 flex items-center justify-center sm:mt-16">
        <span className="flex items-center gap-2 font-hand text-xl font-bold text-ink/70">
          keep scrollin', keep lol'in
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="text-2xl"
          >
            ↓
          </motion.span>
        </span>
      </div>
    </section>
  );
}
