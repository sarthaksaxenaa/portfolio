export default function Home() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center gap-8 px-6"
    >
      <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
        00 / Warm-up
      </p>
      <h1 className="font-display text-[clamp(3rem,10vw,9rem)] font-bold leading-[0.9] tracking-tight">
        Sarthak Saxena
      </h1>
      <p className="max-w-2xl text-lg text-muted">
        Sure enough to{" "}
        <em className="font-serif text-text">burn the ships.</em>
      </p>
      <p className="font-mono text-xs text-muted">v0.1 · under construction</p>
    </main>
  );
}
