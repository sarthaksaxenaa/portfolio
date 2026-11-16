import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRELOAD_KEY, motionBootScript, preloadBootScript, shouldPreload } from "@/lib/motion";
import { Opening } from "@/components/motion/Opening";
import { fireEvent } from "@testing-library/react";

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
  const state = () => root.getAttribute("data-preload");
  const lit = () =>
    screen
      .getByTestId("opening")
      .querySelectorAll<HTMLElement>("[data-ghost]")
      .values()
      .map((g) => Number(g.style.getPropertyValue("--lit") || 0))
      .toArray();
  const fontsNow = async () =>
    act(async () => {
      resolveFonts();
      await Promise.resolve();
    });

  beforeEach(() => {
    vi.useFakeTimers();
    frames = [];
    now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
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
    render(<Opening />);
    expect(frames).toHaveLength(0);
    expect(state()).toBeNull();
  });

  it("spells SARTHAK in Morse on the card", () => {
    render(<Opening />);
    expect(screen.getByTestId("opening").querySelector(".opening-code")?.textContent).toBe("...  .-  .-.  -  ....  .-  -.-");
    expect(screen.getByRole("button", { name: /enter/i })).toBeInTheDocument();
  });

  it("decodes the letters in order while counting, holding at 90 until fonts are ready", async () => {
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    expect(state()).toBe("loading");
    act(() => flushTo(600));
    const early = lit();
    expect(early[0]).toBeGreaterThan(0); // S is decoding…
    expect(early[6]).toBe(0); // …K has not started
    act(() => flushTo(2000));
    expect(screen.getByTestId("opening-count")).toHaveTextContent("90");
    expect(state()).toBe("loading");
    await fontsNow();
    act(() => flushTo(2300));
    expect(screen.getByTestId("opening-count")).toHaveTextContent("100");
    expect(state()).toBe("ready");
    act(() => flushTo(3500));
    // Every letter now rests at a faint glow, so the whole name reads behind the lines.
    for (const l of lit()) expect(l).toBeCloseTo(0.22, 2);
  });

  it("never counts longer than 2.5 s, even if fonts never load", () => {
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    act(() => flushTo(2700));
    expect(state()).toBe("ready");
  });

  it("then waits for the visitor instead of disappearing on its own", async () => {
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    await fontsNow();
    act(() => flushTo(3000));
    act(() => vi.advanceTimersByTime(20_000));
    expect(state()).toBe("ready");
  });

  it("the enter button flies into the site and remembers it played", async () => {
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    await fontsNow();
    act(() => flushTo(2300));
    fireEvent.click(screen.getByTestId("opening-enter"));
    expect(state()).toBe("leaving");
    act(() => flushTo(6000));
    expect(screen.getByTestId("opening")).toHaveClass("is-gone");
    expect(sessionStorage.getItem(PRELOAD_KEY)).toBe("1");
    act(() => vi.advanceTimersByTime(600));
    expect(state()).toBeNull();
  });

  it("leaves on time even if animation frames stall after committing", async () => {
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    await fontsNow();
    act(() => flushTo(2300));
    fireEvent.click(screen.getByTestId("opening-enter"));
    frames = []; // a starved device: no more frames arrive
    act(() => vi.advanceTimersByTime(1600));
    expect(screen.getByTestId("opening")).toHaveClass("is-gone");
    act(() => vi.advanceTimersByTime(600));
    expect(state()).toBeNull();
  });

  it("a short scroll springs back; a long one commits", async () => {
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    await fontsNow();
    act(() => flushTo(2300));
    const wheel = (dy: number) => act(() => void window.dispatchEvent(new WheelEvent("wheel", { deltaY: dy, cancelable: true })));
    wheel(window.innerHeight * 0.1);
    act(() => flushTo(3000));
    expect(state()).toBe("ready");
    wheel(window.innerHeight * 0.4);
    act(() => flushTo(3600));
    expect(state()).toBe("leaving");
  });

  it("reads wheel distance given in lines, not only pixels", async () => {
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    await fontsNow();
    act(() => flushTo(2300));
    // 3 lines × 16 px ≈ one notch on a line-based mouse; ten notches is a deliberate scroll.
    for (let i = 0; i < 10; i++)
      act(() => void window.dispatchEvent(new WheelEvent("wheel", { deltaY: 3, deltaMode: 1, cancelable: true })));
    act(() => flushTo(3000));
    expect(state()).toBe("leaving");
  });

  it("the scroll that drives the card never reaches the page underneath", async () => {
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    const behind = vi.fn();
    window.addEventListener("wheel", behind);
    const e = new WheelEvent("wheel", { deltaY: 40, cancelable: true, bubbles: true });
    act(() => void document.body.dispatchEvent(e));
    expect(e.defaultPrevented).toBe(true);
    expect(behind).not.toHaveBeenCalled();
    window.removeEventListener("wheel", behind);
  });

  it("keyboard: arrow down enters", async () => {
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    act(() => flushTo(2700));
    act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true })));
    expect(state()).toBe("leaving");
  });

  it("hydrating after the 3 s safety net skips the opening instead of reappearing", () => {
    now = 3500;
    root.setAttribute("data-preload", "on");
    render(<Opening />);
    expect(state()).toBeNull();
    expect(sessionStorage.getItem(PRELOAD_KEY)).toBe("1");
    expect(frames).toHaveLength(0);
  });
});
