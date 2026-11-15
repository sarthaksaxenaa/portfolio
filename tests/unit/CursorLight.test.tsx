import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CursorLight } from "@/components/cursor/CursorLight";
import { MotionProvider } from "@/components/motion/MotionProvider";

const Light = () => (
  <MotionProvider>
    <CursorLight />
  </MotionProvider>
);

type Media = Record<string, boolean>;

function mockMedia(media: Media) {
  const listeners = new Map<string, Set<() => void>>();
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: media[q] ?? false,
    media: q,
    addEventListener: (_: string, cb: () => void) => {
      if (!listeners.has(q)) listeners.set(q, new Set());
      listeners.get(q)!.add(cb);
    },
    removeEventListener: (_: string, cb: () => void) => listeners.get(q)?.delete(cb),
  }));
  return {
    set(q: string, v: boolean) {
      media[q] = v;
      listeners.get(q)?.forEach((cb) => cb());
    },
    count: () => [...listeners.values()].reduce((n, s) => n + s.size, 0),
  };
}

// Manual rAF so frames run only when the test says so.
let frames: FrameRequestCallback[] = [];
let clock = 0;
const flush = (n = 1) => {
  for (let i = 0; i < n; i++) {
    const batch = frames;
    frames = [];
    clock += 16;
    batch.forEach((cb) => cb(clock));
  }
};

beforeEach(() => {
  frames = [];
  clock = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => vi.unstubAllGlobals());

const root = () => document.documentElement;
const move = (x: number, y: number, pointerType = "mouse") =>
  act(() => {
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, pointerType }));
  });

describe("CursorLight", () => {
  it("on touch devices: light and tap ripple, but no ring replacing a cursor that is not there", () => {
    mockMedia({ "(pointer: fine)": false });
    const { container } = render(<Light />);
    expect(screen.getByTestId("cursor-light")).toHaveAttribute("data-mode", "touch");
    expect(root().getAttribute("data-cursor-mode")).toBe("touch");
    expect(container.querySelector(".cursor-ring")).toBeNull();
    expect(container.querySelector(".cursor-ripple")).not.toBeNull();
  });

  it("on touch: the light follows a dragging finger and a tap starts a ripple at that point", () => {
    mockMedia({ "(pointer: fine)": false });
    const { container } = render(<Light />);
    act(() => {
      window.dispatchEvent(new PointerEvent("pointerdown", { clientX: 120, clientY: 300, pointerType: "touch" }));
    });
    flush();
    expect(root().style.getPropertyValue("--mx")).toBe("120.0px");
    const ripple = container.querySelector(".cursor-ripple") as HTMLElement;
    expect(ripple.classList.contains("is-rippling")).toBe(true);
    expect(ripple.style.transform).toContain("120px, 300px");
    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 300, pointerType: "touch" }));
    });
    flush(200);
    expect(parseFloat(root().style.getPropertyValue("--mx"))).toBeCloseTo(200, 0);
  });

  it("on touch: scrolling without a finger down glides the light to the reading line", () => {
    mockMedia({ "(pointer: fine)": false });
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 800);
    render(<Light />);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    flush(200);
    expect(parseFloat(root().style.getPropertyValue("--mx"))).toBeCloseTo(195, 0);
    expect(parseFloat(root().style.getPropertyValue("--my"))).toBeCloseTo(320, 0);
    expect(root().getAttribute("data-cursor-visible")).toBe("true");
  });

  it("on touch: the light does not jump to the reading line while a finger is down", () => {
    mockMedia({ "(pointer: fine)": false });
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 800);
    render(<Light />);
    act(() => {
      window.dispatchEvent(new PointerEvent("pointerdown", { clientX: 40, clientY: 700, pointerType: "touch" }));
      window.dispatchEvent(new Event("scroll"));
    });
    flush(200);
    expect(parseFloat(root().style.getPropertyValue("--mx"))).toBeCloseTo(40, 0);
  });

  it("renders nothing when the user prefers reduced motion", () => {
    mockMedia({ "(pointer: fine)": true, "(prefers-reduced-motion: reduce)": true });
    render(<Light />);
    expect(screen.queryByTestId("cursor-light")).toBeNull();
  });

  it("renders decorative layers, hidden from assistive tech, for a mouse", () => {
    mockMedia({ "(pointer: fine)": true });
    render(<Light />);
    expect(screen.getByTestId("cursor-light")).toHaveAttribute("aria-hidden", "true");
    expect(root().getAttribute("data-cursor")).toBe("on");
  });

  it("starts at the pointer on the first move, then follows it", () => {
    mockMedia({ "(pointer: fine)": true });
    render(<Light />);
    move(200, 150);
    flush();
    expect(root().style.getPropertyValue("--mx")).toBe("200.0px");
    expect(root().getAttribute("data-cursor-visible")).toBe("true");

    move(400, 150);
    flush();
    const x = parseFloat(root().style.getPropertyValue("--mx"));
    expect(x).toBeGreaterThan(200);
    expect(x).toBeLessThan(400); // smoothed, not snapped
  });

  it("stops the animation loop once the light has caught up", () => {
    mockMedia({ "(pointer: fine)": true });
    render(<Light />);
    move(300, 300);
    flush(200);
    expect(frames).toHaveLength(0);
  });

  it("ignores touch pointer events even on a hybrid device", () => {
    mockMedia({ "(pointer: fine)": true });
    render(<Light />);
    move(50, 50, "touch");
    flush();
    expect(root().getAttribute("data-cursor-visible")).not.toBe("true");
  });

  it("fades out when the pointer leaves the window", () => {
    mockMedia({ "(pointer: fine)": true });
    render(<Light />);
    move(10, 10);
    act(() => {
      document.dispatchEvent(new MouseEvent("mouseout", { relatedTarget: null }));
    });
    expect(root().getAttribute("data-cursor-visible")).toBe("false");
  });

  it("marks hover over links so the ring can grow", () => {
    mockMedia({ "(pointer: fine)": true });
    render(
      <>
        <a href="#x">link</a>
        <Light />
      </>,
    );
    act(() => {
      screen.getByText("link").dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, clientX: 5, clientY: 5, pointerType: "mouse" }),
      );
    });
    expect(root().hasAttribute("data-cursor-hover")).toBe(true);
  });

  it("turns off live when reduced motion is switched on", () => {
    const media = mockMedia({ "(pointer: fine)": true });
    render(<Light />);
    expect(screen.getByTestId("cursor-light")).toBeInTheDocument();
    act(() => media.set("(prefers-reduced-motion: reduce)", true));
    expect(screen.queryByTestId("cursor-light")).toBeNull();
    expect(root().hasAttribute("data-cursor")).toBe(false);
  });

  it("cleans up listeners, attributes and variables on unmount", () => {
    const media = mockMedia({ "(pointer: fine)": true });
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Light />);
    move(100, 100);
    flush();
    unmount();
    expect(remove).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(media.count()).toBe(0);
    expect(root().hasAttribute("data-cursor")).toBe(false);
    expect(root().style.getPropertyValue("--mx")).toBe("");
  });
});
