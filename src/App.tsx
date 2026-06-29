import { useCallback, useEffect, useRef, useState } from "react";
import SmoothScroll from "@/components/layout/SmoothScroll";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CustomCursor from "@/components/ui/CustomCursor";
import TickerStrip from "@/components/ui/TickerStrip";
import Hero from "@/components/sections/Hero";
import BentoGrid from "@/components/sections/BentoGrid";
import JokeGenerator from "@/components/sections/JokeGenerator";
import FeaturedArticle from "@/components/sections/FeaturedArticle";
import Newsletter from "@/components/sections/Newsletter";
import WhisperWall from "@/components/sections/WhisperWall";
import ConfessionWall from "@/components/sections/ConfessionWall";
import ConfessionComposer from "@/components/sections/ConfessionComposer";
import MyConfessions from "@/components/sections/MyConfessions";
import ConfessionOfTheDay from "@/components/sections/ConfessionOfTheDay";
import DailyStressHoroscope from "@/components/sections/DailyStressHoroscope";
import ConfessionDeepLink from "@/components/sections/ConfessionDeepLink";
import { useHashRoute, wallUrl } from "@/hooks/useHashRoute";
import { getWallStats, type Confession as UserConfession } from "@/lib/confessionsApi";

const WARNINGS = [
  "⚠️ Warning: May cause uncontrollable laughter",
  "Stress level: 0%",
  "100% doctor-defiant",
  "No cap. Just laughs.",
  "Side effects include: smirking, snorting & accidental joy",
  "Certified chaos, delivered fresh",
];

function HomePage() {
  return (
    <>
      <Hero />

      <TickerStrip items={WARNINGS} bg="jet" speed={28} />

      <BentoGrid />

      <ConfessionOfTheDay />

      <JokeGenerator />

      <TickerStrip
        items={[
          "Keep scrolling, keep lol'in",
          "Productivity? Never heard of her",
          "Your inbox misses the nonsense",
          "Built different (literally)",
        ]}
        bg="toxic"
        speed={24}
        reverse
      />

      <FeaturedArticle />

      <Newsletter />
    </>
  );
}

function WhisperPage() {
  return (
    <div className="bg-jet">
      <WhisperWall />
    </div>
  );
}

/** "★ My Confessions" page — shows every confession the current user
 *  has posted, pulled from the backend by ID (tracked in localStorage). */
function MinePage() {
  return <MyConfessions />;
}

/** "🔮 Daily Stress Horoscope" page — deterministic by date, refreshes
 *  at midnight (local time). Same prediction for everyone all day. */
function HoroscopePage() {
  return <DailyStressHoroscope />;
}

/** "🔗 Shared Confession" deep-link page — loads a single confession
 *  by ID from the URL (#/c/<id>). Used when someone clicks a shared
 *  confession link (copy link / X / WhatsApp / native share). */
function ConfessionPage({ id }: { id: string }) {
  return <ConfessionDeepLink id={id} />;
}

/**
 * WallPage is URL-driven. The displayN comes from the hash (#/wall/N).
 * displayN is 1-indexed where 1 = newest wall.
 *
 * The internal wallIdx (used by the backend) is computed as:
 *   wallIdx = totalWalls - displayN
 *
 * Wall numbering is reverse-chronological: when wall 1 fills up, it
 * becomes wall 2, and a fresh wall 1 spawns for new confessions.
 */
function WallPage({ displayN }: { displayN: number }) {
  const [totalWalls, setTotalWalls] = useState(1);
  const newConfessionHandlerRef = useRef<((c: UserConfession) => void) | null>(
    null
  );

  /* Fetch totalWalls on mount + when a new confession is added */
  useEffect(() => {
    let cancelled = false;
    getWallStats().then((stats) => {
      if (cancelled || !stats) return;
      setTotalWalls(stats.totalWalls);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Called by ConfessionWall when a new confession is created. Re-fetches
   *  totalWalls (in case a new wall spawned) then triggers the flying-note
   *  animation via the registered handler. */
  const handleComposerSubmitted = useCallback(
    (c: UserConfession) => {
      // Re-fetch stats — a new wall may have spawned
      getWallStats().then((stats) => {
        if (stats) setTotalWalls(stats.totalWalls);
        newConfessionHandlerRef.current?.(c);
      });
    },
    []
  );

  /** Navigate to a different wall by displayN (1 = newest).
   *  Updates the URL — the route hook re-renders with the new displayN. */
  const handleNavigate = useCallback((nextDisplayN: number) => {
    window.location.hash = wallUrl(nextDisplayN);
  }, []);

  const handleRegisterNewConfessionCb = useCallback(
    (cb: (c: UserConfession) => void) => {
      newConfessionHandlerRef.current = cb;
    },
    []
  );

  // Compute internal wallIdx (0-indexed, oldest-first) from displayN.
  // displayN=1 (newest) → wallIdx = totalWalls - 1
  // displayN=totalWalls (oldest) → wallIdx = 0
  const internalWallIdx = Math.max(0, totalWalls - displayN);

  return (
    <>
      <ConfessionWall
        wallIdx={internalWallIdx}
        displayN={totalWalls - internalWallIdx}
        totalWalls={totalWalls}
        onNavigate={handleNavigate}
        onNewConfession={handleRegisterNewConfessionCb}
      />
      <ConfessionComposer
        wallIdx={internalWallIdx}
        onSubmitted={handleComposerSubmitted}
      />
    </>
  );
}

export default function App() {
  const { route, wallDisplayN, confessionId } = useHashRoute();

  return (
    <SmoothScroll>
      <CustomCursor />

      <div className="relative flex min-h-screen flex-col">
        <Navbar />

        <main className="flex-1">
          {route === "whisper" ? (
            <WhisperPage />
          ) : route === "wall" ? (
            <WallPage displayN={wallDisplayN ?? 1} />
          ) : route === "mine" ? (
            <MinePage />
          ) : route === "horoscope" ? (
            <HoroscopePage />
          ) : route === "confession" && confessionId ? (
            <ConfessionPage id={confessionId} />
          ) : (
            <HomePage />
          )}
        </main>

        <Footer />
      </div>
    </SmoothScroll>
  );
}
