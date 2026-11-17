import { navItems } from "@/content/chapters";
import { profile } from "@/content/profile";
import { HERO_ROLE } from "@/components/chapters/Warmup";
import { ExternalLink } from "./ExternalLink";
import { NavFade } from "./NavFade";

/** Name in bold capitals on the left, small uppercase links, the résumé on the right; the section you
 *  are reading is marked in red (ChapterObserver sets aria-current). Every link shows on every screen:
 *  below 1024px, where one row cannot hold them, the links take a second row under the name.
 *  Clear at the top; once you scroll, a dark fade sits behind it so page text never runs into the
 *  links. On a case-study page `base="/"` points every link back at the home page's sections. */
export function Nav({ base = "" }: { base?: "" | "/" }) {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 top-0 z-40 flex flex-wrap items-center justify-between gap-y-2 px-5 pb-2 pt-3 sm:px-8 lg:flex-nowrap lg:px-10 lg:py-4"
    >
      <NavFade />
      <a href={base ? "/" : "#warmup"} className="flex flex-col whitespace-nowrap leading-none">
        <span className="font-display text-[0.8rem] font-extrabold uppercase tracking-[0.14em] text-text sm:text-sm sm:tracking-[0.18em] lg:text-base">
          {profile.name}
        </span>
        <span className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.3em] text-muted sm:text-[0.6rem]">{HERO_ROLE}</span>
      </a>
      <ul className="order-last flex w-full justify-between sm:justify-start sm:gap-8 lg:order-none lg:ml-auto lg:mr-8 lg:w-auto lg:gap-7">
        {navItems.map((item) => (
          <li key={item.href}>
            <a
              href={`${base}${item.href}`}
              data-chapters={item.chapters.join(" ")}
              className="nav-link block py-1.5 text-[0.62rem] font-medium uppercase tracking-[0.12em] text-muted transition-colors hover:text-text sm:text-[0.7rem] sm:tracking-[0.2em]"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <ExternalLink
        href={profile.resume.href}
        data-magnetic
        data-testid="nav-resume"
        className="rounded-full border border-hairline px-3.5 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-text transition-colors hover:border-text sm:text-[0.7rem]"
      >
        Resume
      </ExternalLink>
    </nav>
  );
}
