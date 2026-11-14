import Image from "next/image";
import { chapterById } from "@/content/chapters";
import { profile } from "@/content/profile";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { HeroScene } from "@/components/scene/HeroScene";

export function Warmup() {
  const chapter = chapterById("warmup");
  return (
    <section
      id="warmup"
      aria-labelledby="warmup-title"
      className="relative flex min-h-dvh items-end overflow-hidden px-6 pb-16 pt-28 md:items-center md:pb-0"
    >
      <HeroScene />
      <Image
        src={profile.portrait.src}
        alt={profile.portrait.alt}
        width={1488}
        height={1239}
        priority
        sizes="(min-width: 768px) 55vw, 100vw"
        className="pointer-events-none absolute right-0 top-16 w-full max-w-[880px] opacity-80 md:top-1/2 md:w-[60vw] md:-translate-y-1/2"
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Eyebrow chapter={chapter} />
        <h1
          id="warmup-title"
          data-split
          className="light-text font-display text-[clamp(3.25rem,11vw,10rem)] font-bold leading-[0.88] tracking-tight"
        >
          Sarthak
          <br />
          Saxena
        </h1>
        <p className="max-w-xl text-lg text-muted md:text-xl">
          Sure enough to <em className="font-serif text-[1.15em] text-text">burn the ships.</em>
        </p>
        <p className="max-w-lg text-muted">
          {profile.role}, final year of {profile.education.degree.replace("B.Tech, ", "")} in{" "}
          {profile.location}. I build real-time and AI products, then measure them. I also lift
          weights, mostly so my posture survives the debugging.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="#rideshare"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-85"
          >
            See the work
          </a>
          <a
            href={`mailto:${profile.email}`}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm text-text transition-colors hover:border-text"
          >
            {profile.email}
          </a>
        </div>
      </div>
    </section>
  );
}
