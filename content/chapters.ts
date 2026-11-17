import { Chapters, type Chapter } from "./schema";

/**
 * Page sections in scroll order. `label` is the small eyebrow shown above each heading, written as
 * a plain section name. `index` is internal (it enforces order) and is never rendered.
 */
export const chapters: Chapter[] = Chapters.parse([
  { id: "warmup", index: "00", label: "Full-stack engineer", title: "Sarthak Saxena" },
  { id: "work", index: "01", label: "Selected work", title: "Featured Engineering" },
  { id: "grind", index: "02", label: "Experience", title: "Reps before records" },
  { id: "skills", index: "03", label: "What I build", title: "Try the work" },
  { id: "cooldown", index: "04", label: "Contact", title: "Say hi" },
  { id: "rideshare", index: "05", label: "Project · Real-time systems", title: "RideShare", path: "/work/rideshare" },
  { id: "carenexus", index: "06", label: "Project · Applied AI", title: "CareNexus", path: "/work/carenexus" },
]);

/** The sections of the home page, in order; case studies have pages of their own. */
export const homeChapters: Chapter[] = chapters.filter((c) => !c.path);

/** Top navigation: standard section names, in the order the sections come down the page. Projects stays active across the featured work and on
 *  both case-study pages. Hrefs are home-page anchors; on another page the nav prefixes "/". */
export const navItems = [
  { label: "Home", href: "#warmup", chapters: ["warmup"] },
  { label: "Projects", href: "#work", chapters: ["work", "rideshare", "carenexus"] },
  { label: "Experience", href: "#grind", chapters: ["grind"] },
  { label: "Skills", href: "#skills", chapters: ["skills"] },
  { label: "Contact", href: "#cooldown", chapters: ["cooldown"] },
] as const satisfies ReadonlyArray<{ label: string; href: `#${Chapter["id"]}`; chapters: ReadonlyArray<Chapter["id"]> }>;

export const chapterById = (id: Chapter["id"]): Chapter => {
  const c = chapters.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown chapter: ${id}`);
  return c;
};
