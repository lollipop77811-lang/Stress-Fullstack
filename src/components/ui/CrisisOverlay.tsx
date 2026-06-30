import { motion, AnimatePresence } from "framer-motion";

/**
 * CrisisOverlay — shown when a user posts a confession containing
 * self-harm / crisis language. The confession is still saved (not
 * silenced), but the user sees this supportive overlay with crisis
 * resources instead of the normal success toast.
 */
export default function CrisisOverlay({
  show,
  onClose,
}: {
  show: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[400] grid place-items-center bg-jet/85 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border-[3px] border-cream bg-jet p-7 text-cream shadow-brutal-xl sm:p-10"
          >
            {/* Top accent bar */}
            <div className="absolute left-0 right-0 top-0 h-2 bg-pink" />

            {/* Heart emoji */}
            <div className="mb-4 text-6xl">💙</div>

            {/* Title */}
            <h2 className="font-display text-3xl font-extrabold uppercase leading-[0.9] tracking-tight text-cream sm:text-4xl">
              You matter.
            </h2>
            <p className="mt-4 font-body text-base leading-relaxed text-cream/85 sm:text-lg">
              Your confession was posted — it's on the wall. But we noticed
              something in your words, and we want you to know:
              <span className="mt-2 block font-hand text-xl font-bold text-toxic">
                you are not alone. please reach out if you're struggling.
              </span>
            </p>

            {/* Crisis resources */}
            <div className="mt-6 space-y-3 border-t-2 border-cream/20 pt-6">
              <p className="font-display text-xs font-extrabold uppercase tracking-widest text-toxic">
                💙 Crisis Resources
              </p>

              <a
                href="https://988lifeline.org"
                target="_blank"
                rel="noopener noreferrer"
                data-hover="CALL!"
                className="block rounded-xl border-2 border-cream bg-pink px-4 py-3 transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div className="font-display text-base font-extrabold uppercase tracking-tight text-cream">
                  🇺🇸 988 Suicide & Crisis Lifeline
                </div>
                <div className="mt-0.5 text-sm text-cream/80">
                  Call or text <span className="font-bold">988</span> — free, 24/7,
                  confidential. Or chat at 988lifeline.org
                </div>
              </a>

              <a
                href="https://www.crisistextline.org"
                target="_blank"
                rel="noopener noreferrer"
                data-hover="TEXT!"
                className="block rounded-xl border-2 border-cream bg-electric px-4 py-3 transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div className="font-display text-base font-extrabold uppercase tracking-tight text-cream">
                  💬 Crisis Text Line
                </div>
                <div className="mt-0.5 text-sm text-cream/80">
                  Text <span className="font-bold">HOME</span> to{" "}
                  <span className="font-bold">741741</span> — free, 24/7 text-based
                  crisis counseling.
                </div>
              </a>

              <a
                href="https://findahelpline.com"
                target="_blank"
                rel="noopener noreferrer"
                data-hover="FIND!"
                className="block rounded-xl border-2 border-cream bg-toxic px-4 py-3 text-jet transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div className="font-display text-base font-extrabold uppercase tracking-tight">
                  🌍 International Helplines
                </div>
                <div className="mt-0.5 text-sm opacity-80">
                  Find a crisis helpline in your country at findahelpline.com
                </div>
              </a>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              data-hover="CLOSE"
              className="mt-6 w-full rounded-xl border-2 border-cream bg-jet px-5 py-3 font-display text-sm font-bold uppercase tracking-tight text-cream transition-transform duration-150 hover:-translate-y-0.5"
            >
              I'm okay — close this
            </button>

            <p className="mt-3 text-center font-hand text-sm font-bold text-cream/50">
              ↳ your confession is still on the wall. the wall hears you.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
