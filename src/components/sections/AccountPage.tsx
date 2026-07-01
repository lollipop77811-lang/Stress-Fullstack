import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAuth } from "@/hooks/useAuth";

gsap.registerPlugin(ScrollTrigger);

export default function AccountPage({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const root = useRef<HTMLDivElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".ac-reveal",
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
  }, []);

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      const idToken = await auth.user?.getIdToken();
      if (!idToken) throw new Error("not logged in");
      await fetch("/api/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      await auth.logout();
    } catch (err) {
      console.error("delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  if (!auth.user || !auth.account) {
    return (
      <section className="relative px-4 py-20 sm:px-6 sm:py-28" style={{ backgroundColor: "var(--color-cream)" }}>
        <div className="mx-auto max-w-md text-center">
          <p className="font-hand text-xl font-bold text-ink/60">not logged in.</p>
          <a href="#top" className="mt-4 inline-block rounded-xl border-2 border-jet bg-jet px-6 py-3 font-display text-sm font-bold uppercase text-cream shadow-brutal">
            ← home
          </a>
        </div>
      </section>
    );
  }

  const { account } = auth;

  return (
    <section ref={root} className="relative px-4 py-20 sm:px-6 sm:py-28" style={{ backgroundColor: "var(--color-cream)" }}>
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="ac-reveal mb-10 text-center">
          <span className="text-5xl">👤</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl">
            Account
          </h1>
          <p className="mt-3 font-hand text-lg font-bold text-ink/60">
            ↳ your confessions are still anonymous. this is just for syncing.
          </p>
        </div>

        {/* Account card */}
        <div className="ac-reveal relative overflow-hidden rounded-[2rem] border-[3px] border-jet bg-cream p-7 shadow-brutal-xl sm:p-10">
          {/* Username */}
          <div className="mb-6">
            <label className="font-display text-[10px] font-extrabold uppercase tracking-widest text-ink/50">Username</label>
            <p className="font-display text-3xl font-extrabold uppercase tracking-tight text-jet">{account.username}</p>
          </div>

          {/* Email */}
          <div className="mb-6">
            <label className="font-display text-[10px] font-extrabold uppercase tracking-widest text-ink/50">Email</label>
            <p className="font-body text-base font-medium text-jet">{account.email}</p>
            {!account.emailVerified && (
              <span className="mt-1 inline-block rounded-full border-2 border-pink bg-pink/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pink">
                ⚠️ not verified — check your gmail
              </span>
            )}
            {account.emailVerified && (
              <span className="mt-1 inline-block rounded-full border-2 border-green-600 bg-green-50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                ✓ verified
              </span>
            )}
          </div>

          {/* Provider */}
          <div className="mb-6">
            <label className="font-display text-[10px] font-extrabold uppercase tracking-widest text-ink/50">Sign-in method</label>
            <p className="font-body text-base font-medium text-jet capitalize">{account.provider}</p>
          </div>

          {/* Synced confessions */}
          <div className="mb-6 border-t-2 border-jet/15 pt-6">
            <label className="font-display text-[10px] font-extrabold uppercase tracking-widest text-ink/50">Synced confessions</label>
            <p className="font-display text-4xl font-extrabold text-electric">{account.confessionIds.length}</p>
            <p className="font-body text-sm text-ink/60">accessible from any device when you log in</p>
          </div>

          {/* Sign out */}
          <button
            onClick={() => auth.logout()}
            data-hover="BYE!"
            className="w-full rounded-xl border-2 border-jet bg-jet px-5 py-3 font-display text-sm font-bold uppercase tracking-tight text-cream shadow-brutal transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-brutal-lg"
          >
            Sign Out
          </button>

          {/* Delete account */}
          <div className="mt-4 border-t-2 border-dashed border-jet/20 pt-4">
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="text-xs font-bold uppercase tracking-wide text-pink hover:underline"
              >
                🗑️ delete my account
              </button>
            ) : (
              <div className="space-y-2">
                <p className="rounded-lg border-2 border-pink bg-pink/10 px-3 py-2 text-xs font-bold text-pink">
                  ⚠️ this permanently deletes your account. your confessions stay on the wall (they're anonymous) but you'll lose your "★ yours" badges on other devices.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 rounded-lg border-2 border-jet bg-pink px-4 py-2 font-display text-xs font-bold uppercase tracking-tight text-cream shadow-sm"
                  >
                    {deleting ? "deleting…" : "yes, delete forever"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="rounded-lg border-2 border-jet bg-cream px-4 py-2 font-display text-xs font-bold uppercase tracking-tight text-jet shadow-sm"
                  >
                    cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back-home CTA */}
        <div className="ac-reveal mt-8 flex justify-center gap-3">
          <a href="#top" data-hover="BACK!" className="inline-flex items-center gap-2 rounded-xl border-2 border-jet bg-jet px-6 py-3 font-display text-sm font-bold uppercase tracking-tight text-cream shadow-brutal">
            ← home
          </a>
          <a href="#/mine" data-hover="MINE!" className="inline-flex items-center gap-2 rounded-xl border-2 border-jet bg-toxic px-6 py-3 font-display text-sm font-bold uppercase tracking-tight text-jet shadow-brutal">
            ★ my confessions
          </a>
        </div>
      </div>
    </section>
  );
}
