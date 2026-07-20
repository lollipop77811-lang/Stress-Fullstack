import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

/* ============================================================
   ShareButtons — reuse across ConfessionWall modal, MyConfessions
   modal, and the deep-link confession page.
   ============================================================ */

type Props = {
  /** The confession text (used as the share message body). */
  text: string;
  /** The author name (included in the share message). */
  author: string;
  /** The confession ID — used to build the deep-link URL. */
  id: string;
  /** Optional className for the container. */
  className?: string;
};

/** Build the shareable deep-link URL for a confession.
 *  Format: {origin}/#/c/{id}  */
export function confessionShareUrl(id: string): string {
  if (typeof window === "undefined") return `/#/c/${id}`;
  return `${window.location.origin}${window.location.pathname}#/c/${id}`;
}

/** Build the share message text for a confession. */
function buildShareText(text: string, author: string): string {
  // Truncate long confessions so the URL fits in tweet/X character limits
  const maxText = 180;
  const truncated = text.length > maxText ? text.slice(0, maxText) + "…" : text;
  return `"${truncated}" — ${author}\n\nvia O Stress Kal Ana`;
}

export default function ShareButtons({ text, author, id, className }: Props) {
  const [copied, setCopied] = useState(false);
  const shareUrl = confessionShareUrl(id);
  const shareText = buildShareText(text, author);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select-text prompt
      window.prompt("Copy this:", `${shareText}\n${shareUrl}`);
    }
  };

  const shareX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(shareUrl)}`;
    // On mobile, don't pass window size — popup blockers will reject it
    // and the size is wrong for small screens anyway. Plain _blank opens
    // a new tab which mobile browsers handle natively.
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    window.open(url, "_blank", isMobile ? "noopener,noreferrer" : "noopener,noreferrer,width=600,height=500");
  };

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(
      `${shareText}\n${shareUrl}`
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareNative = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "O Stress Kal Ana — Confession",
          text: shareText,
          url: shareUrl,
        });
      } catch {
        /* user cancelled — no-op */
      }
    } else {
      copyLink();
    }
  };

  const hasNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Copy link */}
      <motion.button
        onClick={copyLink}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        data-hover="COPY!"
        aria-label="Copy link"
        className={cn(
          "inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-jet px-4 py-2.5 font-display text-xs font-bold uppercase tracking-tight shadow-[2px_2px_0_#0b0c10] transition-[transform,box-shadow] duration-150",
          copied
            ? "bg-toxic text-jet"
            : "bg-cream text-jet hover:shadow-[3px_3px_0_#0b0c10]"
        )}
      >
        <span>{copied ? "✓" : "🔗"}</span>
        {copied ? "copied!" : "copy link"}
      </motion.button>

      {/* X / Twitter */}
      <motion.button
        onClick={shareX}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        data-hover="TWEET!"
        aria-label="Share on X"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-jet bg-jet px-4 py-2.5 font-display text-xs font-bold uppercase tracking-tight text-cream shadow-[2px_2px_0_#0b0c10] transition-[transform,box-shadow] duration-150 hover:shadow-[3px_3px_0_#0b0c10]"
      >
        <span>𝕏</span>
        post
      </motion.button>

      {/* WhatsApp */}
      <motion.button
        onClick={shareWhatsApp}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        data-hover="SEND!"
        aria-label="Share on WhatsApp"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-jet bg-[#25D366] px-4 py-2.5 font-display text-xs font-bold uppercase tracking-tight text-jet shadow-[2px_2px_0_#0b0c10] transition-[transform,box-shadow] duration-150 hover:shadow-[3px_3px_0_#0b0c10]"
      >
        <span>💬</span>
        whatsapp
      </motion.button>

      {/* Native share sheet (mobile / supported browsers) */}
      {hasNativeShare && (
        <motion.button
          onClick={shareNative}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          data-hover="SHARE!"
          aria-label="Share via device"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 border-jet bg-electric px-4 py-2.5 font-display text-xs font-bold uppercase tracking-tight text-cream shadow-[2px_2px_0_#0b0c10] transition-[transform,box-shadow] duration-150 hover:shadow-[3px_3px_0_#0b0c10]"
        >
          <span>📤</span>
          share
        </motion.button>
      )}
    </div>
  );
}
