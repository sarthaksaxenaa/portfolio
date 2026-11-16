"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { PRELOAD_KEY } from "@/lib/motion";
import {
  approach,
  decodeLevel,
  encode,
  glow,
  layoutMorse,
  settleTarget,
  type MorseLine,
} from "@/lib/morse";

const WORD = "Sarthak";
const LABEL = "Burn the ships";
const MARGIN = 0.1;
const MIN_MS = 900; // long enough to read as intentional
const MAX_MS = 2500; // never hold the page hostage
const FAILSAFE_MS = 2900; // the CSS safety net hides the card at 3 s; arriving later, skip it
const SCRUB_PER_SCREEN = 0.9; // one screen of wheel or swipe flies most of the way
const SETTLE_AFTER_MS = 180;
const LIGHT_HOLD_MS = 1200;
const DECODE_END = 116; // by here every letter has flared and settled to its resting glow

const code = encode(WORD);
const codeLine = code.map((c) => c.code).join("  ");

/** Small deterministic generator so the field and stars look the same on every visit. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/**
 * First-visit opening: a card with the name written in Morse code as lines of light.
 * While the counter runs 00 → 100 the letters decode one by one; afterwards they glow
 * under a cursor or finger. Scrolling, swiping, a key or the button flies the card toward
 * the viewer and into the site. Shown only when the boot script set data-preload="on"
 * (motion on, first visit this session); CSS hides it at 3 s if this never hydrates.
 *
 * <html data-preload>: on (boot) → loading → ready → leaving → removed.
 */
