/** Case-study pages that exist under /work. Kept free of the content modules so the proxy stays
 *  small; tests/unit/caseStudyPage.test.tsx checks it matches content/caseStudies.ts. */
export const CASE_STUDY_SLUGS = ["rideshare", "carenexus"] as const;

/** Whether a /work/... path is a case study that exists. Only /work/<slug> with a known slug is. */
export function isCaseStudyPath(pathname: string): boolean {
  const m = /^\/work\/([^/]+)\/?$/.exec(pathname);
  return m !== null && (CASE_STUDY_SLUGS as readonly string[]).includes(m[1]);
}
