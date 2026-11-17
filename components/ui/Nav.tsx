import { navItems } from "@/content/chapters";
import { profile } from "@/content/profile";
import { HERO_ROLE } from "@/components/chapters/Warmup";
import { ExternalLink } from "./ExternalLink";
import { NavFade } from "./NavFade";

/** Name in bold capitals on the left, small uppercase links on the right; the section you are
 *  reading is marked in red (ChapterObserver sets aria-current). Clear at the top; once you scroll,
 *  a dark fade sits behind it so page text never runs into the links. On a case-study page `base="/"`
 *  points every link back at the home page's sections. */
export function Nav({ base = "" }: { base?: "" | "/" }) {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-4 md:px-10"
    >
      <NavFade />
      <a href={base ? "/" : "#warmup"} className="flex flex-col leading-none">
        <span className="font-display text-sm font-extrabold uppercase tracking-[0.18em] text-text md:text-base">
          {profile.name}
        </span>
        <span className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.3em] text-muted">{HERO_ROLE}</span>
      </a>
      <div className="flex items-center gap-6 md:gap-8">
        <ul className="hidden gap-7 md:flex">
          {navItems.map((item) => (
            <li key={item.href}>
              <a
                href={`${base}${item.href}`}
                data-chapters={item.chapters.join(" ")}
                className="nav-link text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted transition-colors hover:text-text"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href={`${base}#cooldown`}
          className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted transition-colors hover:text-text md:hidden"
        >
          Contact
        </a>
        <ExternalLink
          href={profile.resume.href}
          data-magnetic
          data-testid="nav-resume"
          className="rounded-full border border-hairline px-3.5 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-text transition-colors hover:border-text"
        >
          Resume
        </ExternalLink>
      </div>
    </nav>
  );
}
