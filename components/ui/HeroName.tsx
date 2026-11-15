/**
 * The name, loading like the intro counter: each line fills from an outline while a counter
 * beside it runs 00 → 100 (all in CSS, see .hero-name in globals.css). Screen readers and
 * search get the plain name once; the outline layer and the counter are decoration.
 */
export function HeroName({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  const [first, ...rest] = name.split(" ");
  const last = rest.join(" ");
  return (
    <h1 id={id} className={`hero-name ${className}`}>
      <span className="sr-only">{name}</span>
      <span aria-hidden="true" className="block">
        <span className="hero-name-line" data-line="0" data-text={first}>
          {first}
        </span>
        {last && (
          <span className="hero-name-row">
            <span className="hero-name-line" data-line="1" data-text={last}>
              {last}
            </span>
            <span className="hero-name-count font-display" data-testid="name-count" />
          </span>
        )}
      </span>
    </h1>
  );
}
