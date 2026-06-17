import SmoothScroll from "@/components/layout/SmoothScroll";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CustomCursor from "@/components/ui/CustomCursor";
import TickerStrip from "@/components/ui/TickerStrip";
import Hero from "@/components/sections/Hero";
import BentoGrid from "@/components/sections/BentoGrid";
import JokeGenerator from "@/components/sections/JokeGenerator";
import MoodMeter from "@/components/sections/MoodMeter";
import StressWall from "@/components/sections/StressWall";
import FeaturedArticle from "@/components/sections/FeaturedArticle";
import StressTestQuiz from "@/components/sections/StressTestQuiz";
import MemeGallery from "@/components/sections/MemeGallery";
import Newsletter from "@/components/sections/Newsletter";

const WARNINGS = [
  "⚠️ Warning: May cause uncontrollable laughter",
  "Stress level: 0%",
  "100% doctor-defiant",
  "No cap. Just laughs.",
  "Side effects include: smirking, snorting & accidental joy",
  "Certified chaos, delivered fresh",
];

export default function App() {
  return (
    <SmoothScroll>
      <CustomCursor />

      <div className="relative flex min-h-screen flex-col">
        <Navbar />

        <main className="flex-1">
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

          <MoodMeter />

          <StressWall />

          <FeaturedArticle />

          <StressTestQuiz />

          <MemeGallery />

          <Newsletter />
        </main>

        <Footer />
      </div>
    </SmoothScroll>
  );
}
