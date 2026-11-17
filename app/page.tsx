import { Nav } from "@/components/ui/Nav";
import { Warmup } from "@/components/chapters/Warmup";
import { Work } from "@/components/chapters/Work";
import { Grind } from "@/components/chapters/Grind";
import { ProjectChapter } from "@/components/chapters/ProjectChapter";
import { Overload } from "@/components/chapters/Overload";
import { Cooldown } from "@/components/chapters/Cooldown";
import { chapterById } from "@/content/chapters";
import { carenexus, rideshare } from "@/content/projects";
import { buildStructuredData, serializeJsonLd } from "@/lib/structuredData";

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildStructuredData()) }} />
      <Nav />
      <main id="main">
        <Warmup />
        <Work />
        <Grind />
        <ProjectChapter
          chapter={chapterById("rideshare")}
          project={rideshare}
          lead="The first set with real weight: money, concurrency and live location, all at once."
        />
        <ProjectChapter
          chapter={chapterById("carenexus")}
          project={carenexus}
          lead="The turning point. I found my own retriever matching the wrong words, fixed the cause, and stopped trusting any number I had not measured."
        />
        <Overload />
        <Cooldown />
      </main>
    </>
  );
}
