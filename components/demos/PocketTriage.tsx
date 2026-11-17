"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMotion } from "@/components/motion/MotionProvider";
import { MAX_INPUT, buildTriage, levelText, type TriageData, type TriageResult } from "@/lib/triage";
import { useJson, useNearView } from "./useNearView";

export const TRIAGE_DATA_URL = "/demos/carenexus-triage.json";

/** Suggestions that show each path: a red flag, a duration raising the level, plain self-care. */
export const TRIAGE_EXAMPLES = [
  "chest pain spreading to my left arm",
  "sore throat for 3 days",
  "runny nose and sneezing",
  "headache for 2 weeks",
  "feeling dizzy when I stand up",
] as const;

/** The step-by-step reveal, so you can watch the decision being made. */
const STEP_MS = 260;

/** Type a symptom, get CareNexus's urgency level and the steps that led to it. */
export function PocketTriage() {
  const { enabled: animate } = useMotion();
  const box = useRef<HTMLDivElement>(null);
  const near = useNearView(box);
  const [wanted, setWanted] = useState(false);
  const { data, error } = useJson<TriageData>(TRIAGE_DATA_URL, near || wanted);
  const triage = useMemo(() => (data ? buildTriage(data) : null), [data]);
  const [text, setText] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [shown, setShown] = useState(0);
  // Answered as soon as the data is in, even if the question came first.
  const result: TriageResult | null = useMemo(() => (triage && asked !== null ? triage(asked) : null), [triage, asked]);

  // Steps appear one by one; with reduced motion they are all there at once.
  useEffect(() => {
    if (!animate || !result) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= result.steps.length) window.clearInterval(id);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [result, animate, run]);

  const ask = (q: string) => {
    setWanted(true);
    setText(q);
    setShown(0);
    setRun((n) => n + 1);
    setAsked(q.trim() ? q : null);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(text);
  };

  const visible = animate ? shown : (result?.steps.length ?? 0);
  const finished = result !== null && visible >= result.steps.length;

  return (
    <div ref={box} className="demo flex flex-col gap-5" data-demo="triage">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="triage-input" className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted">
          Describe a symptom
        </label>
        <div className="flex gap-2">
          <input
            id="triage-input"
            value={text}
            maxLength={MAX_INPUT}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setWanted(true)}
            placeholder="e.g. sore throat for 3 days"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-full border border-hairline bg-transparent px-4 py-2.5 text-sm text-text placeholder:text-muted focus:border-text focus:outline-none"
          />
          <button type="submit" className="rounded-full bg-text px-5 py-2.5 text-sm font-medium text-bg">
            Check
          </button>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Try one of these">
          {TRIAGE_EXAMPLES.map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => ask(q)}
                className="rounded-full border border-hairline px-3 py-1 text-xs text-muted transition-colors hover:border-text hover:text-text"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      </form>

      <ol className="triage-steps" aria-hidden="true">
        {(result?.steps ?? []).map((s, i) => (
          <li key={s.id} data-shown={i < visible ? "" : undefined}>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted">{s.label}</span>
            <span className="text-sm text-text">{s.detail}</span>
          </li>
        ))}
      </ol>

      <div aria-live="polite" className="min-h-[4.5rem]" data-testid="triage-result">
        {error && <p className="text-sm text-muted">The knowledge base did not load. Refresh to try again.</p>}
        {!error && asked !== null && !triage && <p className="text-sm text-muted">Loading the knowledge base…</p>}
        {finished && result && (
          <div className="flex flex-col gap-2">
            <p className="triage-level" data-level={result.level}>
              {result.redFlag?.crisis ? "Please talk to someone now" : levelText(result.level)}
            </p>
            {result.redFlag && !result.redFlag.crisis && (
              <p className="text-sm text-text">{result.redFlag.title}. CareNexus tells you to call 112 or 108 now.</p>
            )}
            {result.redFlag?.crisis && (
              <p className="text-sm text-text">
                You are not alone. iCall <a href="tel:9152987821" className="underline">9152987821</a>, Vandrevala Foundation{" "}
                <a href="tel:18602662345" className="underline">1860 2662 345</a>, or emergency <a href="tel:112" className="underline">112</a>.
              </p>
            )}
            {result.matches.length > 0 && (
              <p className="font-mono text-xs text-muted">
                Closest: {result.matches.map((m) => `${m.name} ${m.score.toFixed(2)}`).join(" · ")}
              </p>
            )}
          </div>
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Runs entirely in your browser: nothing you type leaves this page. A demo of how CareNexus decides, not medical advice.
      </p>
    </div>
  );
}
