import { navItems } from "@/content/chapters";
import { profile } from "@/content/profile";
import { MotionToggle } from "@/components/motion/MotionToggle";

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
      <div className="flex items-center gap-5">
        <MotionToggle />
        <a href="#cooldown" className="text-sm text-text md:hidden">
          Contact
        </a>
      </div>
    </nav>
  );
}
