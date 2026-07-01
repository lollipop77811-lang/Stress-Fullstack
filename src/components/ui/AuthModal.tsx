import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/useAuth";

type Mode = "login" | "signup" | "reset";

export default function AuthModal({
  show,
  onClose,
  auth,
}: {
  show: boolean;
  onClose: () => void;
  auth: ReturnType<typeof useAuth>;
}) {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);
    setBusy(true);

    try {
      if (mode === "signup") {
        await auth.signUpWithEmail(email, password, username);
        setSuccessMsg("account created! check your gmail for a verification link.");
        setTimeout(() => onClose(), 3000);
      } else if (mode === "login") {
        await auth.signInWithEmail(email, password);
        onClose();
      } else if (mode === "reset") {
        await auth.resetPassword(email);
        setSuccessMsg("password reset email sent. check your gmail.");
        setMode("login");
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setLocalError(null);
    setBusy(true);
    try {
      await auth.signInWithGoogle();
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleUsernameCheck = async (val: string) => {
    setUsername(val);
    if (val.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(val)}`);
      const data = await res.json();
      setUsernameAvailable(data.available);
    } catch {
      setUsernameAvailable(null);
    }
  };

  const titles: Record<Mode, string> = {
    signup: "Create Account",
    login: "Sign In",
    reset: "Reset Password",
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[400] grid place-items-center bg-jet/80 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.85, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border-[3px] border-jet bg-cream p-6 shadow-brutal-xl sm:p-8"
          >
            {/* Close */}
            <button
              onClick={onClose}
              data-hover="CLOSE"
              aria-label="Close"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg border-2 border-jet bg-cream text-lg font-bold transition-transform hover:rotate-90"
            >
              ✕
            </button>

            {/* Header */}
            <div className="mb-1 text-4xl">{mode === "reset" ? "🔑" : "🤫"}</div>
            <h3 className="font-display text-2xl font-extrabold uppercase leading-tight tracking-tight">
              {titles[mode]}
            </h3>
            <p className="mt-1 font-body text-sm text-ink/60">
              {mode === "signup" && "optional — sync your confessions across devices. confessions stay anonymous."}
              {mode === "login" && "welcome back. your confessions are waiting."}
              {mode === "reset" && "we'll send a reset link to your gmail."}
            </p>

            {/* Google button (signup + login only) */}
            {mode !== "reset" && (
              <button
                onClick={handleGoogle}
                disabled={busy || !auth.firebaseEnabled}
                data-hover="GOOGLE!"
                className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-jet bg-cream px-5 py-3 font-display text-sm font-bold uppercase tracking-tight shadow-brutal-sm transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-brutal disabled:opacity-50"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            )}

            {/* Divider */}
            {mode !== "reset" && (
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-jet/15" />
                <span className="font-hand text-sm font-bold text-ink/40">or</span>
                <div className="h-px flex-1 bg-jet/15" />
              </div>
            )}

            {/* Email form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <div>
                  <label className="mb-1 block font-display text-[10px] font-extrabold uppercase tracking-widest text-ink/60">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameCheck(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
                    placeholder="stressball_42"
                    maxLength={20}
                    required
                    className="w-full rounded-xl border-2 border-jet bg-cream px-4 py-2.5 font-body text-sm font-medium text-jet shadow-brutal-sm outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-[transform,box-shadow] duration-150"
                  />
                  {usernameAvailable === true && (
                    <span className="text-[10px] font-bold text-green-600">✓ available</span>
                  )}
                  {usernameAvailable === false && (
                    <span className="text-[10px] font-bold text-pink">✗ taken or reserved</span>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block font-display text-[10px] font-extrabold uppercase tracking-widest text-ink/60">
                  Gmail Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@gmail.com"
                  required
                  className="w-full rounded-xl border-2 border-jet bg-cream px-4 py-2.5 font-body text-sm font-medium text-jet shadow-brutal-sm outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-[transform,box-shadow] duration-150"
                />
                {mode === "signup" && email && !email.toLowerCase().endsWith("@gmail.com") && (
                  <span className="text-[10px] font-bold text-pink">⚠️ only @gmail.com addresses are allowed</span>
                )}
              </div>

              {mode !== "reset" && (
                <div>
                  <label className="mb-1 block font-display text-[10px] font-extrabold uppercase tracking-widest text-ink/60">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full rounded-xl border-2 border-jet bg-cream px-4 py-2.5 font-body text-sm font-medium text-jet shadow-brutal-sm outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-[transform,box-shadow] duration-150"
                  />
                </div>
              )}

              {/* Error / success messages */}
              {(localError || auth.error) && (
                <p className="rounded-lg border-2 border-pink bg-pink/10 px-3 py-2 text-xs font-bold text-pink">
                  {localError || auth.error}
                </p>
              )}
              {successMsg && (
                <p className="rounded-lg border-2 border-green-600 bg-green-50 px-3 py-2 text-xs font-bold text-green-700">
                  ✓ {successMsg}
                </p>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={busy}
                whileHover={!busy ? { y: -2 } : undefined}
                whileTap={!busy ? { scale: 0.97 } : undefined}
                className={cn(
                  "w-full rounded-xl border-2 border-jet px-5 py-3 font-display text-sm font-bold uppercase tracking-tight shadow-brutal transition-[transform,box-shadow] duration-150",
                  busy ? "cursor-wait bg-paper text-jet/50" : "bg-electric text-cream hover:-translate-y-0.5 hover:shadow-brutal-lg"
                )}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>⏳</motion.span>
                    Please wait…
                  </span>
                ) : mode === "signup" ? "Create Account →" : mode === "login" ? "Sign In →" : "Send Reset Link →"}
              </motion.button>
            </form>

            {/* Mode switcher */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
              {mode !== "signup" && (
                <button onClick={() => { setMode("signup"); setLocalError(null); setSuccessMsg(null); }} className="text-xs font-bold uppercase tracking-wide text-electric hover:underline">
                  Create account
                </button>
              )}
              {mode !== "login" && (
                <button onClick={() => { setMode("login"); setLocalError(null); setSuccessMsg(null); }} className="text-xs font-bold uppercase tracking-wide text-electric hover:underline">
                  Sign in
                </button>
              )}
              {mode !== "reset" && (
                <button onClick={() => { setMode("reset"); setLocalError(null); setSuccessMsg(null); }} className="text-xs font-bold uppercase tracking-wide text-pink hover:underline">
                  Forgot password?
                </button>
              )}
            </div>

            {/* Firebase not configured warning */}
            {!auth.firebaseEnabled && (
              <p className="mt-3 rounded-lg border-2 border-dashed border-jet/30 bg-paper px-3 py-2 text-[10px] font-bold text-ink/50">
                ⚠️ auth is not configured. set VITE_FIREBASE_* env vars to enable.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
