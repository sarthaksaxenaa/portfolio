import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRELOAD_KEY, motionBootScript, preloadBootScript, shouldPreload } from "@/lib/motion";
import { Opening } from "@/components/motion/Opening";
import { SCENE_READY_EVENT } from "@/lib/sceneEvents";

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
  let resolveFonts: () => void = () => {};
  const state = () => root.getAttribute("data-preload");
  const fontsNow = async () =>
    act(async () => {
      resolveFonts();
      await Promise.resolve();
    });
  const sceneReady = () => act(() => void window.dispatchEvent(new Event(SCENE_READY_EVENT)));
  const advance = (ms: number) =>
    act(() => {
      now += ms;
      vi.advanceTimersByTime(ms);
    });

  beforeEach(() => {
    vi.useFakeTimers();
    now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: new Promise<void>((r) => (resolveFonts = r)) },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    root.removeAttribute("data-preload");
    sessionStorage.clear();
  });

  it("does nothing when the boot script did not ask for it", () => {
    render(<Opening />);
    expect(state()).toBeNull();
  });

  it("is one glowing dot on black, hidden from assistive tech", () => {
    render(<Opening />);
    expect(screen.getByTestId("opening")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("opening-dot")).toBeInTheDocument();
  });

  it("pulses until fonts and the particle portrait are both ready, then bursts and lifts", async () => {
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    expect(state()).toBe("loading");
    await fontsNow();
    advance(1500);
    expect(state()).toBe("loading"); // the portrait is not ready yet
    sceneReady();
    expect(state()).toBe("burst");
    expect(sessionStorage.getItem(PRELOAD_KEY)).toBe("1");
    advance(1000);
    expect(state()).toBeNull();
  });

  it("never bursts before the minimum time, even when everything is ready at once", async () => {
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    await fontsNow();
    sceneReady();
    expect(state()).toBe("loading");
    advance(1100);
    expect(state()).toBe("burst");
  });

  it("never waits longer than 3.2 s, even if the 3D scene never arrives", () => {
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    advance(3100);
    expect(state()).toBe("loading");
    advance(150);
    expect(state()).toBe("burst");
  });

  it("hydrating after the 3 s safety net skips the opening instead of reappearing", () => {
    now = 3500;
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    expect(state()).toBeNull();
    expect(sessionStorage.getItem(PRELOAD_KEY)).toBe("1");
  });
});
