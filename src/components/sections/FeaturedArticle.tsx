import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Button from "@/components/ui/Button";
import Stamp from "@/components/ui/Stamp";
import featuredImg from "@/assets/featured.jpg";

gsap.registerPlugin(ScrollTrigger);

export default function FeaturedArticle() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".feat-reveal",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 75%" },
        }
      );
      gsap.fromTo(
        ".feat-img",
        { opacity: 0, x: -40, rotate: -3 },
        {
          opacity: 1,
          x: 0,
          rotate: 0,
          duration: 0.9,
          ease: "back.out(1.3)",
          scrollTrigger: { trigger: root.current, start: "top 75%" },
        }
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="featured" ref={root} className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-12">
        {/* Image */}
        <div className="relative lg:col-span-6">
          <div className="feat-img">
            <motion.div
              whileHover={{ rotate: -1.5 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="relative rounded-[2rem] border-[3px] border-jet bg-toxic p-3 shadow-brutal-lg"
            >
              <div className="overflow-hidden rounded-[1.5rem] border-2 border-jet bg-cream">
                <img
                  src={featuredImg}
                  alt="A stressed worker levitating in zen amid flying papers"
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              </div>
              <span className="absolute -right-3 top-8 rotate-6 rounded-lg border-2 border-jet bg-cream px-3 py-1 font-hand text-xl font-bold shadow-brutal-sm">
                totally real photo 📸
              </span>
            </motion.div>
          </div>

          <Stamp
            text="· THE HOT TAKE · MUST READ · "
            center="🔥"
            color="electric"
            className="absolute -bottom-6 -left-4 h-24 w-24 sm:-left-8"
          />
        </div>

        {/* Content */}
        <div className="lg:col-span-6">
          <div className="feat-reveal flex flex-wrap items-center gap-2">
            <span className="rounded-full border-2 border-jet bg-pink px-3 py-1 text-xs font-bold uppercase tracking-wider text-cream">
              Featured
            </span>
            <span className="rounded-full border-2 border-jet bg-cream px-3 py-1 text-xs font-bold uppercase tracking-wider">
              Mind &amp; Body
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
              · 4 min read · 9.2k chuckles
            </span>
          </div>

          <h2 className="feat-reveal mt-5 font-display text-3xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
            Man Achieves{" "}
            <span className="bg-toxic px-1">Inner Peace,</span> Immediately
            Forgets Where He Put It
          </h2>

          <p className="feat-reveal mt-5 max-w-xl font-body text-base text-ink sm:text-lg">
            Local man reported "total zen" for approximately{" "}
            <span className="font-semibold">eleven seconds</span> before
            misplacing his phone, his keys, and reportedly, his own sense of
            calm. "I was so relaxed I forgot how to be a person," he told no one
            in particular, while standing in the kitchen for reasons unknown.
          </p>

          <div className="feat-reveal mt-7 flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-jet bg-electric text-lg shadow-brutal-sm">
                🧘
              </span>
              <div className="leading-tight">
                <div className="font-display text-sm font-bold">Staff Writer</div>
                <div className="text-xs font-semibold text-ink/60">
                  @chill.intensifies
                </div>
              </div>
            </div>
            <Button href="#newsletter" variant="jet" size="sm">
              Read the whole saga
              <span>→</span>
            </Button>
          </div>

          <blockquote className="feat-reveal mt-8 border-l-4 border-pink pl-4">
            <p className="font-hand text-2xl font-bold text-jet sm:text-3xl">
              "Happiness is just sadness taking a coffee break."
            </p>
            <cite className="mt-1 block text-xs font-bold uppercase not-italic tracking-wide text-ink/60">
              — Probably someone wise (or a fortune cookie)
            </cite>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
