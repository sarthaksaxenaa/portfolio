import type { Project } from "./schema";
import { carenexus, rideshare } from "./projects";

export type CaseStudy = {
  slug: string;
  project: Project;
  /** Where this project sat in the story: one line, under the summary. */
  lead: string;
  /** The demo on the home page that shows this project working. */
  demo: { label: string; href: `/#${string}` };
};

/** Each featured project's case study, at /work/<slug>, in the order they are featured. */
export const caseStudies: CaseStudy[] = [
  {
    slug: rideshare.slug,
    project: rideshare,
    lead: "The first set with real weight: money, concurrency and live location, all at once.",
    demo: { label: "Race two drivers for one ride", href: "/#skills" },
  },
  {
    slug: carenexus.slug,
    project: carenexus,
    lead: "The turning point. I found my own retriever matching the wrong words, fixed the cause, and stopped trusting any number I had not measured.",
    demo: { label: "Try the triage in your browser", href: "/#skills" },
  },
];

export const caseStudyBySlug = (slug: string): CaseStudy | undefined => caseStudies.find((c) => c.slug === slug);

/** The case study after this one, wrapping round, for the "next" link at the bottom of each page. */
export function nextCaseStudy(slug: string): CaseStudy {
  const i = caseStudies.findIndex((c) => c.slug === slug);
  return caseStudies[(i + 1) % caseStudies.length];
}
