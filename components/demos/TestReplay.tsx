"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotion } from "@/components/motion/MotionProvider";
import { doneAt, suiteCounts, type TestData } from "@/lib/testReplay";
import { useJson, useNearView } from "./useNearView";

export const TESTS_DATA_URL = "/demos/carenexus-tests.json";

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Every CareNexus test, one square each, filling in the order CI runs them. Names on hover. */
export function TestReplay() {
  const { enabled: animate } = useMotion();
  const box = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const ticker = useRef<HTMLSpanElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const near = useNearView(box);
  const inView = useNearView(box, "0px", 0.4);
  const { data, error } = useJson<TestData>(TESTS_DATA_URL, near);
  const [finished, setFinished] = useState(false);
  const raf = useRef(0);
  const autoplayed = useRef(false);

  const paint = useCallback(
    (done: number) => {
      if (!data || !grid.current) return;
      const cells = grid.current.children;
      for (let i = 0; i < cells.length; i++) cells[i].toggleAttribute("data-ran", i < done);
      if (counter.current) counter.current.textContent = String(done);
      const current = data.tests[Math.max(0, done - 1)];
      if (ticker.current) {
        ticker.current.textContent = done === 0 ? "ready" : `${data.files[current[1]]} › ${current[2]}`;
      }
    },
    [data],
  );

  const play = useCallback(() => {
    if (!data) return;
    cancelAnimationFrame(raf.current);
    setFinished(false);
    const n = data.tests.length;
    if (!animate) {
      paint(n);
      setFinished(true);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const done = doneAt(now - t0, n);
      paint(done);
      if (done < n) raf.current = requestAnimationFrame(tick);
      else setFinished(true);
    };
    paint(0);
    raf.current = requestAnimationFrame(tick);
  }, [data, animate, paint]);

  // Plays once by itself when it comes into view; with reduced motion it simply shows the result.
  useEffect(() => {
    if (!data || autoplayed.current || !(inView || !animate)) return;
    autoplayed.current = true;
    play();
  }, [data, inView, animate, play]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const counts = data ? suiteCounts(data) : null;
  const total = data?.tests.length ?? 570;

  return (
    <div ref={box} className="demo flex flex-col gap-5" data-demo="tests">
      <div className="flex items-baseline justify-between gap-4 font-mono text-xs">
        <span className="text-text">
          <span ref={counter}>0</span> / {total} passed
        </span>
        <span className="text-muted">0 failing</span>
      </div>

      <div ref={grid} className="test-grid" aria-hidden="true">
        {data?.tests.map(([suite, file, name], i) => (
          <span key={i} data-suite={suite} title={`${data.files[file]} › ${name}`} />
        ))}
      </div>

      <p className="h-5 truncate font-mono text-[0.7rem] text-muted" aria-hidden="true">
        <span ref={ticker}>{error ? "the test list did not load" : "loading the suite…"}</span>
      </p>

      {counts && data && (
        <ul className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[0.7rem] uppercase tracking-[0.15em] text-muted">
          {data.suites.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className="test-key" data-suite={i} aria-hidden="true" />
              {s} <span className="text-text">{counts[i]}</span>
            </li>
          ))}
        </ul>
      )}

      <p aria-live="polite" className="sr-only">
        {finished && counts && data
          ? `${total} tests passed, none failing: ${counts[0]} backend, ${counts[1]} frontend unit, ${counts[2]} end to end. Backend coverage ${Math.round(data.coverage * 100)}%.`
          : ""}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-text">
          Backend coverage <span className="chrome font-display text-2xl font-extrabold">{data ? Math.round(data.coverage * 100) : 94}%</span>
        </p>
        <button
          type="button"
          onClick={play}
          disabled={!data}
          className="rounded-full border border-hairline px-5 py-2.5 text-sm text-text transition-colors hover:border-text disabled:opacity-50"
        >
          Replay the suite
        </button>
      </div>
      {data && (
        <p className="text-xs leading-relaxed text-muted">
          The real test names, collected from the repository; last green CI run {fmtDate(data.lastGreen)}. This replays them, it does not run them.
        </p>
      )}
    </div>
  );
}
