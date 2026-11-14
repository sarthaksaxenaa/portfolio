#!/usr/bin/env node
/**
 * Generates the README's artwork from the real project:
 *   docs/assets/banner.svg  animated dot-sphere banner (same Fibonacci sphere as the site)
 *   docs/assets/stats.svg   measured numbers: tests, Lighthouse, live status
 *   docs/assets/stats.json  the same numbers, machine-readable
 * Inputs (all optional; a missing input shows "n/a" instead of a guess):
 *   reports/vitest.json        vitest --reporter=json
 *   reports/playwright.json    playwright --reporter=json
 *   .lighthouseci/lhr-*.json   lhci collect
 *   SITE_URL env               probed for status and response time
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "docs/assets");
const SITE_URL = process.env.SITE_URL ?? "https://sarthxen.vercel.app";
const BG = "#050506", TEXT = "#EDEDED", MUTED = "#8B8B93", LINE = "rgba(255,255,255,0.08)";

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

// ── measurements ────────────────────────────────────────────────────────────
function unitTests() {
  const r = readJson(join(ROOT, "reports/vitest.json"));
  return r ? { passed: r.numPassedTests, total: r.numTotalTests } : null;
}
function e2eTests() {
  const r = readJson(join(ROOT, "reports/playwright.json"));
  if (!r?.stats) return null;
  return { passed: r.stats.expected + (r.stats.flaky ?? 0), total: r.stats.expected + r.stats.unexpected + (r.stats.flaky ?? 0) };
}
function lighthouse() {
  const dir = join(ROOT, ".lighthouseci");
  if (!existsSync(dir)) return null;
  const runs = readdirSync(dir).filter((f) => /^lhr-.*\.json$/.test(f)).map((f) => readJson(join(dir, f)));
  if (!runs.length) return null;
  const cat = (k) => median(runs.map((r) => Math.round(r.categories[k].score * 100)));
  const audit = (k) => median(runs.map((r) => r.audits[k].numericValue));
  return {
    performance: cat("performance"), accessibility: cat("accessibility"),
    bestPractices: cat("best-practices"), seo: cat("seo"),
    lcpMs: Math.round(audit("largest-contentful-paint")), cls: +audit("cumulative-layout-shift").toFixed(3),
  };
}
async function probe() {
  try {
    const t = performance.now();
    const res = await fetch(SITE_URL, { redirect: "follow" });
    return { ok: res.ok, status: res.status, ms: Math.round(performance.now() - t) };
  } catch {
    return { ok: false, status: 0, ms: null };
  }
}

// ── banner: the site's Fibonacci sphere, flattened to SVG dots ───────────────
function banner() {
  const W = 1200, H = 420, cx = 900, cy = 210, R = 170, N = 900;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const dots = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
    const x = Math.cos(th) * r, z = Math.sin(th) * r;
    if (z < -0.15) continue; // back face hidden
    const a = (0.15 + 0.85 * ((z + 1) / 2) ** 2).toFixed(2);
    const delay = ((i % 37) / 37 * 3).toFixed(2);
    dots.push(`<circle cx="${(cx + x * R).toFixed(1)}" cy="${(cy - y * R).toFixed(1)}" r="${(1 + z).toFixed(2)}" fill="${TEXT}" opacity="${a}" style="animation-delay:-${delay}s"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Sarthak Saxena: Sure enough to burn the ships.">
<style>
  .s circle{animation:pulse 3s ease-in-out infinite}
  .t{font-family:'Geist','Inter','Helvetica Neue',Arial,sans-serif;fill:${TEXT}}
  .m{font-family:'Geist Mono','JetBrains Mono',ui-monospace,monospace;fill:${MUTED}}
  .rise{animation:rise 1.1s cubic-bezier(.16,1,.3,1) both}
  .d2{animation-delay:.08s}.d3{animation-delay:.3s}
  @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.35)}}
  @keyframes rise{from{transform:translateY(40px);opacity:0}}
  .s circle{transform-box:fill-box;transform-origin:center}
  @media (prefers-reduced-motion:reduce){.s circle,.rise{animation:none}}
</style>
<rect width="${W}" height="${H}" fill="${BG}"/>
<g class="s">${dots.join("")}</g>
<text x="64" y="96" class="m" font-size="16" letter-spacing="1.5">00 / WARM-UP</text>
<text x="60" y="200" class="t rise" font-size="96" font-weight="700" letter-spacing="-3">Sarthak</text>
<text x="60" y="288" class="t rise d2" font-size="96" font-weight="700" letter-spacing="-3">Saxena</text>
<text x="64" y="346" class="m rise d3" font-size="20">Sure enough to burn the ships.</text>
</svg>`;
}

// ── stats card ───────────────────────────────────────────────────────────────
function statsCard(s) {
  const cells = [
    [s.unit ? `${s.unit.passed}/${s.unit.total}` : "n/a", "unit tests"],
    [s.e2e ? `${s.e2e.passed}/${s.e2e.total}` : "n/a", "e2e runs, 3 engines"],
    [s.lh ? String(s.lh.accessibility) : "n/a", "Lighthouse accessibility"],
    [s.lh ? String(s.lh.performance) : "n/a", "Lighthouse performance (mobile)"],
    [s.lh ? `${(s.lh.lcpMs / 1000).toFixed(1)} s` : "n/a", "LCP, mobile (simulated)"],
    [s.live.ok ? `${s.live.ms} ms` : "down", `live site · HTTP ${s.live.status || "n/a"}`],
  ];
  const W = 1200, H = 300, colW = W / 3;
  const body = cells.map(([v, l], i) => {
    const x = 48 + (i % 3) * colW, y = 120 + Math.floor(i / 3) * 110;
    return `<g class="c" style="animation-delay:${(i * 0.07).toFixed(2)}s"><line x1="${x}" y1="${y - 52}" x2="${x + colW - 72}" y2="${y - 52}" stroke="${LINE}"/>
<text x="${x}" y="${y}" class="t" font-size="44" font-weight="700" letter-spacing="-1">${esc(v)}</text>
<text x="${x}" y="${y + 26}" class="m" font-size="14">${esc(l)}</text></g>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Measured project stats">
<style>
  .t{font-family:'Geist','Inter','Helvetica Neue',Arial,sans-serif;fill:${TEXT}}
  .m{font-family:'Geist Mono','JetBrains Mono',ui-monospace,monospace;fill:${MUTED}}
  .c{animation:in .8s cubic-bezier(.16,1,.3,1) both}
  @keyframes in{from{opacity:0;transform:translateY(12px)}}
  @media (prefers-reduced-motion:reduce){.c{animation:none}}
</style>
<rect width="${W}" height="${H}" rx="16" fill="${BG}" stroke="${LINE}"/>
<text x="48" y="44" class="m" font-size="14" letter-spacing="1.2">MEASURED, NOT CLAIMED · ${esc(s.measuredAt)}</text>
${body}
</svg>`;
}

const live = await probe();
const stats = { measuredAt: new Date().toISOString().slice(0, 10), unit: unitTests(), e2e: e2eTests(), lh: lighthouse(), live };
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "banner.svg"), banner());
writeFileSync(join(OUT, "stats.svg"), statsCard(stats));
writeFileSync(join(OUT, "stats.json"), JSON.stringify(stats, null, 2) + "\n");
console.log(JSON.stringify(stats));
