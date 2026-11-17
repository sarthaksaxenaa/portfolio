/**
 * Pocket CareNexus: the rule-based half of CareNexus's triage, running in the browser.
 *
 * It follows backend/app/core/triage/engine.py when the language model is unavailable:
 *   1. red flags (red_flags.py): an emergency phrase means RED, nothing else is consulted
 *   2. retrieval (rag/vectorizer.py): TF-IDF over the 50-condition knowledge base, cosine
 *      similarity, top 3 above 0.08
 *   3. the best match's severity, raised by how long it has lasted (symptom_parser.py), then
 *      raised from GREEN to YELLOW when three or more symptoms match
 *   4. with no match, the engine's keyword fallback
 * The index itself is built by CareNexus's own Python (scripts/demos/export_carenexus.py), so only
 * the query side lives here; tests/unit/triage.test.ts checks it gives the Python answers.
 */

export type Level = "red" | "yellow" | "green" | "none";

export type TriageData = {
  source: string;
  stopWords: string[];
  synonyms: Record<string, string[]>;
  terms: string[];
  idf: number[];
  conditions: {
    id: string;
    name: string;
    category: string;
    severity: "mild" | "moderate" | "severe";
    sex: string | null;
    symptoms: string[];
    t: number[];
    w: number[];
  }[];
  redFlags: { title: string; crisis: boolean; patterns: string[] }[];
  symptomKeywords: string[];
  durations: [string, number][];
  fallbackKeywords: { severe: string[]; moderate: string[]; mild: string[] };
};

export type Step = { id: "redflags" | "retrieve" | "duration" | "level"; label: string; detail: string };
export type Match = { id: string; name: string; score: number };
export type TriageResult = {
  level: Level;
  redFlag: { title: string; crisis: boolean } | null;
  matches: Match[];
  steps: Step[];
};

export const THRESHOLD = 0.08;
export const TOP_K = 3;
/** Long pastes are cut here: triage reads a symptom description, not an essay. */
export const MAX_INPUT = 500;

const SEVERITY_LEVEL: Record<string, Level> = { mild: "green", moderate: "yellow", severe: "red" };
const SEVERITY_ORDER = ["mild", "moderate", "severe"] as const;

/** vectorizer.stem: light suffix stripping, identical on the index and the query. */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  for (const [suffix, replacement] of [["ies", "y"], ["ing", ""], ["ed", ""], ["es", ""], ["s", ""]] as const) {
    if (word.endsWith(suffix) && !word.endsWith("ss") && word.length - suffix.length >= 3) {
      word = word.slice(0, word.length - suffix.length) + replacement;
      break;
    }
  }
  if (word.length > 3 && word.endsWith("e")) word = word.slice(0, -1);
  if (word.length > 3 && word.at(-1) === word.at(-2) && !"lsz".includes(word.at(-1)!)) word = word.slice(0, -1);
  return word;
}

