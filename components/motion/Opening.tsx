"use client";

import { useEffect, useRef } from "react";
import { PRELOAD_KEY } from "@/lib/motion";
import {
  NAME,
  TOTAL_MS,
  WORD,
  easeInOut,
  easeOut,
  morphSlots,
  phaseAt,
  skipTarget,
  writeHead,
} from "@/lib/openingTimeline";

const FAILSAFE_MS = 2900; // the CSS safety net hides the opening at 3 s; hydrating later, skip it
const FONT_WAIT_MS = 900; // start the story once fonts are in, or after this at the latest
const TRACKING = -0.04; // em, matches .portfolio-word

type Box = { x: number; y: number; w: number; h: number };
const CHROME_STOPS: [number, string][] = [
  [0, "#ffffff"],
  [0.38, "#f1f1f3"],
  [0.72, "#a7a7ae"],
  [1, "#5b5b63"],
];

/**
 * First-visit opening, drawn on one canvas: a glowing dot drifts, stretches into a pen,
 * writes SARTHAK with a spark, holds, flips letter by letter into PORTFOLIO, glides onto
 * the hero's own word and lifts away as the particles gather into the portrait. Any click,
 * tap, key or wheel skips to the glide. Shown only when the boot script set
 * data-preload="on" (motion on, first visit this session); CSS hides it at 3 s if scripts
 * never run.
 *
 * <html data-preload>: on (boot) → loading (story) → burst (reveal) → removed, + data-opened.
 */
