"use client";

import { useEffect, useRef, useState } from "react";
import { useMotion } from "@/components/motion/MotionProvider";
import { TRIP_ID, race, randomTimings, type Driver, type Mode, type RaceResult, type Timing } from "@/lib/rideRace";

/** Real latencies are a few hundred milliseconds; the replay runs this many times slower. */
const SLOW = 6;
const DRIVERS: Driver[] = ["A", "B"];

type Run = { timings: Timing[]; result: RaceResult; end: number };

function verdict(run: Run, mode: Mode): string {
  const { result } = run;
  if (result.doubleBooked) {
    const [first] = run.timings.filter((t) => t.driver !== result.finalDriver);
    return `Double-booked. Both drivers were told the ride is theirs; ${result.finalDriver}'s write replaced ${first.driver}'s, so ${first.driver} is driving to a rider who is not waiting.`;
  }
  const winner = result.winners[0];
  const loser = DRIVERS.find((d) => d !== winner)!;
  return mode === "lock"
    ? `Driver ${winner} got the ride. Driver ${loser}'s update changed 0 rows, so the app told ${loser} it was already taken.`
    : `Driver ${winner} got the ride, this time. Without the lock it only works when the taps do not overlap.`;
}

/** Two drivers accept trip #482 at once: RideShare's compare-and-set, or the bug it prevents. */
export function RideRace() {
  const { enabled: animate } = useMotion();
  const [mode, setMode] = useState<Mode>("lock");
  const [run, setRun] = useState<Run | null>(null);
  const [t, setT] = useState(0);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const start = () => {
    cancelAnimationFrame(raf.current);
    const timings = randomTimings();
    const result = race(timings, mode);
    const next = { timings, result, end: Math.max(...timings.map((x) => x.writeAt)) + 40 };
    setRun(next);
    if (!animate) {
      setT(next.end);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const sim = (now - t0) / SLOW;
      setT(Math.min(sim, next.end));
      if (sim < next.end) raf.current = requestAnimationFrame(tick);
    };
    setT(0);
    raf.current = requestAnimationFrame(tick);
  };

  const choose = (m: Mode) => {
    cancelAnimationFrame(raf.current);
    setMode(m);
    setRun(null);
    setT(0);
  };

  const done = run !== null && t >= run.end;
  const landed = (d: Driver) => run !== null && t >= run.timings.find((x) => x.driver === d)!.writeAt;
  const outcome = (d: Driver) => run?.result.results.find((r) => r.driver === d)?.outcome;
  const tripLabel = (() => {
    if (!run) return "REQUESTED";
    const writes = run.result.log.filter((e) => e.kind === "write" && e.at <= t && !e.text.endsWith("count: 0"));
    if (writes.length === 0) return "REQUESTED";
    return `MATCHED · ${writes.at(-1)!.driver}`;
  })();

  return (
    <div className="demo flex flex-col gap-5" data-demo="ride">
      <div role="group" aria-label="How the server accepts a ride" className="seg">
        <button type="button" aria-pressed={mode === "lock"} onClick={() => choose("lock")}>
          With the lock
        </button>
        <button type="button" aria-pressed={mode === "naive"} onClick={() => choose("naive")}>
          Without it
        </button>
      </div>

      <div className="race" aria-hidden="true">
        {DRIVERS.map((d) => {
          const timing = run?.timings.find((x) => x.driver === d);
          const p = timing ? Math.min(1, t / timing.writeAt) : 0;
          const o = landed(d) ? outcome(d) : undefined;
          return (
            <div key={d} className="race-lane" data-outcome={o ?? ""}>
              <span className="race-name">Driver {d}</span>
              <span className="race-track">
                <span className="race-dot" style={{ left: `calc(${p.toFixed(4)} * (100% - 0.6rem))` }} />
              </span>
              <span className="race-result">{o === "assigned" ? "✓ ride is yours" : o === "taken" ? "✗ already taken" : "…"}</span>
            </div>
          );
        })}
        <div className="race-trip" data-double={done && run?.result.doubleBooked ? "" : undefined}>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted">Trip #{TRIP_ID}</span>
          <span className="font-mono text-sm text-text">{tripLabel}</span>
        </div>
      </div>

      <ol className="race-log" aria-hidden="true">
        {(run?.result.log ?? []).map((e, i) => (
          <li key={i} data-shown={t >= e.at ? "" : undefined}>
            <span className="text-muted">+{Math.round(e.at)}ms</span> <span className="text-text">{e.driver}</span> {e.text}
          </li>
        ))}
      </ol>

      <p aria-live="polite" className="min-h-[3.5rem] text-sm leading-relaxed text-text" data-testid="race-verdict">
        {done && run ? verdict(run, mode) : ""}
      </p>

      <button type="button" onClick={start} data-magnetic className="self-start rounded-full bg-text px-5 py-2.5 text-sm font-medium text-bg">
        {run ? "Both accept again" : "Both accept"}
      </button>
    </div>
  );
}
