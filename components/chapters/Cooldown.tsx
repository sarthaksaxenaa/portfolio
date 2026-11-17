import { ExternalLink } from "@/components/ui/ExternalLink";
import { CopyEmail } from "@/components/ui/CopyEmail";
import { LocalTime } from "@/components/ui/LocalTime";
import { chapterById } from "@/content/chapters";
import { profile } from "@/content/profile";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { COPYRIGHT_YEAR } from "@/lib/site";

const pill =
  "inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-text transition-colors hover:border-text";

/** Contact: a giant chrome LET'S TALK, what Sarthak is open to, the email with a copy button, his
 *  local time, and every link as a pill. */
export function Cooldown() {
  const chapter = chapterById("cooldown");
  return (
    <section
      id="cooldown"
      aria-labelledby="cooldown-heading"
      className="flex min-h-[90dvh] flex-col justify-between px-6 pb-10 pt-32"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <Eyebrow chapter={chapter} />

        <p className="flex items-center gap-3 text-sm text-text md:text-base">
          <span className="status-dot" aria-hidden="true" />
          {profile.availability}
        </p>

        <h2
          id="cooldown-heading"
          className="chrome font-display text-[clamp(4rem,17vw,15rem)] font-extrabold uppercase leading-[0.82] tracking-tight"
        >
          Let&rsquo;s
          <br />
          talk
        </h2>

        <div className="flex flex-col gap-4">
          <a
            id="contact-email"
            href={`mailto:${profile.email}`}
            className="w-fit break-all font-mono text-[clamp(1.05rem,2.6vw,1.75rem)] text-text underline-offset-8 hover:underline"
          >
            {profile.email}
          </a>
          <CopyEmail email={profile.email} selectId="contact-email" />
        </div>

        <p className="max-w-md text-muted">
          I reply faster than my free-tier API wakes up from sleep. Low bar, cleared daily.
        </p>

        <ul className="flex flex-wrap gap-3">
          {profile.links.map((l) => (
            <li key={l.href}>
              <ExternalLink href={l.href} data-magnetic className={pill}>
                {l.label} <span aria-hidden="true">↗</span>
              </ExternalLink>
            </li>
          ))}
          <li>
            <ExternalLink href={profile.resume.href} data-magnetic data-testid="contact-resume" className={pill}>
              Resume (PDF) <span aria-hidden="true">↗</span>
            </ExternalLink>
          </li>
        </ul>
      </div>

      <footer className="mx-auto mt-24 flex w-full max-w-6xl flex-wrap justify-between gap-4 border-t border-hairline pt-6 font-mono text-xs text-muted">
        <span>© {COPYRIGHT_YEAR} {profile.name}</span>
        <span>
          {profile.location} · <LocalTime timeZone={profile.timeZone} />
        </span>
        <span>Measured, not claimed.</span>
      </footer>
    </section>
  );
}
