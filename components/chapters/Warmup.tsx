import type { CSSProperties } from "react";
import { profile } from "@/content/profile";
import { ExternalLink } from "@/components/ui/ExternalLink";

const WORD = "PORTFOLIO";
export const HERO_ROLE = "Software Developer";

/**
 * The hero: the particle portrait (drawn by the scene layer behind it), PORTFOLIO in chrome
 * forming letter by letter, the role under it; then the intro in a glass card.
 * Screen readers and search get the name in the heading; the giant word is decoration.
 */
export function Warmup() {
  return (
    <section id="warmup" aria-labelledby="warmup-title" className="relative">
      <div className="relative flex min-h-dvh flex-col justify-end px-6 pb-[12vh] pt-28">
        <h1 id="warmup-title" className="mx-auto w-full max-w-7xl">
          <span className="sr-only">
            {profile.name}, {HERO_ROLE}: portfolio
          </span>
          <span aria-hidden="true" className="portfolio-word font-display text-[clamp(3.6rem,15vw,15rem)]">
            {Array.from(WORD).map((ch, i) => (
              <span key={i} className="portfolio-letter chrome" style={{ "--i": i } as CSSProperties}>
                {ch}
              </span>
            ))}
          </span>
        </h1>
        <p className="hero-sub mx-auto mt-4 w-full max-w-7xl text-lg font-semibold tracking-tight text-text md:mt-6 md:text-2xl">
          {HERO_ROLE}
        </p>
      </div>

      <div id="intro" className="mx-auto grid max-w-7xl gap-10 px-6 py-24 md:grid-cols-[1fr_1.1fr] md:items-center md:py-32">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-muted">About me</p>
          <h2
            id="intro-heading"
            className="chrome font-display text-[clamp(4.5rem,13vw,10rem)] font-extrabold leading-[0.85] tracking-tight"
          >
            Intro
          </h2>
        </div>
        <div data-reveal className="glass flex flex-col gap-6 p-7 md:p-9">
          <p className="text-lg leading-relaxed text-muted md:text-xl">
            I&apos;m <strong className="font-semibold text-text">{profile.name}</strong>, a{" "}
            <strong className="font-semibold text-text">full-stack engineer</strong> in the final year of{" "}
            {profile.education.degree.replace("B.Tech, ", "")} in {profile.location}. I build{" "}
            <strong className="font-semibold text-text">real-time and AI products</strong>, then measure them. I also lift
            weights, mostly so my posture survives the debugging.
          </p>
          <p className="text-muted">
            Sure enough to <em className="font-serif text-[1.2em] text-text">burn the ships.</em>
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#rideshare"
              data-magnetic
              className="rounded-full bg-text px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-85"
            >
              See the work
            </a>
            <a
              href={`mailto:${profile.email}`}
              data-magnetic
              className="rounded-full border border-hairline px-5 py-2.5 text-sm text-text transition-colors hover:border-text"
            >
              {profile.email}
            </a>
            <ExternalLink
              href={profile.resume.href}
              data-magnetic
              className="rounded-full border border-hairline px-5 py-2.5 text-sm text-text transition-colors hover:border-text"
            >
              Resume
            </ExternalLink>
          </div>
        </div>
      </div>
    </section>
  );
}
