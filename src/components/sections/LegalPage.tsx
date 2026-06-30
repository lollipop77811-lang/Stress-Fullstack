import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   Privacy Policy + Terms of Service — brutalist-styled legal pages.
   Generated boilerplate — review with a lawyer before production use.
   ============================================================ */

type LegalPage = "privacy" | "terms";

const PRIVACY_SECTIONS = [
  {
    title: "What we collect",
    body: [
      "Confession text: whatever you write in the composer. We strip personally identifiable information (emails, phone numbers, URLs, credit card numbers, SSN-like patterns) before saving.",
      "Author name: optional — defaults to 'anon'. You can enter any name up to 30 characters. We don't verify it.",
      "Wall index: which wall your confession is on. Used for display.",
      "Timestamp: when you posted. Used for sorting and display.",
      "Session ID: a random string generated in your browser and stored in localStorage. Used to prevent double-witnessing and double-reporting. Not tied to your identity.",
      "IP hash: an anonymized hash of your IP address, used for rate-limiting. We don't store your raw IP.",
      "Witness data: which confessions you've witnessed (stored as sessionId arrays on each confession).",
      "Report data: which confessions you've reported (stored as sessionId arrays on each confession).",
    ],
  },
  {
    title: "What we DON'T collect",
    body: [
      "Your name, email, or account info — we don't have accounts. Everything is anonymous.",
      "Your browsing history — we don't use analytics or tracking cookies.",
      "Your location — we don't collect GPS or location data.",
      "Your device info — we don't fingerprint your browser.",
    ],
  },
  {
    title: "How long we keep your data",
    body: [
      "Confessions: indefinitely, unless reported and hidden, or unless you request deletion (see below).",
      "Witnessed/reported sets: stored in your browser's localStorage, not on our server. Clearing your browser data removes them.",
      "Session ID: stored in localStorage. Clearing your browser data generates a new one.",
    ],
  },
  {
    title: "Who can see your data",
    body: [
      "Anyone visiting the site can see your confession text, author name, color, and aging style on the wall.",
      "Anyone can see the witness count on your confession.",
      "Only site administrators can see: report counts, reported-by sessions, crisis flags, and IP hashes.",
      "We don't sell, share, or rent your data to third parties. No ads, no analytics, no tracking.",
    ],
  },
  {
    title: "Your rights",
    body: [
      "Right to access: you can see all your confessions on the '★ My Confessions' page (stored locally via localStorage).",
      "Right to deletion: contact us at the email below and we'll delete your confessions. Note: since confessions are anonymous, you'll need to provide the confession IDs (visible on the My Confessions page).",
      "Right to clear local data: use the 'forget my confessions' link in the footer, or clear your browser's localStorage.",
      "GDPR (EU users): you have the right to lodge a complaint with your local data protection authority.",
      "CCPA (California users): you have the right to know what personal information we collect, request deletion, and opt out of any sale (we don't sell any data).",
    ],
  },
  {
    title: "Crisis resources",
    body: [
      "If you post a confession containing self-harm or crisis language, our system flags it for admin review and shows you crisis resources (988 Lifeline, Crisis Text Line, international helplines).",
      "Your confession is NOT deleted or silenced — it stays on the wall. We believe silencing someone in crisis is harmful.",
      "If you're struggling, please reach out: 988 (US), text HOME to 741741, or visit findahelpline.com for international resources.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For privacy requests, data deletion, or questions: contact the site administrator.",
      "This is a hobby project — please be patient with response times.",
    ],
  },
];

