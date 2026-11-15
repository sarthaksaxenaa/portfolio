import type { Chapter } from "@/content/schema";

type Props = { chapter: Chapter; id?: string; as?: "h1" | "h2"; className?: string };

export function Eyebrow({ chapter }: { chapter: Chapter }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
      <span aria-hidden className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--chapter-accent,var(--color-accent))] align-middle" />
      {chapter.label}
    </p>
  );
}

export function SectionHeader({ chapter, id, as: Tag = "h2", className = "" }: Props) {
  return (
    <header className={`flex flex-col gap-4 ${className}`}>
      <Eyebrow chapter={chapter} />
      <Tag id={id} data-split className="light-text font-display text-[clamp(2.5rem,7vw,6rem)] font-bold leading-[0.92] tracking-tight">
        {chapter.title}
      </Tag>
    </header>
  );
}
