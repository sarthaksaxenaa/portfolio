import { chapters } from "@/content/chapters";
import { MotionToggle } from "@/components/motion/MotionToggle";

export function Nav() {
  return (
    <nav
      aria-label="Chapters"
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-hairline bg-bg/70 px-6 py-3 backdrop-blur-md"
    >
      <a href="#warmup" className="font-mono text-xs uppercase tracking-[0.08em] text-text">
        sarthxen
      </a>
      <ol className="hidden gap-6 md:flex">
        {chapters.slice(1).map((c) => (
          <li key={c.id}>
            <a
              href={`#${c.id}`}
              className="font-mono text-xs uppercase tracking-[0.08em] text-muted transition-colors hover:text-text"
            >
              <span aria-hidden>{c.index} </span>
              {c.label}
            </a>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-5">
        <MotionToggle />
        <a href="#cooldown" className="font-mono text-xs uppercase tracking-[0.08em] text-text md:hidden">
          Contact
        </a>
      </div>
    </nav>
  );
}
