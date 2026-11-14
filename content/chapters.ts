import { Chapters, type Chapter } from "./schema";

/** The training session the page is told as. Order here is scroll order. */
export const chapters: Chapter[] = Chapters.parse([
  { id: "warmup", index: "00", label: "Warm-up", title: "Sarthak Saxena" },
  { id: "grind", index: "01", label: "The grind", title: "Reps before records" },
  { id: "rideshare", index: "02", label: "Set 1", title: "RideShare" },
  { id: "carenexus", index: "03", label: "Set 2", title: "CareNexus" },
  { id: "overload", index: "04", label: "Progressive overload", title: "Next weight on the bar" },
  { id: "cooldown", index: "05", label: "Cool-down", title: "Say hi" },
]);

export const chapterById = (id: Chapter["id"]): Chapter => {
  const c = chapters.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown chapter: ${id}`);
  return c;
};
