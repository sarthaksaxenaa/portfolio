import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DPR_CAP, PARTICLES, detectTier, hasWebGL } from "@/lib/deviceTier";
import { fibonacciSphere, seeds } from "@/lib/sphere";

describe("detectTier", () => {
  it("no WebGL or Save-Data → none", () => {
    expect(detectTier({ webgl: false, cores: 16, memoryGb: 16 })).toBe("none");
    expect(detectTier({ webgl: true, saveData: true, cores: 16, memoryGb: 16 })).toBe("none");
  });
  it("weak hardware → low, whatever the screen", () => {
    expect(detectTier({ webgl: true, cores: 2, memoryGb: 8 })).toBe("low");
    expect(detectTier({ webgl: true, cores: 8, memoryGb: 2 })).toBe("low");
  });
  it("phones and narrow screens get no particles, however powerful", () => {
    expect(detectTier({ webgl: true, cores: 12, memoryGb: 16, coarsePointer: true })).toBe("none");
    expect(detectTier({ webgl: true, cores: 12, memoryGb: 16, viewportWidth: 390 })).toBe("none");
    expect(detectTier({ webgl: true, cores: 12, memoryGb: 16, viewportWidth: 768 })).toBe("high");
    // Regression: weak phones were caught by the weak-hardware rule first and got "low".
    expect(detectTier({ webgl: true, cores: 2, memoryGb: 2, coarsePointer: true })).toBe("none");
    expect(detectTier({ webgl: true, cores: 4, memoryGb: 2, viewportWidth: 412 })).toBe("none");
  });
  it("strong desktops → high, ordinary ones → mid", () => {
    expect(detectTier({ webgl: true, cores: 8, memoryGb: 8, viewportWidth: 1440 })).toBe("high");
    expect(detectTier({ webgl: true, cores: 4, memoryGb: 8, viewportWidth: 1440 })).toBe("mid");
  });
  it("missing hints (Safari, Firefox) fall back to a safe middle", () => {
    expect(detectTier({ webgl: true })).toBe("mid");
  });
  it("budgets grow with tier and none renders nothing", () => {
    expect(PARTICLES.none).toBe(0);
    expect(PARTICLES.low).toBeLessThan(PARTICLES.mid);
    expect(PARTICLES.mid).toBeLessThan(PARTICLES.high);
    expect(DPR_CAP.high).toBeLessThanOrEqual(2);
  });
});

describe("hasWebGL", () => {
  const doc = (ctx: unknown, throws = false) =>
    ({
      createElement: () => ({
        getContext: () => {
          if (throws) throw new Error("blocked");
          return ctx;
        },
      }),
    }) as unknown as Document;
  it("detects a context", () => expect(hasWebGL(doc({}))).toBe(true));
  it("is false when the browser refuses a context", () => expect(hasWebGL(doc(null))).toBe(false));
  it("is false when getContext throws (blocked by policy)", () => expect(hasWebGL(doc(null, true))).toBe(false));
});

describe("fibonacciSphere", () => {
  it("returns count × 3 finite coordinates on the unit sphere", () => {
    const p = fibonacciSphere(5000);
    expect(p.length).toBe(15000);
    for (let i = 0; i < p.length; i += 3) {
      const r = Math.hypot(p[i], p[i + 1], p[i + 2]);
      expect(Number.isFinite(r)).toBe(true);
      expect(r).toBeCloseTo(1, 5);
    }
  });
  it("is balanced: the centre of mass sits at the origin", () => {
    const p = fibonacciSphere(10000);
    const c = [0, 0, 0];
    for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) c[k] += p[i + k];
    c.forEach((v) => expect(Math.abs(v / 10000)).toBeLessThan(0.01));
  });
  it("handles 0, 1, negative and fractional counts", () => {
    expect(fibonacciSphere(0).length).toBe(0);
    expect(fibonacciSphere(-5).length).toBe(0);
    expect(Array.from(fibonacciSphere(1))).toEqual([1, 0, 0]);
    expect(fibonacciSphere(2.9).length).toBe(6);
  });
});

describe("seeds", () => {
  it("are deterministic and in [0, 1)", () => {
    const a = seeds(1000);
    expect(Array.from(a)).toEqual(Array.from(seeds(1000)));
    expect(a.every((v) => v >= 0 && v < 1)).toBe(true);
  });
  it("are reasonably uniform", () => {
    const a = seeds(20000);
    const mean = a.reduce((s, v) => s + v, 0) / a.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });
});

// SceneLayer: WebGL cannot run in jsdom, so the heavy module is replaced with a probe.
vi.mock("@/components/scene/ParticleField", () => ({
  default: (props: { count: number; animate: boolean }) => (
    <div data-testid="sphere-probe" data-count={props.count} data-animate={String(props.animate)} />
  ),
}));
vi.mock("next/dynamic", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  return {
    default: (loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) => {
      const Lazy = React.lazy(loader);
      return function Dyn(props: Record<string, unknown>) {
        return (
          <React.Suspense fallback={null}>
            <Lazy {...props} />
          </React.Suspense>
        );
      };
    },
  };
});

describe("SceneLayer", () => {
  beforeEach(() => {
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => {
      cb();
      return 1;
    });
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const load = async () => (await import("@/components/scene/SceneLayer")).SceneLayer;
  const withMotion = async (ui: React.ReactNode) => {
    const { MotionProvider } = await import("@/components/motion/MotionProvider");
    return render(<MotionProvider>{ui}</MotionProvider>);
  };

  it("renders nothing without WebGL", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const SceneLayer = await load();
    await withMotion(<SceneLayer />);
    expect(screen.queryByTestId("scene-layer")).toBeNull();
  });

  it("mounts the sphere with the tier's particle budget when WebGL exists", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as RenderingContext);
    const SceneLayer = await load();
    await withMotion(
      <section id="warmup">
        <SceneLayer />
      </section>,
    );
    const scene = await screen.findByTestId("scene-layer");
    const tier = scene.getAttribute("data-tier") as keyof typeof PARTICLES;
    expect(await screen.findByTestId("sphere-probe")).toHaveAttribute("data-count", String(PARTICLES[tier]));
    expect(scene).toHaveAttribute("aria-hidden", "true");
  });

  it("draws a still frame instead of animating when motion is off", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      media: q,
      addEventListener() {},
      removeEventListener() {},
    }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as RenderingContext);
    const SceneLayer = await load();
    await withMotion(
      <section id="warmup">
        <SceneLayer />
      </section>,
    );
    expect(await screen.findByTestId("sphere-probe")).toHaveAttribute("data-animate", "false");
  });
});
