import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LEGACY_MOTION_KEY, motionBootScript, motionEnabled } from "@/lib/motion";
import { MotionProvider, useMotion } from "@/components/motion/MotionProvider";
import Home from "@/app/page";

describe("motion follows the operating system only", () => {
  it("is on unless the OS asks for reduced motion", () => {
    expect(motionEnabled(false)).toBe(true);
    expect(motionEnabled(true)).toBe(false);
  });
});

describe("boot script", () => {
  const run = (reduced: boolean) => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") && reduced }));
    new Function(motionBootScript)();
    vi.unstubAllGlobals();
    return document.documentElement.getAttribute("data-motion");
  };

  it("matches motionEnabled() before first paint", () => {
    expect(run(false)).toBe("on");
    expect(run(true)).toBe("off");
  });

  it("ignores and deletes a saved 'off' from the removed switch, so no visitor stays stuck", () => {
    localStorage.setItem(LEGACY_MOTION_KEY, "off");
    expect(run(false)).toBe("on");
    expect(localStorage.getItem(LEGACY_MOTION_KEY)).toBeNull();
  });

  it("does not throw when storage is blocked", () => {
    const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(run(false)).toBe("on");
    spy.mockRestore();
  });
});

describe("MotionProvider", () => {
  afterEach(() => vi.unstubAllGlobals());
  const media = (reduced: boolean) =>
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce") && reduced,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  function Probe() {
    return <span data-testid="motion">{useMotion().enabled ? "on" : "off"}</span>;
  }

  it("is on by default and marks the page", () => {
    media(false);
    render(<MotionProvider><Probe /></MotionProvider>);
    expect(screen.getByTestId("motion")).toHaveTextContent("on");
    expect(document.documentElement.getAttribute("data-motion")).toBe("on");
  });

  it("is off for reduced-motion visitors", () => {
    media(true);
    render(<MotionProvider><Probe /></MotionProvider>);
    expect(screen.getByTestId("motion")).toHaveTextContent("off");
  });

  it("the page offers no motion switch", () => {
    media(false);
    render(<MotionProvider><Home /></MotionProvider>);
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByText(/motion (on|off)/i)).toBeNull();
  });
});
