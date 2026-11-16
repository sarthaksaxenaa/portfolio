import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRELOAD_KEY, motionBootScript, preloadBootScript, shouldPreload } from "@/lib/motion";
import { Opening } from "@/components/motion/Opening";
import { Warmup } from "@/components/chapters/Warmup";
import { START, TOTAL_MS } from "@/lib/openingTimeline";

const root = document.documentElement;

describe("shouldPreload", () => {
  it("plays only with motion on and only once per session", () => {
    expect(shouldPreload(true, false)).toBe(true);
    expect(shouldPreload(true, true)).toBe(false);
    expect(shouldPreload(false, false)).toBe(false);
  });
});

describe("preload boot script", () => {
  const boot = (opts: { seen: boolean; reduced?: boolean }) => {
    root.removeAttribute("data-preload");
    if (opts.seen) sessionStorage.setItem(PRELOAD_KEY, "1");
    else sessionStorage.removeItem(PRELOAD_KEY);
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") && !!opts.reduced }));
    new Function(motionBootScript)();
    new Function(preloadBootScript)();
    vi.unstubAllGlobals();
    return root.getAttribute("data-preload");
  };
  afterEach(() => sessionStorage.clear());

  it("marks the page on a first visit with motion on", () => expect(boot({ seen: false })).toBe("on"));
  it("skips on a repeat visit in the same session", () => expect(boot({ seen: true })).toBeNull());
  it("skips for reduced-motion visitors", () => expect(boot({ seen: false, reduced: true })).toBeNull());
  it("does not throw when sessionStorage is blocked", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => new Function(preloadBootScript)()).not.toThrow();
    spy.mockRestore();
  });
});

describe("Opening", () => {
  let now = 0;
  let frames: FrameRequestCallback[] = [];
  const state = () => root.getAttribute("data-preload");
  /** A canvas context that accepts every call and measures every glyph as 50 px wide. */
  const fakeCtx = () =>
    new Proxy(
      {},
      {
        get: (_, key) => {
          if (key === "measureText") return () => ({ width: 50, fontBoundingBoxAscent: 80, fontBoundingBoxDescent: 20 });
          if (key === "createLinearGradient" || key === "createRadialGradient") return () => ({ addColorStop() {} });
          return () => {};
        },
        set: () => true,
      },
    );
  const run = (until: number) =>
    act(() => {
      while (now < until) {
        now += 16;
        const batch = frames;
        frames = [];
        batch.forEach((cb) => cb(now));
        vi.advanceTimersByTime(16);
      }
    });
  const story = async () => {
    root.setAttribute("data-preload", "on");
    render(
      <>
        <Warmup />
        <Opening />
      </>,
    );
    await act(async () => {
      await Promise.resolve(); // fonts ready
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    now = 0;
    frames = [];
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => fakeCtx() as never);
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready: Promise.resolve() } });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    root.removeAttribute("data-preload");
    root.removeAttribute("data-opened");
    sessionStorage.clear();
  });

  it("does nothing when the boot script did not ask for it", () => {
    render(<Opening />);
    expect(state()).toBeNull();
  });

  it("starts with a dot on black, hidden from assistive tech", () => {
    render(<Opening />);
    expect(screen.getByTestId("opening")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("opening-dot")).toBeInTheDocument();
  });

  it("plays the whole story, reveals the page, then leaves and remembers it played", async () => {
    await story();
    expect(state()).toBe("loading");
    run(START.reveal - 50);
    expect(state()).toBe("loading"); // dot, pen, name, flip, glide: still on black
    run(START.reveal + 50);
    expect(state()).toBe("burst"); // the black lifts and the particles gather
    run(TOTAL_MS + 100);
    expect(state()).toBeNull();
    expect(root).toHaveAttribute("data-opened");
    expect(sessionStorage.getItem(PRELOAD_KEY)).toBe("1");
  });

  it("a click skips straight to the glide", async () => {
    await story();
    run(800);
    act(() => void window.dispatchEvent(new Event("pointerdown")));
    run(800 + (START.reveal - START.settle) + 50);
    expect(state()).toBe("burst");
    run(800 + (TOTAL_MS - START.settle) + 100);
    expect(state()).toBeNull();
  });

  it("the wheel skips without scrolling the page underneath", async () => {
    await story();
    run(500);
    const behind = vi.fn();
    window.addEventListener("wheel", behind);
    const e = new WheelEvent("wheel", { deltaY: 80, cancelable: true, bubbles: true });
    act(() => void document.body.dispatchEvent(e));
    expect(e.defaultPrevented).toBe(true);
    expect(behind).not.toHaveBeenCalled();
    window.removeEventListener("wheel", behind);
  });

  it("hands the wheel back once it has finished, so the page scrolls again", async () => {
    await story();
    run(TOTAL_MS + 100);
    expect(state()).toBeNull();
    const behind = vi.fn();
    window.addEventListener("wheel", behind);
    const e = new WheelEvent("wheel", { deltaY: 80, cancelable: true, bubbles: true });
    act(() => void document.body.dispatchEvent(e));
    expect(e.defaultPrevented).toBe(false);
    expect(behind).toHaveBeenCalledTimes(1);
    window.removeEventListener("wheel", behind);
  });

  it("gets out of the way at once when there is no canvas or no hero word to land on", () => {
    root.setAttribute("data-preload", "on");
    render(<Opening />); // no Warmup: nothing to land on
    expect(state()).toBeNull();
    expect(root).toHaveAttribute("data-opened");
  });

  it("hydrating after the 3 s safety net skips the opening instead of reappearing", () => {
    now = 3500;
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    expect(state()).toBeNull();
    expect(sessionStorage.getItem(PRELOAD_KEY)).toBe("1");
  });
});
