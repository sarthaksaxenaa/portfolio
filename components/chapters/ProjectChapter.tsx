import type { CSSProperties } from "react";
import type { Chapter, Project } from "@/content/schema";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatTile } from "@/components/ui/StatTile";

type Props = { chapter: Chapter; project: Project; lead: string };

/** A case-study chapter. Colour exists only here: the project's accent tints this section. */
export function ProjectChapter({ chapter, project, lead }: Props) {
  const headingId = `${chapter.id}-heading`;
  return (
    <section
      id={chapter.id}
      aria-labelledby={headingId}
      data-accent={project.accent}
      style={{ "--chapter-accent": project.accent } as CSSProperties}
      className="px-6 py-32"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <SectionHeader chapter={chapter} id={headingId} />

        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-5">
            <p className="text-xl text-text md:text-2xl">{project.summary}</p>
            <p className="text-muted">{lead}</p>
            <p className="text-muted">{project.problem}</p>
          </div>
          <dl className="flex flex-col gap-4 text-sm">
            <div>
              <dt className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Role</dt>
              <dd>{project.role}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Stack</dt>
              <dd>{project.stack.join(" · ")}</dd>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  className="rounded-full px-4 py-2 text-sm font-medium text-bg"
                  style={{ background: project.accent }}
                >
                  Live site
                </a>
              )}
              <a
                href={project.repoUrl}
                className="rounded-full border border-hairline px-4 py-2 text-sm transition-colors hover:border-text"
              >
                Source
              </a>
            </div>
          </dl>
        </div>

        {project.stats.length > 0 && (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {project.stats.map((s) => (
              <StatTile key={s.label} stat={s} />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-6">
          <h3 className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
            Decisions, and what I said no to
          </h3>
          <ol className="grid gap-6 lg:grid-cols-3">
            {project.decisions.map((d, i) => (
              <li
                key={d.context}
                className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface-1 p-6"
              >
                <span className="font-mono text-xs text-[var(--chapter-accent)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="font-medium">{d.context}</p>
                <p className="text-sm text-muted">
                  <span className="text-text">Chose: </span>
                  {d.chosen}
                </p>
                <p className="text-sm text-muted">
                  <span className="text-text">Rejected: </span>
                  {d.rejected.join("; ")}
                </p>
                <p className="text-sm text-muted">
                  <span className="text-text">Why: </span>
                  {d.why}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <ul className="flex flex-wrap gap-2">
          {project.facts.map((f) => (
            <li key={f} className="rounded-full border border-hairline px-3 py-1 text-xs text-muted">
              {f}
            </li>
          ))}
        </ul>

        {project.honestNote && (
          <p className="font-mono text-xs text-muted">
            <span className="text-text">Honest note:</span> {project.honestNote}
          </p>
        )}
      </div>
    </section>
  );
}
