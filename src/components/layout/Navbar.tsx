import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import Button from "@/components/ui/Button";

const LINKS = [
  { label: "Home", href: "#top", hover: "TOP!" },
  { label: "Memes", href: "#bento", hover: "LOL" },
  { label: "The Hot Take", href: "#featured", hover: "READ" },
  { label: "Join", href: "#newsletter", hover: "SUB" },
];

function Logo() {
  return (
    <a
      href="#top"
      data-hover="HEY!"
      className="group flex items-center gap-2"
      aria-label="O Stress Kalaana — home"
    >
      <span className="grid h-10 w-10 place-items-center rounded-lg border-2 border-jet bg-toxic font-display text-lg font-extrabold shadow-brutal-sm transition-transform duration-200 group-hover:rotate-6">
        😤
      </span>
      <span className="font-display text-lg font-extrabold leading-none tracking-tight">
        O<span className="text-pink">.</span>Stress
        <span className="text-electric">Kalaana</span>
      </span>
    </a>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl border-2 border-jet px-4 py-3 transition-all duration-300 sm:px-6",
          scrolled
            ? "bg-cream/90 shadow-brutal backdrop-blur-md"
            : "bg-cream/70 shadow-brutal-sm"
        )}
      >
        <Logo />

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                data-hover={l.hover}
                className="group relative inline-block rounded-lg px-3 py-2 font-display text-sm font-bold uppercase tracking-tight transition-colors hover:text-pink"
              >
                {l.label}
                <span className="absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 bg-pink transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border-2 border-jet bg-cream px-3 py-1.5 text-xs font-bold sm:inline-flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-toxic" />
            Mood: Immaculate
          </span>
          <span className="hidden lg:block">
            <Button href="#newsletter" variant="pink" size="sm">
              Subscribe
            </Button>
          </span>

          {/* Mobile toggle */}
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            data-hover="MENU"
            className="grid h-11 w-11 place-items-center rounded-lg border-2 border-jet bg-toxic shadow-brutal-sm md:hidden"
          >
            <div className="flex flex-col gap-1.5">
              <motion.span
                animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                className="block h-0.5 w-5 bg-jet"
              />
              <motion.span
                animate={open ? { opacity: 0 } : { opacity: 1 }}
                className="block h-0.5 w-5 bg-jet"
              />
              <motion.span
                animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                className="block h-0.5 w-5 bg-jet"
              />
            </div>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl border-2 border-jet bg-cream p-3 shadow-brutal md:hidden"
          >
            <ul className="flex flex-col">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-4 py-3 font-display text-lg font-extrabold uppercase tracking-tight hover:bg-toxic"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <Button
              href="#newsletter"
              variant="pink"
              className="mt-2 w-full"
              onClick={() => setOpen(false)}
            >
              Subscribe to the chaos
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
