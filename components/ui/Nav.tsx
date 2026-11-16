import { navItems } from "@/content/chapters";
import { profile } from "@/content/profile";
import { ExternalLink } from "./ExternalLink";

export function Nav() {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-hairline bg-bg/70 px-6 py-3 backdrop-blur-md"
    >
      <a href="#warmup" className="text-sm font-medium tracking-tight text-text">
        {profile.name}
      </a>
      <ul className="hidden gap-8 md:flex">
        {navItems.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              data-chapters={item.chapters.join(" ")}
              className="text-sm text-muted transition-colors hover:text-text"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      {/* Keeps the links centred on desktop; holds the resume everywhere and Contact on phones. */}
      <div className="flex min-w-[7.5rem] items-center justify-end gap-5">
        <a href="#cooldown" className="text-sm text-muted transition-colors hover:text-text md:hidden">
          Contact
        </a>
        <ExternalLink
          href={profile.resume.href}
          data-magnetic
          data-testid="nav-resume"
          className="rounded-full border border-hairline px-3.5 py-1.5 text-sm text-text transition-colors hover:border-text"
        >
          Resume
        </ExternalLink>
      </div>
    </nav>
  );
}
