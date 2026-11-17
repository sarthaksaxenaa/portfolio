import { z } from "zod";

export const PUBLIC_EMAIL = "sarthaksaxena413@gmail.com";

const https = z.url({ protocol: /^https$/, message: "Links must be https" });
const isoDate = z.iso.date();

/**
 * A number shown on the site. Every stat names where it came from:
 * - measured: produced by a tool (CI, Lighthouse); needs a source and the date it was measured
 * - reported: stated by someone else (a team, a manager); needs a source, shown as "reported"
 * - target:   a goal, not a result; shown as "target"
 */
export const Stat = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("measured"),
    value: z.string().min(1),
    label: z.string().min(1),
    source: z.string().min(1),
    measuredAt: isoDate,
  }),
  z.object({
    kind: z.literal("reported"),
    value: z.string().min(1),
    label: z.string().min(1),
    source: z.string().min(1),
  }),
  z.object({
    kind: z.literal("target"),
    value: z.string().min(1),
    label: z.string().min(1),
  }),
]);
export type Stat = z.infer<typeof Stat>;

export const Decision = z.object({
  context: z.string().min(1),
  chosen: z.string().min(1),
  rejected: z.array(z.string().min(1)).min(1, "Name at least one rejected alternative"),
  why: z.string().min(1),
});
export type Decision = z.infer<typeof Decision>;

export const Link = z.object({ label: z.string().min(1), href: https });
export type Link = z.infer<typeof Link>;

export const Profile = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  role: z.string().min(1),
  location: z.string().min(1),
  email: z.literal(PUBLIC_EMAIL, { message: `Public email must be ${PUBLIC_EMAIL}` }),
  education: z.object({
    degree: z.string().min(1),
    school: z.string().min(1),
    years: z.string().regex(/^\d{4}–\d{4}$/),
    cgpa: z.string().optional(),
  }),
  links: z.array(Link).min(1),
  /** One-page resume served from /public; `updated` is shown so recruiters know it is current. */
  resume: z.object({
    href: z.string().regex(/^\/[\w.-]+\.pdf$/, "Resume must be a PDF served from /public"),
    updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  portrait: z.object({ src: z.string().startsWith("/"), alt: z.string().min(10) }),
});
export type Profile = z.infer<typeof Profile>;

export const Shot = z.object({
  src: z.string().regex(/^\/screens\/[a-z0-9-]+\.webp$/, "Screens live in /public/screens as WebP"),
  alt: z.string().min(12),
});
export type Shot = z.infer<typeof Shot>;

export const Project = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  summary: z.string().min(1),
  problem: z.string().min(1),
  role: z.string().min(1),
  period: z.string().min(1),
  stack: z.array(z.string().min(1)).min(1),
  decisions: z.array(Decision).min(1),
  stats: z.array(Stat),
  facts: z.array(z.string().min(1)),
  honestNote: z.string().optional(),
  liveUrl: https.optional(),
  repoUrl: https,
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  /** Featured-work card: the italic script word after the name ("RideShare Platform"). */
  kicker: z.string().min(1).optional(),
  /** Screens shown in the laptop, in order; served from /public/screens (/work is for pages). */
  shots: z.array(Shot).default([]),
  /** A phone screen overlapping the laptop, when the project has a mobile view. */
  phoneShot: Shot.optional(),
  /** Exactly three short results for the card: measured numbers, or what the code really does. */
  highlights: z.array(z.string().min(1).max(70)).length(3).optional(),
});
export type Project = z.infer<typeof Project>;

export const Experience = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  period: z.string().min(1),
  location: z.string().min(1),
  points: z.array(z.string().min(1)).min(1),
  stats: z.array(Stat),
});
export type Experience = z.infer<typeof Experience>;

export const ChapterId = z.enum(["warmup", "work", "grind", "rideshare", "carenexus", "skills", "cooldown"]);
export type ChapterId = z.infer<typeof ChapterId>;

export const Chapter = z.object({
  id: ChapterId,
  index: z.string().regex(/^0[0-6]$/),
  label: z.string().min(1),
  title: z.string().min(1),
  /** Set for a case study, which has a page of its own instead of a section on the home page. */
  path: z.string().regex(/^\/work\/[a-z0-9-]+$/, "Case studies live under /work").optional(),
});
export type Chapter = z.infer<typeof Chapter>;

export const Chapters = z
  .array(Chapter)
  .length(7)
  .superRefine((list, ctx) => {
    list.forEach((c, i) => {
      if (c.index !== `0${i}`)
        ctx.addIssue({ code: "custom", message: `Chapter ${c.id} must have index 0${i}`, path: [i, "index"] });
    });
    if (new Set(list.map((c) => c.id)).size !== list.length)
      ctx.addIssue({ code: "custom", message: "Chapter ids must be unique" });
    // Home sections first, then the case-study pages, so the index still reads as page order.
    const firstPage = list.findIndex((c) => c.path);
    if (firstPage >= 0 && list.slice(firstPage).some((c) => !c.path))
      ctx.addIssue({ code: "custom", message: "Case-study chapters come after every home section" });
  });
