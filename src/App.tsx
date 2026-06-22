import { useCallback, useRef } from "react";
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
import { useHashRoute, wallUrl } from "@/hooks/useHashRoute";
import type { Confession as UserConfession } from "@/lib/confessionsApi";

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

/**
 * WallPage is URL-driven. The wallIdx comes from the hash (#/wall/N → N-1).
 * If no wall is specified (#/wall), it defaults to wall 0 (the newest).
 *
 * The ConfessionWall registers its new-confession handler here so the
 * composer can trigger the flying-note animation.
 */
function WallPage({ wallIdx }: { wallIdx: number }) {
  const newConfessionHandlerRef = useRef<((c: UserConfession) => void) | null>(
    null
  );

  const handleNavigate = useCallback((nextWallIdx: number) => {
    // Update the URL — the route hook will re-render with the new wallIdx
    window.location.hash = wallUrl(nextWallIdx);
  }, []);

  const handleRegisterNewConfessionCb = useCallback(
    (cb: (c: UserConfession) => void) => {
      newConfessionHandlerRef.current = cb;
    },
    []
  );

  const handleComposerSubmitted = useCallback((c: UserConfession) => {
    newConfessionHandlerRef.current?.(c);
  }, []);

  return (
    <>
      <ConfessionWall
        wallIdx={wallIdx}
        onNavigate={handleNavigate}
        onNewConfession={handleRegisterNewConfessionCb}
      />
      <ConfessionComposer
        wallIdx={wallIdx}
        onSubmitted={handleComposerSubmitted}
      />
    </>
  );
}

export default function App() {
  const { route, wallIdx } = useHashRoute();

  return (
    <SmoothScroll>
      <CustomCursor />

      <div className="relative flex min-h-screen flex-col">
        <Navbar />

        <main className="flex-1">
          {route === "whisper" ? (
            <WhisperPage />
          ) : route === "wall" ? (
            <WallPage wallIdx={wallIdx ?? 0} />
          ) : route === "mine" ? (
            <MinePage />
          ) : (
            <HomePage />
          )}
        </main>

        <Footer />
      </div>
    </SmoothScroll>
  );
}
