"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, Color, type ShaderMaterial } from "three";
import { damp } from "@/lib/cursor";
import { fibonacciSphere, seeds } from "@/lib/sphere";
import { CHAPTER_OPACITY, MORPH_INDEX, body, field, grid, roads } from "@/lib/morphTargets";
import { fragmentShader, vertexShader } from "./shaders";
import { CAM_Z, FOV, placements } from "@/lib/scenePlacement";

type Props = {
  count: number;
  dpr: number;
  /** false = no animation: shapes snap per chapter and redraw only on change (MOTION OFF). */
  animate: boolean;
};

export const CHAPTER_EVENT = "chapterchange";
const FAR = 99;


const currentChapter = () => document.documentElement.getAttribute("data-chapter") ?? "warmup";

function Field({ count, animate }: { count: number; animate: boolean }) {
  const material = useRef<ShaderMaterial>(null);
  const pointer = useRef({ x: FAR, y: FAR, force: 0, target: 0 });
  const state = useRef({ morph: 0, opacity: 0, chapter: "warmup", rot: 0 });
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
      aField: field(count),
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
      uColor: { value: new Color("#ffffff") },
    }),
    [],
  );

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
        <bufferAttribute attach="attributes-aField" args={[geometry.aField, 3]} />
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
