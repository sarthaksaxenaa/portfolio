import { chapterById } from "@/content/chapters";
import { profile } from "@/content/profile";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { COPYRIGHT_YEAR } from "@/lib/site";

export function Cooldown() {
  const chapter = chapterById("cooldown");
  return (
    <section
      id="cooldown"
      aria-labelledby="cooldown-heading"
      className="flex min-h-[80dvh] flex-col justify-between px-6 pb-10 pt-32"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <Eyebrow chapter={chapter} />
        <h2 id="cooldown-heading" className="sr-only">
          {chapter.title}
        </h2>
        <a
          href={`mailto:${profile.email}`}
          className="light-text group w-fit font-display text-[clamp(2.25rem,8vw,7.5rem)] font-bold leading-[0.95] tracking-tight"
        >
          Say hi<span className="text-muted transition-colors group-hover:text-text">.</span>
          <span className="mt-4 block break-all font-mono text-[clamp(0.9rem,2vw,1.25rem)] font-normal tracking-normal text-muted underline-offset-8 group-hover:text-text group-hover:underline">
            {profile.email}
          </span>
        </a>
        <p className="max-w-md text-muted">
          I reply faster than my free-tier API wakes up from sleep. Low bar, cleared daily.
        </p>
        <ul className="flex flex-wrap gap-6">
          {profile.links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="font-mono text-sm uppercase tracking-[0.08em] text-muted transition-colors hover:text-text"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <footer className="mx-auto mt-24 flex w-full max-w-6xl flex-wrap justify-between gap-4 border-t border-hairline pt-6 font-mono text-xs text-muted">
        <span>© {COPYRIGHT_YEAR} {profile.name}</span>
        <span>Measured, not claimed.</span>
      </footer>
    </section>
  );
}
