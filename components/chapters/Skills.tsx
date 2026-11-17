import type { ReactNode } from "react";
import { chapterById } from "@/content/chapters";
import { carenexus, rideshare } from "@/content/projects";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { SceneFocus } from "@/components/motion/SceneFocus";
import { RideRace } from "@/components/demos/RideRace";
import { PocketTriage } from "@/components/demos/PocketTriage";
import { TestReplay } from "@/components/demos/TestReplay";

const chapter = chapterById("skills");

type PanelProps = {
  scene: "realtime" | "ai" | "tested";
  order: number;
  name: string;
  kicker: string;
  body: string;
  source: { href: string; label: string };
  children: ReactNode;
};

/** One skill: what it is on the left, a small working piece of the real project on the right. */
function Panel({ scene, order, name, kicker, body, source, children }: PanelProps) {
  return (
    <article
      data-scene={scene}
      aria-labelledby={`skill-${scene}`}
      style={{ "--i": order } as React.CSSProperties}
      className="skill-panel grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] md:gap-12"
    >
      <div className="flex flex-col gap-5">
        <h3 id={`skill-${scene}`} className="flex flex-col leading-[0.9]">
          <span className="chrome font-display text-[clamp(2.4rem,5.5vw,4.5rem)] font-extrabold uppercase tracking-tight">{name}</span>
          <span className="font-serif text-[clamp(1.8rem,3.8vw,3rem)] italic text-text">{kicker}</span>
        </h3>
        <p className="max-w-md text-base leading-relaxed text-muted md:text-lg">{body}</p>
        <ExternalLink
          href={source.href}
          className="self-start font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
        >
          {source.label} ↗
        </ExternalLink>
      </div>
      {children}
    </article>
  );
}

/** What I build: three skills, each shown with a working piece of the project it comes from. */
export function Skills() {
  return (
    <section id="skills" aria-labelledby="skills-heading" className="px-6 py-32">
      <SceneFocus />
      <div className="mx-auto flex max-w-6xl flex-col gap-16 md:gap-24">
        <header data-reveal className="flex flex-col gap-6">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-muted">{chapter.label}</p>
          <h2 id="skills-heading" className="chrome font-display text-[clamp(3.5rem,11vw,9.5rem)] font-extrabold uppercase leading-[0.85] tracking-tight">
            Try the
            <br />
            work
          </h2>
          <p className="max-w-xl text-lg text-muted">
            Three things I build, each as a small working piece of the real project. Press the buttons.
          </p>
        </header>

        <div className="skill-stack flex flex-col gap-20 md:gap-28">
          <Panel
            scene="realtime"
            order={0}
            name="Real-time"
            kicker="Systems"
            body="Two drivers tap Accept on the same ride a few milliseconds apart. RideShare claims the trip in one atomic update, so exactly one of them gets it. Switch the lock off to see the bug it prevents."
            source={{ href: `${rideshare.repoUrl}/blob/main/server/src/socket/tripHandlers.ts`, label: "From RideShare · tripHandlers.ts" }}
          >
            <RideRace />
          </Panel>
          <Panel
            scene="ai"
            order={1}
            name="Applied"
            kicker="AI"
            body="How CareNexus decides urgency without the language model: emergency phrases first, then a TF-IDF search over 50 conditions, then how long it has lasted. The same index the backend builds, running in your browser."
            source={{ href: `${carenexus.repoUrl}/tree/main/backend/app/core/triage`, label: "From CareNexus · triage engine" }}
          >
            <PocketTriage />
          </Panel>
          <Panel
            scene="tested"
            order={2}
            name="Tested"
            kicker="End to end"
            body="Every one of CareNexus's 570 tests, by name, in the order CI runs them: pytest on the backend, Vitest and Playwright on the frontend. A change only ships when all of them pass."
            source={{ href: `${carenexus.repoUrl}/actions`, label: "CareNexus CI runs" }}
          >
            <TestReplay />
          </Panel>
        </div>
      </div>
    </section>
  );
}
