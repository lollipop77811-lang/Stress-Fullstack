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

/* localStorage key for tracking which confession IDs are the current
 * user's (shared between Wall, Composer, MyConfessions, and auth sync) */
const MINE_KEY = "osk.confessions.mine.v1";

function loadMine(): string[] {
  try {
    const raw = localStorage.getItem(MINE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveMine(ids: string[]) {
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

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

function WhisperPage({
  auth,
  onAuthClick,
}: {
  auth: ReturnType<typeof useAuth>;
  onAuthClick: () => void;
}) {
  return (
    <div className="bg-jet">
      <WhisperWall auth={auth} onAuthClick={onAuthClick} />
    </div>
  );
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

function WallPage({
  displayN,
  auth,
  onAuthClick,
}: {
  displayN: number;
  auth: ReturnType<typeof useAuth>;
  onAuthClick: () => void;
}) {
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
    // 1. Re-fetch stats (in case a new wall spawned)
    getWallStats().then((stats) => {
      if (stats) setTotalWalls(stats.totalWalls);
    });

    // 2. Add to localStorage "mine" set
    const currentMine = loadMine();
    if (!currentMine.includes(c.id)) {
      saveMine([...currentMine, c.id]);
    }

    // 3. If logged in, auto-sync to account
    if (auth.user && auth.firebaseEnabled) {
      auth.user.getIdToken().then((idToken) => {
        const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";
        fetch(`${API_URL}/account/sync-confessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ confessionIds: [c.id] }),
        }).catch((err) => console.warn("[auto-sync] failed:", err));
      });
    }

    // 4. Trigger the flying-note animation
    newConfessionHandlerRef.current?.(c);
  }, [auth.user, auth.firebaseEnabled]);

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
        auth={auth}
        onAuthClick={onAuthClick}
      />
    </>
  );
}

export default function App() {
  const { route, wallDisplayN, confessionId } = useHashRoute();
  const auth = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  /* Cross-device sync: when user logs in, merge account confession IDs
   * with localStorage so "★ yours" badges appear on all devices */
  useEffect(() => {
    if (!auth.user || !auth.account) return;

    const accountIds = auth.account.confessionIds || [];
    if (accountIds.length === 0) return;

    const localIds = loadMine();
    const mergedSet = new Set([...localIds, ...accountIds]);
    const merged = [...mergedSet];

    // Only save if something new was added
    if (merged.length > localIds.length) {
      saveMine(merged);
      console.log(`[cross-device sync] merged ${merged.length - localIds.length} confession IDs from account`);
    }

    // Also push any local-only IDs up to the account
    const localOnly = localIds.filter((id) => !accountIds.includes(id));
    if (localOnly.length > 0) {
      auth.user.getIdToken().then((idToken) => {
        const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";
        fetch(`${API_URL}/account/sync-confessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ confessionIds: localOnly }),
        }).catch((err) => console.warn("[cross-device sync] upload failed:", err));
      });
    }
  }, [auth.user, auth.account]);

  return (
    <SmoothScroll>
      <CustomCursor />

      <div className="relative flex min-h-[100dvh] flex-col">
        <Navbar
          auth={auth}
          onAuthClick={() => setShowAuthModal(true)}
        />

        <main className="flex-1">
          {route === "whisper" ? (
            <WhisperPage auth={auth} onAuthClick={() => setShowAuthModal(true)} />
          ) : route === "wall" ? (
            <WallPage
              displayN={wallDisplayN ?? 1}
              auth={auth}
              onAuthClick={() => setShowAuthModal(true)}
            />
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

      {/* Auth modal — triggered from Navbar or post-confession claim toast */}
      <AuthModal
        show={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        auth={auth}
      />
    </SmoothScroll>
  );
}
