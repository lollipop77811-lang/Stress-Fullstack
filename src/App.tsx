import { useCallback, useEffect, useRef, useState } from "react";
import SmoothScroll from "@/components/layout/SmoothScroll";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CustomCursor from "@/components/ui/CustomCursor";
import TickerStrip from "@/components/ui/TickerStrip";
import AuthModal from "@/components/ui/AuthModal";
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
import LegalPage from "@/components/sections/LegalPage";
import AccountPage from "@/components/sections/AccountPage";
import { useHashRoute, wallUrl } from "@/hooks/useHashRoute";
import { useAuth } from "@/hooks/useAuth";
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
        items={["Keep scrolling, keep lol'in", "Productivity? Never heard of her", "Your inbox misses the nonsense", "Built different (literally)"]}
        bg="toxic" speed={24} reverse
      />
      <FeaturedArticle />
      <Newsletter />
    </>
  );
}

function WhisperPage() {
  return <div className="bg-jet"><WhisperWall /></div>;
}

function MinePage() {
  return <MyConfessions />;
}

function HoroscopePage() {
  return <DailyStressHoroscope />;
}

function ConfessionPage({ id }: { id: string }) {
  return <ConfessionDeepLink id={id} />;
}

function WallPage({ displayN }: { displayN: number }) {
  const [totalWalls, setTotalWalls] = useState(1);
  const newConfessionHandlerRef = useRef<((c: UserConfession) => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWallStats().then((stats) => {
      if (cancelled || !stats) return;
      setTotalWalls(stats.totalWalls);
    });
    return () => { cancelled = true; };
  }, []);

  const handleComposerSubmitted = useCallback((c: UserConfession) => {
    getWallStats().then((stats) => {
      if (stats) setTotalWalls(stats.totalWalls);
      newConfessionHandlerRef.current?.(c);
    });
  }, []);

  const handleNavigate = useCallback((nextDisplayN: number) => {
    window.location.hash = wallUrl(nextDisplayN);
  }, []);

  const handleRegisterNewConfessionCb = useCallback((cb: (c: UserConfession) => void) => {
    newConfessionHandlerRef.current = cb;
  }, []);

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
  const auth = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <SmoothScroll>
      <CustomCursor />

      <div className="relative flex min-h-screen flex-col">
        <Navbar
          auth={auth}
          onAuthClick={() => setShowAuthModal(true)}
        />

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
          ) : route === "privacy" ? (
            <LegalPage page="privacy" />
          ) : route === "terms" ? (
            <LegalPage page="terms" />
          ) : route === "account" ? (
            <AccountPage auth={auth} />
          ) : (
            <HomePage />
          )}
        </main>

        <Footer />
      </div>

      {/* Auth modal — triggered from Navbar */}
      <AuthModal
        show={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        auth={auth}
      />
    </SmoothScroll>
  );
}
