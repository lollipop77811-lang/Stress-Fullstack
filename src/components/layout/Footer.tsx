import Marquee from "@/components/ui/Marquee";

const COLUMNS = [
  {
    title: "Explore",
    hover: "GO",
    links: ["Home", "Memes", "The Hot Take", "Daily Feed", "Newsletter"],
  },
  {
    title: "Topics",
    hover: "LOL",
    links: ["Workplace", "Wellness", "Relationships", "Procrastination", "Cats"],
  },
  {
    title: "Serious Stuff",
    hover: "ZZZ",
    links: ["About", "Contact", "Privacy (lol)", "Terms", "Cookie Policy"],
  },
];

const SOCIALS = ["Instagram", "TikTok", "X / Twitter", "YouTube"];

export default function Footer() {
  return (
    <footer className="relative mt-10 overflow-hidden border-t-[3px] border-jet bg-jet text-cream">
      {/* Ticker */}
      <div className="border-b-[3px] border-cream/20 bg-pink py-3">
        <Marquee speed={22}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="flex items-center gap-4 px-6 font-display text-lg font-extrabold uppercase tracking-tight text-cream"
            >
              LAUGH MORE <span className="text-toxic">★</span> STRESS LESS{" "}
              <span className="text-toxic">★</span>
            </span>
          ))}
        </Marquee>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-5">
            <a
              href="#top"
              data-hover="TOP!"
              className="flex items-center gap-2"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg border-2 border-cream bg-toxic font-display text-lg font-extrabold text-jet">
                😤
              </span>
              <span className="font-display text-lg font-extrabold tracking-tight">
                O<span className="text-pink">.</span>Stress
                <span className="text-electric">Kalaana</span>
              </span>
            </a>
            <p className="mt-5 max-w-sm font-body text-cream/70">
              Killing the stress, one laugh at a time. A humor, meme &amp;
              satire platform engineered to make your worries look ridiculous.
              You're welcome.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s}
                  href="#newsletter"
                  data-hover="FOLLOW"
                  className="rounded-lg border-2 border-cream/30 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors hover:border-toxic hover:bg-toxic hover:text-jet"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <h3 className="font-display text-sm font-extrabold uppercase tracking-widest text-toxic">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#top"
                      data-hover={col.hover}
                      className="font-body text-sm font-medium text-cream/80 transition-colors hover:text-pink"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Giant outline type */}
        <div className="mt-14 select-none">
          <h2 className="text-stroke-cream text-center font-display text-[19vw] font-extrabold uppercase leading-[0.8] tracking-tighter">
            Laugh More
          </h2>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-cream/20 pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-cream/60">
            © {new Date().getFullYear()} O.StressKalaana · Made with 😂 &amp;
            questionable decisions.
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-cream/60">
              <span className="h-2 w-2 animate-pulse rounded-full bg-toxic" />
              Stress level: 0%
            </span>
            <a
              href="#top"
              data-hover="UP!"
              className="rounded-lg border-2 border-cream/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-toxic hover:text-jet"
            >
              Back to top ↑
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
