import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center gap-6 px-6">
      <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">404</p>
      <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] font-bold leading-[0.92] tracking-tight">
        Missed the rep.
      </h1>
      <p className="max-w-md text-muted">This page does not exist. The portfolio does.</p>
      <Link href="/" className="w-fit rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-85">
        Back to the portfolio
      </Link>
    </main>
  );
}
