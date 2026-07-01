import Marquee from "@/components/ui/Marquee";

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

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-7">
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
            <p className="mt-5 max-w-sm font-body text-sm leading-relaxed text-cream/70 sm:text-base">
              Killing the stress, one laugh at a time. A humor, meme &amp;
              satire platform engineered to make your worries look ridiculous.
              You're welcome.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-x-8 gap-y-3 lg:col-span-5 lg:justify-end">
            <div>
              <h3 className="font-display text-xs font-extrabold uppercase tracking-widest text-toxic">
                Explore
              </h3>
              <ul className="mt-3 space-y-2">
                <li><a href="#/wall" data-hover="WALL" className="text-sm font-medium text-cream/70 transition-colors hover:text-pink">Wall of Confession</a></li>
                <li><a href="#/whisper" data-hover="SHHH" className="text-sm font-medium text-cream/70 transition-colors hover:text-pink">Whisper Wall</a></li>
                <li><a href="#/horoscope" data-hover="🔮" className="text-sm font-medium text-cream/70 transition-colors hover:text-pink">Daily Horoscope</a></li>
                <li><a href="#/mine" data-hover="MINE" className="text-sm font-medium text-cream/70 transition-colors hover:text-pink">My Confessions</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-display text-xs font-extrabold uppercase tracking-widest text-toxic">
                Legal
              </h3>
              <ul className="mt-3 space-y-2">
                <li><a href="#/privacy" data-hover="LEGAL" className="text-sm font-medium text-cream/70 transition-colors hover:text-pink">Privacy Policy</a></li>
                <li><a href="#/terms" data-hover="LEGAL" className="text-sm font-medium text-cream/70 transition-colors hover:text-pink">Terms of Service</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-cream/20 pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-cream/60">
            © {new Date().getFullYear()} O.StressKalaana · Made with 😂 &amp;
            questionable decisions.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-cream/60">
              <span className="h-2 w-2 animate-pulse rounded-full bg-toxic" />
              Stress level: 0%
            </span>
            <a
              href="#top"
              data-hover="UP!"
              className="rounded-lg border-2 border-cream/30 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-toxic hover:text-jet"
            >
              Back to top ↑
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
