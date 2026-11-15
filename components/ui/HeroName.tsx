import type { CSSProperties } from "react";

/**
 * The name, forged letter by letter. Screen readers and search get the plain name once
 * (sr-only); the letters are decoration (aria-hidden). Each letter is a fixed-width spacer
 * in the heading's base weight with the visible glyph drawn on top (::before), so the weight
 * can swing from 100 to 900 without ever moving the layout.
 */
const LINE_OVERLAP = 3;

export function HeroName({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  const words = name.split(" ");
  // Stagger order: letters strike left to right, and each new line starts a beat early so the
  // two strikes overlap.
  const offsets = words.map((_, line) => words.slice(0, line).reduce((n, w) => n + w.length - LINE_OVERLAP, 0));
  return (
    <h1 id={id} data-forge className={`hero-name ${className}`}>
      <span className="sr-only">{name}</span>
      <span aria-hidden="true" data-forge-stage className="hero-name-stage">
        {words.map((word, line) => {
          return (
            <span key={word} className="hero-name-word">
              {Array.from(word).map((ch, i) => (
                <span
                  key={i}
                  data-forge-ch
                  data-ch={ch}
                  data-line={line}
                  className="forge-ch"
                  style={{ "--i": offsets[line] + i } as CSSProperties}
                >
                  {ch}
                </span>
              ))}
            </span>
          );
        })}
      </span>
    </h1>
  );
}
