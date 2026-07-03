import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import type { useAuth } from "@/hooks/useAuth";

const LINKS = [
  { label: "Home", href: "#top", hover: "TOP!" },
  { label: "Feed", href: "#bento", hover: "LOL" },
  { label: "Jokes", href: "#jokes", hover: "HIT!" },
  { label: "Confess", href: "#/wall", hover: "READ" },
  { label: "Whisper", href: "#/whisper", hover: "SHHH" },
  { label: "Horoscope", href: "#/horoscope", hover: "🔮" },
  { label: "Join", href: "#newsletter", hover: "SUB" },
];

function Logo() {
  return (
    <a
      href="#top"
      data-hover="HEY!"
      className="group flex shrink-0 items-center gap-2"
      aria-label="O Stress Kalaana — home"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg border-2 border-jet bg-toxic font-display text-base font-extrabold shadow-brutal-sm transition-transform duration-200 group-hover:rotate-6 sm:h-10 sm:w-10 sm:text-lg">
        😤
      </span>
      <span className="font-display text-base font-extrabold leading-none tracking-tight sm:text-lg">
        O<span className="text-pink">.</span>Stress
        <span className="text-electric">Kalaana</span>
      </span>
    </a>
  );
}

export default function Navbar({
  auth,
  onAuthClick,
}: {
  auth: ReturnType<typeof useAuth>;
  onAuthClick: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLoggedIn = !!auth.user && !!auth.account;

  return (
    <header className="sticky top-0 z-50 px-2 pt-2 sm:px-5 sm:pt-4">
      <nav
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between gap-2 rounded-2xl border-2 border-jet px-3 py-2.5 transition-all duration-300 sm:gap-4 sm:px-6 sm:py-3",
          scrolled ? "bg-cream/90 shadow-brutal backdrop-blur-md" : "bg-cream/70 shadow-brutal-sm"
        )}
      >
        <Logo />

        {/* Desktop links */}
        <ul className="hidden items-center gap-0.5 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                data-hover={l.hover}
                className="group relative inline-block rounded-lg px-2.5 py-2 font-display text-sm font-bold uppercase tracking-tight transition-colors hover:text-pink"
              >
                {l.label}
                <span className="absolute inset-x-2.5 -bottom-0.5 h-0.5 origin-left scale-x-0 bg-pink transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Account / Login */}
          {auth.firebaseEnabled && (
            isLoggedIn ? (
              <a
                href="#/account"
                data-hover="ME!"
                className="flex items-center gap-1.5 rounded-xl border-2 border-jet bg-toxic px-2.5 py-2 font-display text-xs font-bold uppercase tracking-tight text-jet shadow-brutal-sm transition-transform duration-150 hover:-translate-y-0.5"
              >
                {auth.account?.avatarUrl ? (
                  <img
                    src={auth.account.avatarUrl}
                    alt="avatar"
                    className="h-5 w-5 rounded-full border-2 border-jet object-cover"
                  />
                ) : (
                  <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-jet bg-cream text-[10px] font-extrabold">
                    {auth.account?.username.charAt(0).toUpperCase() ?? "?"}
                  </span>
                )}
                <span className="hidden sm:inline">{auth.account?.username ?? "account"}</span>
                {auth.account?.isAdmin && <span className="text-[8px]">🛡️</span>}
              </a>
            ) : (
              <button
                onClick={onAuthClick}
                data-hover="LOGIN!"
                className="rounded-xl border-2 border-jet bg-cream px-3 py-2 font-display text-xs font-bold uppercase tracking-tight text-jet shadow-brutal-sm transition-transform duration-150 hover:-translate-y-0.5"
              >
                <span className="sm:hidden">👤</span>
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )
          )}

          {/* Mobile toggle */}
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            data-hover="MENU"
            className="grid h-11 w-11 place-items-center rounded-lg border-2 border-jet bg-toxic shadow-brutal-sm lg:hidden"
          >
            <div className="flex flex-col gap-1.5">
              <motion.span animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }} className="block h-0.5 w-5 bg-jet" />
              <motion.span animate={open ? { opacity: 0 } : { opacity: 1 }} className="block h-0.5 w-5 bg-jet" />
              <motion.span animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} className="block h-0.5 w-5 bg-jet" />
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
            className="mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl border-2 border-jet bg-cream p-3 shadow-brutal lg:hidden"
          >
            <ul className="flex flex-col">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-4 py-3.5 font-display text-lg font-extrabold uppercase tracking-tight hover:bg-toxic"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              {isLoggedIn && (
                <li>
                  <a
                    href="#/account"
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-4 py-3.5 font-display text-lg font-extrabold uppercase tracking-tight hover:bg-toxic"
                  >
                    👤 {auth.account?.username}
                  </a>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
