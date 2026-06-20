import { useCallback, useRef, useState } from "react";
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
import { useHashRoute } from "@/hooks/useHashRoute";
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
 * WallPage holds the shared `wallIdx` state and a ref to the
 * "new confession" handler exposed by ConfessionWall. The composer
 * calls that handler when the user submits, and the new note appears
 * on the wall.
 */
function WallPage() {
  const [wallIdx, setWallIdx] = useState(0);
  // The ConfessionWall registers its new-confession handler here.
  const newConfessionHandlerRef = useRef<((c: UserConfession) => void) | null>(
    null
  );

  const handleWallIdxChange = useCallback(
    (next: number, _direction: 1 | -1) => {
      setWallIdx(next);
    },
    []
  );

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
        onWallIdxChange={handleWallIdxChange}
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
  const route = useHashRoute();

  return (
    <SmoothScroll>
      <CustomCursor />

      <div className="relative flex min-h-screen flex-col">
        <Navbar />

        <main className="flex-1">
          {route === "whisper" ? (
            <WhisperPage />
          ) : route === "wall" ? (
            <WallPage />
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