/** red_flags.normalise: lower case, apostrophes dropped (can't -> cant), punctuation to spaces. */
export function normalise(message: string): string {
  return message
    .toLowerCase()
    .replace(/['‘’ʼ`]/g, "")
    .replace(/[^\p{L}\p{N}_]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

const words = (text: string) => text.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

/** symptom_parser._extract_duration: the first pattern that matches, in days. */
export function durationDays(text: string, data: Pick<TriageData, "durations">): number | null {
  const lower = text.toLowerCase().trim();
  for (const [pattern, days] of data.durations) {
    const m = new RegExp(pattern).exec(lower);
    if (m) return m[1] ? Number(m[1]) * days : days;
  }
  return null;
}

function adjustForDuration(severity: string, days: number | null): string {
  const i = SEVERITY_ORDER.indexOf(severity as (typeof SEVERITY_ORDER)[number]);
  if (days === null || i < 0) return severity;
  if (days > 7 && i < 2) return SEVERITY_ORDER[i + 1];
  if (days >= 2 && i < 1) return SEVERITY_ORDER[i + 1];
  return severity;
}

const daysLabel = (d: number) =>
  d < 1 ? `${Math.round(d * 24)} hours` : `${Number.isInteger(d) ? d : d.toFixed(1)} day${d === 1 ? "" : "s"}`;

/** Compiles the exported data once and returns the triage function. */
export function buildTriage(data: TriageData): (message: string) => TriageResult {
  const stop = new Set(data.stopWords);
  const termIndex = new Map(data.terms.map((t, i) => [t, i]));
  const redFlags = data.redFlags.map((r) => ({ ...r, compiled: r.patterns.map((p) => new RegExp(p)) }));
  const docs = data.conditions.map((c) => {
    const vec = new Map<number, number>();
    c.t.forEach((t, i) => vec.set(t, c.w[i]));
    return { c, vec, norm: Math.sqrt(c.w.reduce((s, w) => s + w * w, 0)) };
  });
  const phrases = Object.entries(data.synonyms).filter(([k]) => k.includes(" "));

  const expandSynonyms = (tokens: string[], original: string): string[] => {
    const out = new Set(tokens);
    for (const [phrase, syns] of phrases) {
      if (original.includes(phrase)) for (const s of syns) for (const w of s.split(/\s+/)) if (w) out.add(w);
    }
    for (const t of tokens) {
      const syns = data.synonyms[t];
      if (syns) for (const s of syns) for (const w of s.split(/\s+/)) if (w) out.add(w);
    }
    return [...out];
  };

  const queryVector = (query: string): Map<number, number> => {
    const lowered = query.toLowerCase();
    const raw = words(lowered).filter((t) => !stop.has(t));
    const counts = new Map<string, number>();
    for (const t of expandSynonyms(raw, lowered)) {
      if (t.length <= 1) continue;
      const s = stem(t);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    const vec = new Map<number, number>();
    for (const [term, count] of counts) {
      const i = termIndex.get(term);
      if (i !== undefined) vec.set(i, (0.5 + 0.5 * (count / max)) * data.idf[i]);
    }
    return vec;
  };

  const search = (query: string): Match[] => {
    const q = queryVector(query);
    if (q.size === 0) return [];
    const qNorm = Math.sqrt([...q.values()].reduce((s, v) => s + v * v, 0));
    const scored: { c: TriageData["conditions"][number]; score: number }[] = [];
    for (const d of docs) {
      let dot = 0;
      for (const [t, v] of q) {
        const w = d.vec.get(t);
        if (w !== undefined) dot += v * w;
      }
      const score = dot === 0 || d.norm === 0 ? 0 : dot / (qNorm * d.norm);
      if (score >= THRESHOLD) scored.push({ c: d.c, score });
    }
    scored.sort((a, b) => b.score - a.score); // stable, like Python's sort
    return scored.slice(0, TOP_K).map(({ c, score }) => ({ id: c.id, name: c.name, score: Math.round(score * 1e4) / 1e4 }));
  };

  return (input: string): TriageResult => {
    const message = input.slice(0, MAX_INPUT);
    const steps: Step[] = [];

    const text = normalise(message);
    const flag = text ? redFlags.find((r) => r.compiled.some((re) => re.test(text))) : undefined;
    if (flag) {
      steps.push({ id: "redflags", label: "Red flags", detail: flag.title });
      steps.push({ id: "level", label: "Urgency", detail: flag.crisis ? "Talk to someone now" : "Emergency" });
      return { level: "red", redFlag: { title: flag.title, crisis: flag.crisis }, matches: [], steps };
    }
    steps.push({ id: "redflags", label: "Red flags", detail: "None found" });

    const lower = message.toLowerCase();
    const matches = search(message);
    if (matches.length === 0) {
      const kw = data.fallbackKeywords;
      const level: Level = [...kw.severe, ...kw.moderate].some((k) => lower.includes(k))
        ? "yellow"
        : kw.mild.some((k) => lower.includes(k))
          ? "green"
          : "none";
      steps.push({ id: "retrieve", label: "Knowledge base", detail: "No close match, so keywords decide" });
      steps.push({ id: "level", label: "Urgency", detail: level === "none" ? "Needs more detail" : levelText(level) });
      return { level, redFlag: null, matches, steps };
    }

    const top = data.conditions.find((c) => c.id === matches[0].id)!;
    steps.push({ id: "retrieve", label: "Knowledge base", detail: `${top.name} · ${matches[0].score.toFixed(2)} similarity` });
    const days = durationDays(message, data);
    const adjusted = adjustForDuration(top.severity, days);
    let level = SEVERITY_LEVEL[adjusted] ?? "none";
    steps.push({
      id: "duration",
      label: "How long",
      detail:
        days === null
          ? `Not given, stays ${top.severity}`
          : adjusted === top.severity
            ? `${daysLabel(days)}, stays ${top.severity}`
            : `${daysLabel(days)}: ${top.severity} → ${adjusted}`,
    });
    const symptoms = data.symptomKeywords.filter((s) => lower.trim().includes(s));
    const matched = symptoms.filter((s) => top.symptoms.some((cs) => cs.includes(s)));
    if (matched.length >= 3 && level === "green") level = "yellow";
    steps.push({ id: "level", label: "Urgency", detail: levelText(level) });
    return { level, redFlag: null, matches, steps };
  };
}

export function levelText(level: Level): string {
  return { red: "Emergency", yellow: "See a doctor soon", green: "Self-care at home", none: "Needs more detail" }[level];
}
