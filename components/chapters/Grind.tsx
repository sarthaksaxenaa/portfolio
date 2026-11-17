import { ExternalLink } from "@/components/ui/ExternalLink";
import { chapterById } from "@/content/chapters";
import { profile } from "@/content/profile";
import { prodigy, skillmatrix } from "@/content/projects";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatTile } from "@/components/ui/StatTile";

const reps = [
  { value: "500+", label: "DSA problems, LeetCode and GeeksforGeeks" },
  { value: "1645", label: "Peak LeetCode rating" },
  { value: profile.education.cgpa ?? "", label: `CGPA, ${profile.education.years}` },
];

export function Grind() {
  const chapter = chapterById("grind");
  return (
    <section id="grind" aria-labelledby="grind-heading" className="px-6 py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-16">
        <SectionHeader chapter={chapter} id="grind-heading" />
        <p data-fill className="max-w-3xl text-2xl leading-snug text-text md:text-3xl">
          It started the way it starts for everyone: tutorials, then the uncomfortable part where
          the tutorials stop. So, reps. Lots of small, boring, unglamorous reps.
        </p>

        <dl className="grid gap-8 sm:grid-cols-3">
          {reps.map((r) => (
            <div key={r.label} data-reveal className="flex flex-col gap-2 border-t border-hairline pt-4">
              <dt className="order-2 text-sm text-muted">{r.label}</dt>
              <dd className="order-1 font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-none tracking-tight">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-6 md:grid-cols-2">
          <article data-reveal className="flex flex-col gap-4 light-card rounded-2xl border border-hairline bg-surface-1 p-6">
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
              First paid rep · {prodigy.period}
            </p>
            <h3 className="text-2xl font-semibold">
              {prodigy.title}, {prodigy.company}
            </h3>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted">
              {prodigy.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-6 pt-2">
              {prodigy.stats.map((s) => (
                <StatTile key={s.label} stat={s} />
              ))}
            </div>
          </article>

          <div className="flex flex-col gap-6">
            <article data-reveal className="flex flex-col gap-3 light-card rounded-2xl border border-hairline bg-surface-1 p-6">
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
                Smart India Hackathon 2025 · internal round
              </p>
              <h3 className="text-xl font-semibold">ExamGuard</h3>
              <p className="text-muted">
                Proposed and architected an AI-based online exam proctoring system.
              </p>
            </article>
            <article data-reveal className="flex flex-col gap-3 light-card rounded-2xl border border-hairline bg-surface-1 p-6">
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
                Side project · {skillmatrix.stack.join(" · ")}
              </p>
              <h3 className="text-xl font-semibold">
                <ExternalLink href={skillmatrix.repoUrl} className="underline-offset-4 hover:underline">
                  {skillmatrix.name}
                </ExternalLink>
              </h3>
              <p className="text-muted">{skillmatrix.summary}</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
