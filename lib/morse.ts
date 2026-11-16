/**
 * The opening card: a name written in Morse code as vertical lines of light.
 * Pure layout and maths, free of the DOM, so it can be tested on its own.
 * A dot is one line, a dash is a cluster of three.
 */

export const MORSE: Readonly<Record<string, string>> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..",
  J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.",
  S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
};

/** Morse for a word, letter by letter; characters without a code are dropped. */
export function encode(word: string): { ch: string; code: string }[] {
  return Array.from(word.toUpperCase())
    .filter((ch) => MORSE[ch])
    .map((ch) => ({ ch, code: MORSE[ch] }));
}

export type MorseLine = { x: number; letter: number; dash: boolean };
export type MorseLetter = { ch: string; code: string; x: number };

/**
 * Lays a word out across `width`: equal columns inside a side margin, each letter's
 * symbols centred in its column. `unit` is the gap between the lines of a dash; a dot
 * advances 4 units, a dash 7 (three lines plus breathing room).
 */
export function layoutMorse(word: string, width: number, margin = 0.1): { letters: MorseLetter[]; lines: MorseLine[]; unit: number } {
  const letters = encode(word);
  if (!letters.length || width <= 0) return { letters: [], lines: [], unit: 0 };
  const inner = width * (1 - 2 * margin);
  const column = inner / letters.length;
  const unit = Math.max(1.5, Math.min(4, width / 360));
  const lines: MorseLine[] = [];
  const placed = letters.map(({ ch, code }, li) => {
    const cx = width * margin + column * (li + 0.5);
    const symbols = Array.from(code);
    const span = symbols.reduce((w, s) => w + (s === "-" ? 7 : 4) * unit, 0) - 2 * unit;
    let x = cx - span / 2;
    for (const s of symbols) {
      if (s === "-") {
        for (let k = 0; k < 3; k++) lines.push({ x: x + k * unit, letter: li, dash: true });
        x += 7 * unit;
      } else {
        lines.push({ x, letter: li, dash: false });
        x += 4 * unit;
      }
    }
    return { ch, code, x: cx };
  });
  return { letters: placed, lines, unit };
}

/** How lit a line is at horizontal distance `d` from the light: 1 at the centre, 0 past `radius`. */
export function glow(d: number, radius: number): number {
  if (!(radius > 0)) return 0;
  const x = 1 - Math.abs(d) / radius;
  return x <= 0 ? 0 : x * x * (3 - 2 * x);
}

/**
 * Loading is decoding: as the counter climbs, letter `i` of `n` lights up when the count
 * crosses its share of 100, flares, and settles to a faint resting glow so the whole name
 * stays readable behind the lines once loading ends.
 */
export const DECODE_REST = 0.22;
export function decodeLevel(count: number, i: number, n: number): number {
  if (n <= 0) return 0;
  const at = ((i + 1) / n) * 96; // the last letter decodes just before 100
  const since = count - at;
  if (since < -6) return 0;
  if (since < 0) return (since + 6) / 6; // brief run-up
  return Math.max(DECODE_REST, 1 - since / 14); // flare, then rest
}

/** Scrubbing past this point finishes the flight on release; short of it, the card springs back. */
export const COMMIT_AT = 0.28;
export function settleTarget(progress: number): 0 | 1 {
  return progress >= COMMIT_AT ? 1 : 0;
}

/** Frame-rate independent approach toward a target. */
export function approach(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}