export function Opening() {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);

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
    // Hydrated after the safety net already hid the card: the visitor is reading. Leave them be.
    if (performance.now() > FAILSAFE_MS) {
      remember();
      root.removeAttribute("data-preload");
      return;
    }

    const stage = stageRef.current!;
    const enter = enterRef.current;
    const card = cardRef.current!;
    const field = fieldRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    const ghosts = Array.from(field.querySelectorAll<HTMLElement>("[data-ghost]"));
    root.setAttribute("data-preload", "loading");

    // Stars behind the card, revealed as it flies away.
    const rand = seeded(7);
    const stars = starsRef.current!;
    for (let i = 0; i < 70; i++) {
      const s = document.createElement("i");
      const size = 0.6 + rand() * 1.6;
      s.style.cssText = `left:${rand() * 100}%;top:${rand() * 100}%;width:${size}px;height:${size}px;animation-duration:${(2 + rand() * 3).toFixed(1)}s;animation-delay:-${(rand() * 3).toFixed(1)}s`;
      stars.appendChild(s);
    }

    // ---- layout ----------------------------------------------------------------
    let width = 0;
    let height = 0;
    let lines: MorseLine[] = [];
    let ambient: { x: number; a: number }[] = [];
    let base: number[] = [];
    let motes: { y: number; s: number; v: number }[][] = [];
    const measure = () => {
      const r = field.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = r.width;
      height = r.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      ({ lines } = layoutMorse(WORD, width, MARGIN));
      const r2 = seeded(11);
      ambient = Array.from({ length: 90 }, () => ({ x: r2() * width, a: 0.015 + r2() * 0.03 }));
      base = lines.map(() => 0.2 + r2() * 0.18);
      motes = lines.map(() => Array.from({ length: 5 }, () => ({ y: r2() * height, s: 0.6 + r2() * 1.1, v: 12 + r2() * 26 })));
      wake();
    };

    // ---- state -------------------------------------------------------------------
    let phase: "loading" | "ready" | "leaving" = "loading";
    let count = 0;
    let clock = 0; // the decode clock: follows the counter, then runs on until every letter rests
    const start = performance.now();
    let fontsReady = false;
    document.fonts?.ready.then(() => (fontsReady = true));
    let lightX: number | null = null; // relative to the field
    let lightUntil = 0;
    let progress = 0;
    let target = 0;
    let lastInput = 0;
    let touchY: number | null = null;
    let touchFrom = 0;
    let raf = 0;
    let last = 0;
    let gone = false;

    const commit = () => {
      if (phase === "leaving") return;
      phase = "leaving";
      target = 1;
      // The name starts loading underneath while the card flies away.
      root.setAttribute("data-preload", "leaving");
      wake();
    };

    const finish = () => {
      if (gone) return;
      gone = true;
      remember();
      stage.classList.add("is-gone");
      window.setTimeout(() => {
        root.removeAttribute("data-preload");
        window.scrollTo(0, 0);
        // The page's scrollbar returns with the card gone: let scroll-linked layout re-measure.
        window.dispatchEvent(new Event("resize"));
      }, 500);
    };

    // ---- drawing -------------------------------------------------------------------
    const levels = code.map(() => 0);
    const shown = code.map(() => -1);
    const draw = (dt: number, now: number) => {
      const lit = lightX !== null && now < lightUntil;
      const radius = Math.max(70, width * 0.11);
      const flight = -progress * height * 2.2;
      const letterGlow = code.map((_, i) => levels[i]);
      ctx?.clearRect(0, 0, width, height);
      if (ctx)
        for (const a of ambient) {
          ctx.fillStyle = `rgba(255,255,255,${a.a})`;
          ctx.fillRect(a.x, 0, 0.5, height);
        }
      lines.forEach((ln, i) => {
        const near = lit ? glow((lightX as number) - ln.x, radius) : 0;
        const level = Math.max(levels[ln.letter], near);
        letterGlow[ln.letter] = Math.max(letterGlow[ln.letter], near);
        if (!ctx) return;
        const alpha = base[i] + level * (0.95 - base[i]);
        // Glow as two soft strokes behind the line: far cheaper than canvas shadowBlur.
        if (level > 0.3) {
          ctx.fillStyle = `rgba(255,255,255,${(level * 0.06).toFixed(3)})`;
          ctx.fillRect(ln.x - 6, flight, 13, height);
          ctx.fillStyle = `rgba(255,255,255,${(level * 0.12).toFixed(3)})`;
          ctx.fillRect(ln.x - 2, flight, 5, height);
        }
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.fillRect(ln.x, flight, ln.dash ? 1.2 : 1, height);
        if (level > 0.45) {
          for (const m of motes[i]) {
            m.y -= m.v * dt;
            if (m.y < 0) m.y += height;
            ctx.fillStyle = `rgba(240,240,245,${(0.5 * level * (0.4 + 0.6 * Math.random())).toFixed(3)})`;
            ctx.fillRect(ln.x - m.s / 2 + 0.5, m.y + flight, m.s, m.s);
          }
        }
      });
      // Restyle a letter only when its glow visibly changes: each one carries a blur filter.
      ghosts.forEach((g, i) => {
        const v = Math.max(0, letterGlow[i] * (1 - progress * 2));
        if (Math.abs(v - shown[i]) < 0.01 && !(v === 0 && shown[i] !== 0)) return;
        shown[i] = v;
        g.style.setProperty("--lit", v.toFixed(3));
      });
    };

    // ---- loop --------------------------------------------------------------------
    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;

      if (phase === "loading") {
        const t = now - start;
        const done = (fontsReady && t >= MIN_MS) || t >= MAX_MS;
        // Catch-up is time-based, so it finishes on schedule even when frames come slowly.
        count = done
          ? count + Math.max(240 * dt, (100 - count) * (1 - Math.exp(-18 * dt)))
          : Math.min(90, 100 * (1 - Math.exp(-t / 450)));
        const value = Math.min(100, Math.round(count));
        if (countRef.current) countRef.current.textContent = String(value).padStart(2, "0");
        if (value >= 100) {
          count = 100;
          phase = "ready";
          root.setAttribute("data-preload", "ready");
        }
      }
      clock = phase === "loading" ? count : Math.min(DECODE_END, clock + 40 * dt);
      code.forEach((_, i) => (levels[i] = decodeLevel(clock, i, code.length)));

      // Released mid-scrub: finish the flight or spring back.
      if (phase !== "leaving" && touchY === null && lastInput && now - lastInput > SETTLE_AFTER_MS) {
        lastInput = 0;
        if (settleTarget(target) === 1) commit();
        else target = 0;
      }
      progress = approach(progress, target, phase === "leaving" ? 3.2 : 9, dt);
      if (Math.abs(progress - target) < 0.0005) progress = target;

      card.style.transform = progress ? `translateZ(${(progress * 700).toFixed(1)}px) scale(${(1 + progress * 6).toFixed(3)})` : "";
      card.style.opacity = String(Math.max(0, 1 - progress * 1.35));
      stars.style.opacity = String(Math.min(1, Math.max(0, (progress - 0.25) * 2)));
      draw(dt, now);

      if (phase === "leaving" && progress > 0.985) finish();

      const busy =
        phase === "loading" ||
        (phase === "leaving" && !gone) ||
        progress !== target ||
        lastInput !== 0 ||
        (lightX !== null && now < lightUntil) ||
        clock < DECODE_END;
      if (busy) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => {
      if (!raf && !gone) raf = requestAnimationFrame(frame);
    };

    // ---- input: everything that would scroll the page drives the card instead ----------
    const scrub = (delta: number) => {
      if (phase === "leaving") return;
      target = Math.min(1, Math.max(0, target + delta));
      lastInput = performance.now();
      wake();
    };
    const light = (clientX: number) => {
      const r = field.getBoundingClientRect();
      lightX = clientX - r.left;
      lightUntil = performance.now() + LIGHT_HOLD_MS;
      wake();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation(); // keep smooth scroll from moving the page underneath
      // Some browsers report wheel distance in lines or pages rather than pixels.
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      scrub(px / (window.innerHeight * SCRUB_PER_SCREEN));
    };
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      touchY = t.clientY;
      touchFrom = target;
      light(t.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || touchY === null) return;
      e.preventDefault();
      e.stopPropagation();
      light(t.clientX);
      if (phase === "leaving") return;
      target = Math.min(1, Math.max(0, touchFrom + (touchY - t.clientY) / (window.innerHeight * 0.7)));
      lastInput = performance.now();
      wake();
    };
    const onTouchEnd = () => {
      touchY = null;
      lastInput = performance.now();
      wake();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch") light(e.clientX);
    };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " ", "Enter"].includes(e.key) && document.activeElement === document.body) {
        e.preventDefault();
        commit();
      }
    };
    const onEnter = () => commit();

    const opts = { capture: true, passive: false } as const;
    window.addEventListener("wheel", onWheel, opts);
    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    window.addEventListener("touchmove", onTouchMove, opts);
    window.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { capture: true, passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", measure, { passive: true });
    enter?.addEventListener("click", onEnter);
    measure();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel, opts);
      window.removeEventListener("touchstart", onTouchStart, { capture: true });
      window.removeEventListener("touchmove", onTouchMove, opts);
      window.removeEventListener("touchend", onTouchEnd, { capture: true });
      window.removeEventListener("touchcancel", onTouchEnd, { capture: true });
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", measure);
      enter?.removeEventListener("click", onEnter);
      stars.replaceChildren();
    };
  }, []);

  return (
    <div className="opening" data-testid="opening" ref={stageRef}>
      <div className="opening-stars" aria-hidden="true" ref={starsRef} />
      <div className="opening-card" ref={cardRef}>
        <p className="opening-label font-mono" aria-hidden="true">
          {LABEL}
        </p>
        <div className="opening-field" ref={fieldRef} aria-hidden="true">
          <canvas ref={canvasRef} className="opening-canvas" />
          {code.map((c, i) => (
            <span
              key={i}
              data-ghost
              className="opening-ghost font-display"
              style={{ left: `${(MARGIN + ((1 - 2 * MARGIN) / code.length) * (i + 0.5)) * 100}%` } as CSSProperties}
            >
              {c.ch}
            </span>
          ))}
        </div>
        <div className="opening-foot font-mono">
          <span aria-hidden="true" className="opening-count">
            <span ref={countRef} data-testid="opening-count">
              00
            </span>
            <span className="opening-state" />
          </span>
          <span aria-hidden="true" className="opening-code">
            {codeLine}
          </span>
          <button type="button" ref={enterRef} className="opening-enter" data-testid="opening-enter">
            <span className="opening-hint-fine">Scroll to enter</span>
            <span className="opening-hint-touch">Swipe up to enter</span>
          </button>
        </div>
      </div>
    </div>
  );
}
