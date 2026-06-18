import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Stamp from "@/components/ui/Stamp";

gsap.registerPlugin(ScrollTrigger);

export default function Newsletter() {
  const root = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".nl-reveal",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 80%" },
        }
      );
    }, root);
    return () => ctx.revert();
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setDone(true);
  };

  return (
    <section id="newsletter" ref={root} className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="nl-reveal relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border-[3px] border-jet bg-electric p-7 shadow-brutal-xl sm:p-12">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-pink/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-toxic/40 blur-2xl" />

        <div className="relative grid items-center gap-8 md:grid-cols-12">
          <div className="md:col-span-8">
            <span className="inline-block rotate-[-3deg] font-hand text-2xl font-bold text-toxic sm:text-3xl">
              no spam, just spammy jokes ↴
            </span>
            <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight text-cream sm:text-6xl">
              Get your daily dose of{" "}
              <span className="bg-toxic px-1 text-jet">nonsense.</span>
            </h2>
            <p className="mt-4 max-w-xl font-body text-cream/90 sm:text-lg">
              Join <span className="font-bold">0 serious people</span> getting
              memes, satire &amp; stress-relief delivered straight to their
              inbox. Unsubscribe whenever life gets too funny.
            </p>

            <AnimatePresence mode="wait">
              {!done ? (
                <motion.form
                  key="form"
                  onSubmit={onSubmit}
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-7 flex flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.lol"
                    aria-label="Email address"
                    data-hover="TYPE"
                    className="w-full flex-1 rounded-xl border-2 border-jet bg-cream px-4 py-3 font-body text-base font-medium text-jet shadow-brutal-sm outline-none placeholder:text-jet/40 focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-[transform,box-shadow] duration-150"
                  />
                  <motion.button
                    type="submit"
                    data-hover="SEND!"
                    whileHover={{ x: 4, y: 4, boxShadow: "0px 0px 0px #0b0c10" }}
                    whileTap={{ scale: 0.97 }}
                    className="rounded-xl border-2 border-jet bg-toxic px-6 py-3 font-display font-bold uppercase tracking-tight text-jet shadow-brutal transition-[transform,box-shadow] duration-150"
                  >
                    Subscribe →
                  </motion.button>
                </motion.form>
              ) : (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-7 flex items-center gap-3 rounded-xl border-2 border-jet bg-toxic px-5 py-4 shadow-brutal-sm"
                >
                  <span className="text-3xl">🎉</span>
                  <p className="font-display text-lg font-extrabold leading-tight">
                    You're in! Your stress doesn't stand a chance. Check your
                    inbox for something silly.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-cream/60">
              ⚠️ May cause uncontrollable grinning in inappropriate situations
            </p>
          </div>

          <div className="hidden justify-center md:col-span-4 md:flex">
            <Stamp
              text="· FREE · FUNNY · 0% SERIOUS ·"
              center="📬"
              color="toxic"
              className="h-32 w-32"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
