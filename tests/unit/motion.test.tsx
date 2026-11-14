import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MOTION_KEY, motionBootScript, motionEnabled, readMotionPref, writeMotionPref } from "@/lib/motion";
import { MotionProvider, useMotion } from "@/components/motion/MotionProvider";
import { MotionToggle } from "@/components/motion/MotionToggle";

const throwing = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

describe("motion preference", () => {
  it("explicit choice beats the OS setting; no choice follows the OS", () => {
    expect(motionEnabled("on", true)).toBe(true);
    expect(motionEnabled("off", false)).toBe(false);
    expect(motionEnabled(null, true)).toBe(false);
    expect(motionEnabled(null, false)).toBe(true);
  });

  it("ignores garbage in storage", () => {
    for (const v of ["yes", "", "ON", "true", "null"]) {
      expect(readMotionPref({ getItem: () => v, setItem: () => {} })).toBeNull();
    }
  });

  it("survives storage that throws (Safari private mode, blocked storage)", () => {
    expect(readMotionPref(throwing)).toBeNull();
    expect(writeMotionPref(throwing, "off")).toBe(false);
    expect(readMotionPref(null)).toBeNull();
    expect(writeMotionPref(undefined, "on")).toBe(false);
  });

  it("round-trips through real storage", () => {
    expect(writeMotionPref(localStorage, "off")).toBe(true);
    expect(readMotionPref(localStorage)).toBe("off");
  });
});

describe("boot script", () => {
  const run = (stored: string | null, reduced: boolean) => {
    if (stored === null) localStorage.removeItem(MOTION_KEY);
    else localStorage.setItem(MOTION_KEY, stored);
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") && reduced }));
    new Function(motionBootScript)();
    vi.unstubAllGlobals();
    return document.documentElement.getAttribute("data-motion");
  };

  it("matches motionEnabled() for every combination", () => {
    for (const stored of ["on", "off", null, "junk"] as const) {
      for (const reduced of [true, false]) {
        const expected = motionEnabled(stored === "on" || stored === "off" ? stored : null, reduced) ? "on" : "off";
        expect(run(stored, reduced), `${stored}/${reduced}`).toBe(expected);
      }
    }
  });
});

describe("MotionProvider + MotionToggle", () => {
  afterEach(() => vi.unstubAllGlobals());
  const media = (reduced: boolean) =>
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce") && reduced,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

  function Probe() {
    const { enabled } = useMotion();
    return <span data-testid="motion">{enabled ? "on" : "off"}</span>;
  }
  const ui = () =>
    render(
      <MotionProvider>
        <MotionToggle />
        <Probe />
      </MotionProvider>,
    );

  it("defaults to on without reduced motion and exposes a switch", () => {
    media(false);
    ui();
    const sw = screen.getByRole("switch", { name: "Motion" });
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.getAttribute("data-motion")).toBe("on");
  });

  it("defaults to off with reduced motion", () => {
    media(true);
    ui();
    expect(screen.getByRole("switch", { name: "Motion" })).toHaveAttribute("aria-checked", "false");
  });

  it("toggling persists the choice and updates the page", () => {
    media(false);
    ui();
    act(() => screen.getByRole("switch", { name: "Motion" }).click());
    expect(screen.getByTestId("motion")).toHaveTextContent("off");
    expect(localStorage.getItem(MOTION_KEY)).toBe("off");
    expect(document.documentElement.getAttribute("data-motion")).toBe("off");
  });

  it("restores a saved choice on the next visit", () => {
    media(false);
    localStorage.setItem(MOTION_KEY, "off");
    ui();
    expect(screen.getByTestId("motion")).toHaveTextContent("off");
  });

  it("lets a reduced-motion visitor opt in explicitly", () => {
    media(true);
    ui();
    act(() => screen.getByRole("switch", { name: "Motion" }).click());
    expect(screen.getByTestId("motion")).toHaveTextContent("on");
  });

  it("still toggles for this visit when storage is blocked", () => {
    media(false);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    ui();
    act(() => screen.getByRole("switch", { name: "Motion" }).click());
    expect(screen.getByTestId("motion")).toHaveTextContent("off");
  });
});
