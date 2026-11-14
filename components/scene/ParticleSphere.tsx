"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, Color, type Points, type ShaderMaterial } from "three";
import { damp } from "@/lib/cursor";
import { fibonacciSphere, seeds } from "@/lib/sphere";
import { fragmentShader, vertexShader } from "./shaders";

type Props = {
  count: number;
  dpr: number;
  /** false = draw one still frame (MOTION OFF / reduced motion). */
  animate: boolean;
  /** false = the hero is off screen: stop rendering entirely. */
  active: boolean;
};

const FAR = 99; // pointer "nowhere"
/** The sphere is atmosphere, not the subject: it must never out-shine the portrait. */
const PEAK_OPACITY = 0.5;

function Sphere({ count, animate }: { count: number; animate: boolean }) {
  const points = useRef<Points>(null);
  const material = useRef<ShaderMaterial>(null);
  const pointer = useRef({ x: FAR, y: FAR, force: 0, target: 0 });
  const { gl, invalidate, size } = useThree();

  const positions = useMemo(() => fibonacciSphere(count), [count]);
  const aSeed = useMemo(() => seeds(count), [count]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 22 },
      uPixelRatio: { value: 1 },
      uMouse: { value: [FAR, FAR] },
      uMouseForce: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new Color("#ffffff") },
    }),
    [],
  );

  // The canvas sits behind the page (pointer-events: none), so listen on the window.
  useEffect(() => {
    if (!animate) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = gl.domElement.getBoundingClientRect();
      pointer.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.current.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      pointer.current.target = 1;
    };
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) pointer.current.target = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [animate, gl]);

  // Uniforms are mutated through the material ref, never the memoised object (React compiler rule).
  useEffect(() => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uPixelRatio.value = gl.getPixelRatio();
    // Size relative to the canvas so the sphere reads the same on any screen.
    u.uSize.value = Math.min(size.width, size.height) / 70;
    invalidate();
  }, [gl, size, invalidate]);

  /* Per-frame GPU state: three.js uniforms are mutable by design and are written here,
     outside React rendering, which is exactly what useFrame is for. */
  /* eslint-disable react-hooks/immutability */
  useFrame((state, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;
    const dt = Math.min(delta, 0.064);
    if (!animate) {
      u.uOpacity.value = PEAK_OPACITY;
      u.uTime.value = 12; // a pleasant, fixed moment of the flow field
      return;
    }
    u.uTime.value += dt;
    u.uOpacity.value = damp(u.uOpacity.value, PEAK_OPACITY, 1.6, dt); // fade in on load
    const p = pointer.current;
    p.force = damp(p.force, p.target, 4, dt);
    u.uMouse.value = [p.x, p.y];
    u.uMouseForce.value = p.force;
    if (points.current) {
      points.current.rotation.y += dt * 0.06;
      points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.15;
    }
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[aSeed, 1]} />
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

export default function ParticleSphere({ count, dpr, animate, active }: Props) {
  const frameloop = !active ? "never" : animate ? "always" : "demand";
  return (
    <Canvas
      data-testid="particle-canvas"
      data-frameloop={frameloop}
      frameloop={frameloop}
      dpr={[1, dpr]}
      camera={{ position: [0, 0, 3.4], fov: 45 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      <Sphere count={count} animate={animate} />
    </Canvas>
  );
}
