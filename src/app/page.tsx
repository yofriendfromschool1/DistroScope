import type { Metadata } from "next";
import { Background } from "@/components/background";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { StatsStrip } from "@/components/stats-strip";
import { GraphExplorer } from "@/components/graph-explorer";
import { QuizSection } from "@/components/quiz-section";
import { BeginnerPack } from "@/components/beginner-pack";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { CommandPalette } from "@/components/command-palette";
import { Footer } from "@/components/footer";
import { SectionDivider } from "@/components/section-divider";
import { BackToTop } from "@/components/back-to-top";

/** Quiz deep-links (?q=) and shared comparisons (?c=) get personalized
 *  social preview cards rendered server-side. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = params?.q;
  if (typeof q === "string" && q.length > 0 && q.length < 512) {
    const ogUrl = `/api/og?q=${encodeURIComponent(q)}`;
    return {
      openGraph: {
        images: [
          {
            url: ogUrl,
            width: 1200,
            height: 630,
            alt: "Your DistroScope match results",
          },
        ],
      },
      twitter: { card: "summary_large_image", images: [ogUrl] },
    };
  }
  const c = params?.c;
  if (
    typeof c === "string" &&
    c.length > 0 &&
    c.length < 128 &&
    /^[a-z0-9,-]+$/i.test(c)
  ) {
    const ogUrl = `/api/og?c=${encodeURIComponent(c)}`;
    return {
      openGraph: {
        images: [
          {
            url: ogUrl,
            width: 1200,
            height: 630,
            alt: "DistroScope — distros compared side by side",
          },
        ],
      },
      twitter: { card: "summary_large_image", images: [ogUrl] },
    };
  }
  return {};
}

export default function Home() {
  return (
    <div
      id="top"
      className="relative flex min-h-screen flex-col overflow-x-clip"
    >
      <Background />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <SectionDivider />
        <StatsStrip />
        <SectionDivider />
        <GraphExplorer />
        <SectionDivider />
        <QuizSection />
        <SectionDivider />
        <BeginnerPack />
      </main>
      <Footer />
      <ShortcutsDialog />
      <CommandPalette />
      <BackToTop />
    </div>
  );
}
