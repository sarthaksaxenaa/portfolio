import { Nav } from "@/components/ui/Nav";
import { Warmup } from "@/components/chapters/Warmup";
import { Work } from "@/components/chapters/Work";
import { Grind } from "@/components/chapters/Grind";
import { Skills } from "@/components/chapters/Skills";
import { Cooldown } from "@/components/chapters/Cooldown";
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
        <Skills />
        <Cooldown />
      </main>
    </>
  );
}
