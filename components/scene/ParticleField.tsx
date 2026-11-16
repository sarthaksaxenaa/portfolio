"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, Color, type BufferAttribute, type ShaderMaterial } from "three";
import { damp } from "@/lib/cursor";
import { fibonacciSphere, seeds } from "@/lib/sphere";
import { CHAPTER_OPACITY, MORPH_INDEX, body, grid, roads } from "@/lib/morphTargets";
import { PORTRAIT_SRC, samplePortrait } from "@/lib/portraitPoints";
import { CHAPTER_EVENT, SCENE_READY_EVENT } from "@/lib/sceneEvents";
import { fragmentShader, vertexShader } from "./shaders";
import { CAM_Z, FOV, HALF_Y, placements } from "@/lib/scenePlacement";

type Props = {
  count: number;
  dpr: number;
  /** false = no animation: shapes snap per chapter and redraw only on change (MOTION OFF). */
  animate: boolean;
};

const INTRO_MS = 2200;
const FAR = 99;


const currentChapter = () => document.documentElement.getAttribute("data-chapter") ?? "warmup";

function Field({ count, animate }: { count: number; animate: boolean }) {
  const material = useRef<ShaderMaterial>(null);
  const pointer = useRef({ x: FAR, y: FAR, force: 0, target: 0 });
  const state = useRef({ morph: 0, opacity: 0, chapter: "warmup", rot: 0 });
  const portraitAttr = useRef<BufferAttribute>(null);
  const intro = useRef<{ start: number | null; ready: boolean }>({ start: null, ready: false });
  const { gl, invalidate, size } = useThree();

  const geometry = useMemo(() => {
    const r = roads(count);
    return {
      position: fibonacciSphere(count),
      aSeed: seeds(count),
      aGrid: grid(count),
      aRoad: r.positions,
      aAlong: r.along,
      aBody: body(count),
      // Filled from the portrait image once it loads; until then every point waits at the centre.
      aPortrait: new Float32Array(count * 3),
    };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 22 },
      uPixelRatio: { value: 1 },
      uMouse: { value: [FAR, FAR] },
      uMouseForce: { value: 0 },
      uMorph: { value: 0 },
      uRot: { value: 0 },
      uSphere: { value: [0, 0, 1, 0] },
      uRight: { value: [0, 0, 1, 0] },
      uFull: { value: [0, 0, 1, 1] },
      uOpacity: { value: 0 },
      uPortrait: { value: [0, 0, 1, 0] },
      uIntro: { value: 0 },
      uColor: { value: new Color("#ffffff") },
    }),
    [],
  );

  // Sample the portrait once: brighter pixels get more particles. Then the burst can begin.
  useEffect(() => {
    let alive = true;
    const img = new window.Image();
    img.decoding = "async";
    img.src = PORTRAIT_SRC;
    img
      .decode()
      .then(() => {
        if (!alive) return;
        const w = 300;
        const h = Math.round((w * img.naturalHeight) / img.naturalWidth);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const points = samplePortrait(ctx.getImageData(0, 0, w, h).data, w, h, count, { floor: 0.1, gamma: 1.5 });
        const attr = portraitAttr.current;
        if (!attr) return;
        (attr.array as Float32Array).set(points);
        attr.needsUpdate = true;
        intro.current.ready = true;
        invalidate();
      })
      .catch(() => {
        intro.current.ready = true; // no portrait: the other shapes still work
      });
    return () => {
      alive = false;
    };
  }, [count, invalidate]);

  // Chapter changes (from ChapterObserver), scroll and resize: redraw on demand when not animating.
  useEffect(() => {
    state.current.chapter = currentChapter();
    const onChapter = (e: Event) => {
      state.current.chapter = (e as CustomEvent<string>).detail ?? currentChapter();
      invalidate();
    };
    const onScroll = () => invalidate();
    window.addEventListener(CHAPTER_EVENT, onChapter);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener(CHAPTER_EVENT, onChapter);
      window.removeEventListener("scroll", onScroll);
    };
  }, [invalidate]);

  // The canvas sits behind the page (pointer-events: none), so listen on the window.
  useEffect(() => {
    if (!animate) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.current.target = 1;
    };
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) pointer.current.target = 0;
    };
    // A finger pushes the particles while it is down; lifting it lets them settle.
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") pointer.current.target = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    document.addEventListener("mouseout", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [animate]);

  useEffect(() => invalidate(), [size, invalidate]);

  // Per-frame GPU state, written through the material ref outside React rendering.
  useFrame((_, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;
    const dt = Math.min(delta, 0.064);
    const s = state.current;
    const w = size.width;
    const h = size.height;
    const place = placements(w, h);

    u.uPixelRatio.value = gl.getPixelRatio();
    u.uSize.value = Math.min(w, h) / 70;
    u.uSphere.value = place.sphere;
    u.uRight.value = place.right;
    u.uFull.value = place.full;
    // The portrait belongs to the hero: it scrolls away with the page like any content.
    const scrolled = (window.scrollY / h) * 2 * HALF_Y;
    u.uPortrait.value = [place.portrait[0], place.portrait[1] + scrolled, place.portrait[2], 0];
    // The burst starts once the portrait is sampled, and takes about two seconds.
    const it = intro.current;
    if (it.ready && it.start === null) {
      it.start = performance.now();
      window.dispatchEvent(new Event(SCENE_READY_EVENT));
    }
    u.uIntro.value = !animate ? (it.ready ? 1 : 0) : it.start === null ? 0 : Math.min(1, (performance.now() - it.start) / INTRO_MS);

    const targetMorph = MORPH_INDEX[s.chapter] ?? 0;
    const targetOpacity = CHAPTER_OPACITY[s.chapter] ?? 0.25;

    if (!animate) {
      s.morph = targetMorph;
      s.opacity = targetOpacity;
      u.uTime.value = 12; // a pleasant, fixed moment of the flow field
    } else {
      u.uTime.value += dt;
      s.morph = damp(s.morph, targetMorph, 2.2, dt);
      s.opacity = damp(s.opacity, targetOpacity, 1.8, dt);
      s.rot += dt * 0.06;
      const p = pointer.current;
      p.force = damp(p.force, p.target, 4, dt);
      u.uMouse.value = [p.x, p.y];
      u.uMouseForce.value = p.force;
    }
    u.uMorph.value = s.morph;
    u.uOpacity.value = s.opacity;
    u.uRot.value = s.rot;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geometry.position, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[geometry.aSeed, 1]} />
        <bufferAttribute attach="attributes-aGrid" args={[geometry.aGrid, 3]} />
        <bufferAttribute attach="attributes-aRoad" args={[geometry.aRoad, 3]} />
        <bufferAttribute attach="attributes-aAlong" args={[geometry.aAlong, 1]} />
        <bufferAttribute attach="attributes-aBody" args={[geometry.aBody, 3]} />
        <bufferAttribute ref={portraitAttr} attach="attributes-aPortrait" args={[geometry.aPortrait, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

export default function ParticleField({ count, dpr, animate }: Props) {
  const frameloop = animate ? "always" : "demand";
  return (
    <Canvas
      data-testid="particle-canvas"
      data-frameloop={frameloop}
      frameloop={frameloop}
      dpr={[1, dpr]}
      camera={{ position: [0, 0, CAM_Z], fov: FOV }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      <Field count={count} animate={animate} />
    </Canvas>
  );
}
