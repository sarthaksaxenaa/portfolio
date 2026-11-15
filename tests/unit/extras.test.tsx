import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRELOAD_KEY, motionBootScript, preloadBootScript, shouldPreload } from "@/lib/motion";
import { Preloader } from "@/components/motion/Preloader";

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

describe("Preloader", () => {
  let frames: FrameRequestCallback[] = [];
  let now = 0;
  let resolveFonts: () => void = () => {};
  const flushTo = (ms: number) => {
    while (now < ms && frames.length) {
      now += 16;
      const batch = frames;
      frames = [];
      batch.forEach((cb) => cb(now));
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    frames = [];
    now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: new Promise<void>((r) => (resolveFonts = r)) },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    root.removeAttribute("data-preload");
    sessionStorage.clear();
  });

  it("does nothing when the boot script did not ask for it", () => {
    render(<Preloader />);
    expect(frames).toHaveLength(0);
  });

  it("holds at 90 until fonts are ready, then finishes and remembers it played", async () => {
    root.setAttribute("data-preload", "on");
    render(<Preloader />);
    act(() => flushTo(2000));
    expect(screen.getByTestId("preloader")).toHaveTextContent("90");
    expect(root.getAttribute("data-preload")).toBe("on");

    await act(async () => {
      resolveFonts();
      await Promise.resolve();
    });
    act(() => flushTo(2200));
    expect(root.getAttribute("data-preload")).toBe("done");
    expect(sessionStorage.getItem(PRELOAD_KEY)).toBe("1");
    act(() => vi.advanceTimersByTime(1000));
    expect(root.hasAttribute("data-preload")).toBe(false);
  });

  it("never holds the page longer than 2.5 s, even if fonts never load", () => {
    root.setAttribute("data-preload", "on");
    render(<Preloader />);
    act(() => flushTo(2600));
    expect(root.getAttribute("data-preload")).toBe("done");
  });

  it("does not finish before the minimum time even if fonts are instant", async () => {
    root.setAttribute("data-preload", "on");
    render(<Preloader />);
    await act(async () => {
      resolveFonts();
      await Promise.resolve();
    });
    act(() => flushTo(500));
    expect(root.getAttribute("data-preload")).toBe("on");
  });
});
