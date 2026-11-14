import type { Chapter } from "@/content/schema";

type Props = { chapter: Chapter; id?: string; as?: "h1" | "h2"; className?: string };

export function Eyebrow({ chapter }: { chapter: Chapter }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
      <span className="text-[var(--chapter-accent,var(--color-accent))]">{chapter.index}</span>
      <span aria-hidden> / </span>
      {chapter.label}
    </p>
  );
}

export function SectionHeader({ chapter, id, as: Tag = "h2", className = "" }: Props) {
  return (
    <header className={`flex flex-col gap-4 ${className}`}>
      <Eyebrow chapter={chapter} />
      <Tag id={id} className="light-text font-display text-[clamp(2.5rem,7vw,6rem)] font-bold leading-[0.92] tracking-tight">
        {chapter.title}
      </Tag>
    </header>
  );
}
