import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { ProjectChapter } from "@/components/chapters/ProjectChapter";
import { chapterById } from "@/content/chapters";
import { caseStudies, caseStudyBySlug, nextCaseStudy } from "@/content/caseStudies";
import type { ChapterId } from "@/content/schema";

/** The case studies are prerendered. Any other slug reaches the page and gets notFound() (with Cache
 *  Components on, the dynamicParams config is not available for this). */
export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(props: PageProps<"/work/[slug]">): Promise<Metadata> {
  const cs = caseStudyBySlug((await props.params).slug);
  if (!cs) return {};
  const title = `${cs.project.name} case study · Sarthak Saxena`;
  const description = `${cs.project.summary} Decisions, trade-offs and measured results from building ${cs.project.name}.`;
  const url = `/work/${cs.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title, description },
    twitter: { title, description },
  };
}

/** A case study on its own page: the decisions and measured numbers behind a featured project. */
export default async function CaseStudyPage(props: PageProps<"/work/[slug]">) {
  const cs = caseStudyBySlug((await props.params).slug);
  if (!cs) notFound();
  const next = nextCaseStudy(cs.slug);
  return (
    <>
      <Nav base="/" />
      <main id="main" className="pt-16">
        <div className="mx-auto max-w-6xl px-6 pt-10">
          {/* A full load on purpose: the home page's effects (reveals, demos, scene) set up on load. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/#work"
            className="font-mono text-xs uppercase tracking-[0.2em] text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
          >
            ← All work
          </a>
        </div>
        <ProjectChapter chapter={chapterById(cs.slug as ChapterId)} project={cs.project} lead={cs.lead} headingAs="h1" />
        <footer className="px-6 pb-32">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 border-t border-hairline pt-12 md:flex-row md:items-end md:justify-between">
            <a href={cs.demo.href} className="group flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted">See it work</span>
              <span className="text-lg text-text underline-offset-4 group-hover:underline">{cs.demo.label} →</span>
            </a>
            <a href={`/work/${next.slug}`} className="group flex flex-col gap-2 md:items-end">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted">Next case study</span>
              <span className="chrome font-display text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold uppercase leading-none tracking-tight">
                {next.project.name}
              </span>
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
