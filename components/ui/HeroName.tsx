/**
 * The name, loading like the intro counter: each line fills from an outline on the intro's
 * 00 → 100 curve (all in CSS, see .hero-name in globals.css). Screen readers and search get the
 * plain name once; the outline layer is decoration.
 */
export function HeroName({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  const lines = name.split(" ");
  return (
    <h1 id={id} className={`hero-name ${className}`}>
      <span className="sr-only">{name}</span>
      <span aria-hidden="true" className="block">
        {lines.map((line, i) => (
          <span key={line} className="hero-name-line" data-line={Math.min(i, 1)} data-text={line}>
            {line}
          </span>
        ))}
      </span>
    </h1>
  );
}