export function Opening() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute("data-preload") !== "on") return;
    const remember = () => {
      try {
        sessionStorage.setItem(PRELOAD_KEY, "1");
      } catch {
        /* private mode: it simply plays again next visit */
      }
    };
    const end = () => {
      remember();
      root.setAttribute("data-opened", "");
      root.removeAttribute("data-preload");
      window.scrollTo(0, 0);
      // The scrollbar returns with the overlay gone: let scroll-linked layout re-measure.
      window.dispatchEvent(new Event("resize"));
    };
    // Hydrated after the safety net already hid it: the visitor is reading. Leave them be.
    if (performance.now() > FAILSAFE_MS) {
      end();
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const heroWord = document.querySelector<HTMLElement>(".portfolio-word");
    if (!canvas || !ctx || !heroWord) {
      end();
      return;
    }
    root.setAttribute("data-preload", "loading");

    // ---- measure the page: viewport, font, and where each hero letter really sits ----------
    let vw = 0;
    let vh = 0;
    let font = "";
    let size = 0;
    let ascent = 0;
    let descent = 0;
    let target: Box[] = []; // PORTFOLIO in the hero (page coordinates at scroll 0)
    let centred: Box[] = []; // PORTFOLIO centred on screen
    let nameBoxes: Box[] = []; // SARTHAK centred on screen
    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      vw = window.innerWidth;
      vh = window.innerHeight;
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cs = getComputedStyle(heroWord);
      size = parseFloat(cs.fontSize);
      font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
      ctx.font = font;
      const m = ctx.measureText("PORTFOLIO");
      ascent = m.fontBoundingBoxAscent ?? size * 0.92;
      descent = m.fontBoundingBoxDescent ?? size * 0.24;
      target = Array.from(heroWord.querySelectorAll<HTMLElement>(".portfolio-letter")).map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height };
      });
      if (target.length !== WORD.length) return;
      const left = target[0].x;
      const right = target[target.length - 1].x + target[target.length - 1].w;
      const dx = vw / 2 - (left + right) / 2;
      const dy = vh / 2 - (target[0].y + target[0].h / 2);
      centred = target.map((b) => ({ ...b, x: b.x + dx, y: b.y + dy }));
      // The name, centred on the same line with the same tracking.
      const adv = Array.from(NAME).map((ch) => ctx.measureText(ch).width + TRACKING * size);
      const total = adv.reduce((a, b) => a + b, 0);
      let x = vw / 2 - total / 2;
      nameBoxes = adv.map((w) => {
        const b = { x, y: centred[0].y, w, h: centred[0].h };
        x += w;
        return b;
      });
    };
    measure();
    if (target.length !== WORD.length) {
      end();
      return;
    }

    // Baseline inside a letter box: CSS centres the font's ascent + descent in the line box.
    const baseline = (b: Box) => b.y + (b.h - (ascent + descent)) / 2 + ascent;
    const chrome = (top: number, bottom: number) => {
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      for (const [at, c] of CHROME_STOPS) g.addColorStop(at, c);
      return g;
    };
    const glyph = (ch: string, b: Box, open = 1, alpha = 1, scroll = 0) => {
      if (!ch || open <= 0.01) return;
      const by = baseline(b) - scroll;
      const mid = b.y - scroll + b.h / 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(0, mid);
      ctx.scale(1, open); // a flip: the letter closes edge-on, then opens as the next one
      ctx.translate(0, -mid);
      ctx.fillStyle = chrome(by - ascent * 0.78, by + descent * 0.2);
      ctx.fillText(ch, b.x, by);
      ctx.restore();
    };
    const dot = (x: number, y: number, r: number, haloR: number, haloA: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, haloR);
      g.addColorStop(0, `rgba(255,255,255,${haloA})`);
      g.addColorStop(0.4, `rgba(255,255,255,${haloA * 0.35})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - haloR, y - haloR, haloR * 2, haloR * 2);
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "rgba(255,255,255,0.9)";
      ctx.shadowBlur = r * 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };
    const spark = (x: number, y: number, t: number) => {
      dot(x, y, 3.2, 70, 0.35);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        const a = t / 140 + (i * Math.PI) / 2;
        const len = 9 + 5 * Math.sin(t / 60 + i);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
    };

    // ---- the story ---------------------------------------------------------------------
    let t0 = -1; // story clock origin, once fonts are in
    let skipBy = 0; // ms jumped forward by a skip
    let raf = 0;
    let revealed = false;
    let finished = false;
    const begin = () => {
      if (t0 < 0) {
        measure(); // fonts may have changed the metrics
        t0 = performance.now();
      }
    };
    (document.fonts?.ready ?? Promise.resolve()).then(begin);
    const fontTimer = window.setTimeout(begin, FONT_WAIT_MS);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, vw, vh);
      const t = t0 < 0 ? 0 : now - t0 + skipBy;
      const { name, p } = phaseAt(t);
      const cx = vw / 2;
      const cy = centred[0].y + centred[0].h / 2;

      // Black, lifting during the reveal so the particle portrait shows through.
      const bg = name === "reveal" ? 1 - easeInOut(p) : 1;
      ctx.fillStyle = `rgba(0,0,0,${bg})`;
      ctx.fillRect(0, 0, vw, vh);
      if (name === "reveal" && !revealed) {
        revealed = true;
        root.setAttribute("data-preload", "burst"); // particles gather, the subtitle rises
      }

      if (name === "drift") {
        // A small lazy loop that ends at the centre.
        const k = 1 - easeOut(p);
        const x = cx + Math.sin(p * 5.5 + 0.6) * vw * 0.09 * k;
        const y = cy + Math.cos(p * 4.2) * vh * 0.07 * k;
        dot(x, y, 5 + Math.sin(now / 260) * 0.8, 140, 0.16);
      } else if (name === "ignite") {
        // The dot draws a line up out of itself ("!"), then leans and slides to the name's start.
        const stretch = easeOut(Math.min(1, p / 0.45));
        const travel = easeInOut(Math.max(0, (p - 0.45) / 0.55));
        const x = cx + (nameBoxes[0].x - cx) * travel;
        const lean = travel * 0.9;
        const len = size * 0.62 * stretch * (1 - travel * 0.45);
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(3.5, size * 0.06);
        ctx.shadowColor = "rgba(255,255,255,0.8)";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(x, cy - len * 0.25);
        ctx.lineTo(x + Math.sin(lean) * len, cy - len * 0.25 - Math.cos(lean) * len);
        ctx.stroke();
        ctx.shadowBlur = 0;
        dot(x, cy + len * 0.15, 4.5, 110, 0.18);
      } else if (name === "write" || name === "hold") {
        ctx.font = font;
        const left = nameBoxes[0].x;
        const right = nameBoxes[nameBoxes.length - 1].x + nameBoxes[nameBoxes.length - 1].w;
        const head = name === "write" ? left + (right - left) * writeHead(p) : right;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, head, vh);
        ctx.clip();
        Array.from(NAME).forEach((ch, i) => glyph(ch, nameBoxes[i]));
        ctx.restore();
        if (name === "write") spark(head, cy - size * 0.05 + Math.sin(now / 90) * size * 0.04, now);
      } else if (name === "morph") {
        ctx.font = font;
        morphSlots(p).forEach(({ ch, open }, i) => {
          // Each slot slides from its place in the name to its place in PORTFOLIO as it flips.
          const from = nameBoxes[Math.min(i, nameBoxes.length - 1)];
          const fromX = i < nameBoxes.length ? from.x : from.x + from.w;
          const to = centred[i];
          const k = easeInOut(Math.min(1, Math.max(0, p * 1.15 - (i / 9) * 0.15)));
          glyph(ch, { ...to, x: fromX + (to.x - fromX) * k }, open);
        });
      } else {
        // settle + reveal: PORTFOLIO glides from the centre onto the hero's own word.
        ctx.font = font;
        const k = name === "settle" ? easeInOut(p) : 1;
        const fade = name === "reveal" ? 1 - easeOut(Math.max(0, (p - 0.5) / 0.5)) : 1;
        Array.from(WORD).forEach((ch, i) => {
          const a = centred[i];
          const b = target[i];
          glyph(ch, { ...b, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, 1, fade, window.scrollY);
        });
      }

      if (t >= TOTAL_MS && !finished) {
        finished = true;
        cancelAnimationFrame(raf);
        canvas.style.opacity = "0";
        end();
      }
    };
    raf = requestAnimationFrame(frame);

    // ---- skipping: a click, tap, key or wheel jumps straight to the glide --------------------
    const skip = (e: Event) => {
      if (e.type === "wheel") {
        e.preventDefault();
        e.stopPropagation(); // keep smooth scroll from moving the page underneath
      }
      if (finished || t0 < 0) return;
      const t = performance.now() - t0 + skipBy;
      skipBy += skipTarget(t) - t;
    };
    const opts = { capture: true, passive: false } as const;
    window.addEventListener("pointerdown", skip, opts);
    window.addEventListener("keydown", skip, opts);
    window.addEventListener("wheel", skip, opts);
    window.addEventListener("resize", measure, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fontTimer);
      window.removeEventListener("pointerdown", skip, opts);
      window.removeEventListener("keydown", skip, opts);
      window.removeEventListener("wheel", skip, opts);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div className="opening" data-testid="opening" aria-hidden="true">
      {/* Before scripts run: a still dot on black, so the very first paint already belongs here. */}
      <div className="opening-halo" />
      <div className="opening-dot" data-testid="opening-dot" />
      <canvas ref={canvasRef} className="opening-canvas" />
    </div>
  );
}
