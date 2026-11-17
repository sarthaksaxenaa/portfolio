import { Chapters, type Chapter } from "./schema";

/**
 * Page sections in scroll order. `label` is the small eyebrow shown above each heading, written as
 * a plain section name. `index` is internal (it enforces order) and is never rendered.
 */
export const chapters: Chapter[] = Chapters.parse([
  { id: "warmup", index: "00", label: "Full-stack engineer", title: "Sarthak Saxena" },
  { id: "work", index: "01", label: "Selected work", title: "Featured Engineering" },
  { id: "grind", index: "02", label: "Experience", title: "Reps before records" },
  { id: "rideshare", index: "03", label: "Project · Real-time systems", title: "RideShare" },
  { id: "carenexus", index: "04", label: "Project · Applied AI", title: "CareNexus" },
  { id: "overload", index: "05", label: "Focus", title: "Next weight on the bar" },
  { id: "cooldown", index: "06", label: "Contact", title: "Say hi" },
]);

/** Top navigation: standard section names. Projects stays active across the featured work and both case studies. */
export const navItems = [
  { label: "Home", href: "#warmup", chapters: ["warmup"] },
  { label: "Experience", href: "#grind", chapters: ["grind"] },
  { label: "Projects", href: "#work", chapters: ["work", "rideshare", "carenexus"] },
  { label: "Focus", href: "#overload", chapters: ["overload"] },
  { label: "Contact", href: "#cooldown", chapters: ["cooldown"] },
] as const satisfies ReadonlyArray<{ label: string; href: `#${Chapter["id"]}`; chapters: ReadonlyArray<Chapter["id"]> }>;

export const chapterById = (id: Chapter["id"]): Chapter => {
  const c = chapters.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown chapter: ${id}`);
  return c;
};
