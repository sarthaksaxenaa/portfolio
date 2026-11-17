import Image from "next/image";
import { chapterById } from "@/content/chapters";
import { carenexus, rideshare } from "@/content/projects";
import type { Project } from "@/content/schema";
import { ExternalLink } from "@/components/ui/ExternalLink";

const chapter = chapterById("work");

/** A laptop drawn in CSS; its screen steps through the project's shots as it scrolls past. */
function Laptop({ project }: { project: Project }) {
  return (
    <div data-device data-shots={project.shots.length} className="device">
      <div className="device-tilt">
        <div className="laptop-screen">
          <div className="laptop-glass">
            {project.shots.map((s, i) => (
              <Image
                key={s.src}
                src={s.src}
                alt={i === 0 ? s.alt : ""}
                aria-hidden={i === 0 ? undefined : true}
                data-shot={i}
                fill
                sizes="(min-width: 768px) 56vw, 92vw"
                className="laptop-shot"
              />
            ))}
          </div>
        </div>
        <div className="laptop-base" aria-hidden="true" />
        {project.phoneShot && (
          <div className="phone" aria-hidden="true">
            <Image src={project.phoneShot.src} alt="" width={360} height={779} sizes="(min-width: 768px) 13vw, 22vw" />
          </div>
        )}
      </div>
    </div>
  );
}

function Featured({ project, flip }: { project: Project; flip?: boolean }) {
  return (
    <article
      aria-labelledby={`work-${project.slug}`}
      className={`grid items-center gap-10 md:gap-16 md:grid-cols-[1.25fr_1fr] ${flip ? "md:[&>*:first-child]:order-2 md:grid-cols-[1fr_1.25fr]" : ""}`}
    >
      <Laptop project={project} />
      <div data-reveal className="flex flex-col gap-5">
        <h3 id={`work-${project.slug}`} className="flex flex-col leading-[0.9]">
          <span className="chrome font-display text-[clamp(2.75rem,6.5vw,5.5rem)] font-extrabold uppercase tracking-tight">
            {project.name}
          </span>
          {project.kicker && <span className="font-serif text-[clamp(2rem,4.5vw,3.5rem)] italic text-text">{project.kicker}</span>}
        </h3>
        <p className="max-w-md text-lg text-muted">{project.summary}</p>
        {project.highlights && (
          <ul className="flex flex-col gap-2.5 border-l border-hairline pl-4">
            {project.highlights.map((h) => (
              <li key={h} className="text-sm text-text md:text-base">
                {h}
              </li>
            ))}
          </ul>
        )}
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">{project.stack.slice(0, 6).join(" · ")}</p>
        <div className="flex flex-wrap gap-3">
          {project.liveUrl && (
            <ExternalLink
              href={project.liveUrl}
              data-magnetic
              className="rounded-full bg-text px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-85"
            >
              Live site
            </ExternalLink>
          )}
          <ExternalLink
            href={project.repoUrl}
            data-magnetic
            className="rounded-full border border-hairline px-5 py-2.5 text-sm text-text transition-colors hover:border-text"
          >
            Code
          </ExternalLink>
          {/* A plain link: the case study is its own page, and a full load lets the page-wide effects
              (reveals, pinned decisions) set themselves up for it. */}
          <a
            href={`/work/${project.slug}`}
            className="rounded-full px-3 py-2.5 text-sm text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
          >
            Case study
          </a>
        </div>
      </div>
    </article>
  );
}

/** Featured engineering: each project on a laptop that steps through its real screens. */
export function Work() {
  return (
    <section id="work" aria-labelledby="work-heading" className="relative mx-auto max-w-7xl overflow-x-clip px-6 py-24 md:py-36">
      <div className="mb-16 flex flex-col gap-3 md:mb-24">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-muted">{chapter.label}</p>
        <h2
          id="work-heading"
          className="chrome font-display text-[clamp(3rem,10vw,8.5rem)] font-extrabold uppercase leading-[0.86] tracking-tight"
        >
          Featured
          <br />
          Engineering
        </h2>
      </div>
      <div className="flex flex-col gap-28 md:gap-40">
        <Featured project={rideshare} />
        <Featured project={carenexus} flip />
      </div>
    </section>
  );
}