const TERMS_SECTIONS = [
  {
    title: "Acceptable use",
    body: [
      "You may post anonymous confessions, witness other confessions, and share confessions.",
      "You may NOT post: hate speech, slurs, harassment, threats, doxxing (sharing someone's private information), spam, scam content, illegal content, or content that promotes self-harm or violence against others.",
      "You may NOT attempt to: bypass rate limits, spam the wall with automated tools, scrape content at scale, or overload the server.",
      "You may NOT impersonate others or pretend to be a site administrator.",
    ],
  },
  {
    title: "Content moderation",
    body: [
      "We auto-strip personally identifiable information (emails, phone numbers, URLs, credit cards, SSN patterns) from confessions before saving.",
      "We auto-filter profanity (slurs and strong profanity are censored with ****).",
      "We flag confessions containing crisis/self-harm language for admin review (but do NOT silence them).",
      "Confessions that receive 3+ reports from distinct sessions are auto-hidden from the wall.",
      "We reserve the right to delete any confession at our discretion, with or without notice.",
    ],
  },
  {
    title: "Your content",
    body: [
      "You retain ownership of your confession text.",
      "By posting, you grant us a non-exclusive, royalty-free, worldwide license to display your confession on the site.",
      "You can request deletion at any time (see Privacy Policy).",
      "You are responsible for what you post. We are not liable for content you contribute.",
    ],
  },
  {
    title: "Disclaimers",
    body: [
      "The site is provided 'as is' without warranties of any kind.",
      "We don't guarantee the site will be available 24/7. It might go down. It might lose data. It's a hobby project.",
      "We don't guarantee that confessions will be moderated in real-time. There may be a delay between when content is posted and when it's reviewed.",
      "We are not mental health professionals. The crisis resources we provide are for informational purposes only. If you're in crisis, please contact a professional or emergency services.",
    ],
  },
  {
    title: "Limitation of liability",
    body: [
      "We are not liable for any damages arising from your use of the site.",
      "We are not liable for content posted by other users.",
      "You use the site at your own risk.",
    ],
  },
  {
    title: "Changes to these terms",
    body: [
      "We may update these terms at any time. Changes take effect when posted.",
      "Continued use after changes constitutes acceptance of the new terms.",
      "Major changes will be noted on the homepage.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For terms-of-service questions or content removal requests: contact the site administrator.",
    ],
  },
];

export default function LegalPage({ page }: { page: LegalPage }) {
  const root = useRef<HTMLDivElement>(null);
  const isPrivacy = page === "privacy";
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
  const subtitle = isPrivacy
    ? "↳ what we collect, how we use it, your rights"
    : "↳ what's allowed, what's not, what happens when rules break";
  const emoji = isPrivacy ? "🔒" : "📜";

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".legal-reveal",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 85%" },
        }
      );
    }, root);
    return () => ctx.revert();
  }, [page]);

  return (
    <section
      ref={root}
      className="relative px-4 py-20 sm:px-6 sm:py-28"
      style={{ backgroundColor: "var(--color-cream)" }}
    >
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="legal-reveal mb-12 text-center">
          <span className="text-5xl">{emoji}</span>
          <span className="mt-4 block rotate-[-3deg] font-hand text-2xl font-bold text-pink sm:text-3xl">
            {subtitle}
          </span>
          <h1 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl">
            {title}
          </h1>
          <p className="mt-4 font-hand text-base font-bold text-ink/50">
            last updated: {new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Warning box */}
        <div className="legal-reveal mb-10 rounded-2xl border-2 border-dashed border-jet/30 bg-paper p-5">
          <p className="font-body text-sm leading-relaxed text-ink/70">
            <span className="font-bold text-pink">⚠️ Heads up:</span> this is
            auto-generated boilerplate to get us started. For a real production
            site with real users, have a lawyer review it. Especially if you're
            in a regulated jurisdiction (EU/GDPR, California/CCPA, etc.).
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((s, i) => (
            <div key={i} className="legal-reveal">
              <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-jet sm:text-2xl">
                <span className="text-pink">{String(i + 1).padStart(2, "0")}.</span>{" "}
                {s.title}
              </h2>
              <div className="mt-3 space-y-2">
                {s.body.map((p, j) => (
                  <p
                    key={j}
                    className="font-body text-sm leading-relaxed text-ink/80 sm:text-base"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Back-home CTA */}
        <div className="legal-reveal mt-12 flex justify-center gap-3">
          <a
            href="#top"
            data-hover="BACK!"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-jet bg-jet px-6 py-3 font-display text-sm font-bold uppercase tracking-tight text-cream shadow-brutal transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-brutal-lg"
          >
            <span>←</span> home
          </a>
          <a
            href={isPrivacy ? "#/terms" : "#/privacy"}
            data-hover="SWAP!"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-jet bg-toxic px-6 py-3 font-display text-sm font-bold uppercase tracking-tight text-jet shadow-brutal transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-brutal-lg"
          >
            {isPrivacy ? "📜 see terms →" : "🔒 see privacy →"}
          </a>
        </div>
      </div>
    </section>
  );
}
