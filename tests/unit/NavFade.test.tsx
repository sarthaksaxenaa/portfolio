import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NavFade, NAV_FADE_AT, navFaded } from "@/components/ui/NavFade";

const scrollTo = async (y: number) => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  await act(async () => {
    window.dispatchEvent(new Event("scroll"));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  });
};

describe("menu fade", () => {
  afterEach(() => document.documentElement.removeAttribute("data-scrolled"));

  it("stays clear at the very top and turns on once the page moves", () => {
    expect(navFaded(0)).toBe(false);
    expect(navFaded(NAV_FADE_AT - 1)).toBe(false);
    expect(navFaded(NAV_FADE_AT)).toBe(true);
    expect(navFaded(Number.NaN)).toBe(false);
  });

  it("is decorative and marks the page as scrolled, then clears on the way back up", async () => {
    const { container } = render(<NavFade />);
    const scrim = container.querySelector(".nav-fade")!;
    expect(scrim).toHaveAttribute("aria-hidden", "true");
    await scrollTo(0);
    expect(document.documentElement).not.toHaveAttribute("data-scrolled");
    await scrollTo(400);
    expect(document.documentElement).toHaveAttribute("data-scrolled");
    await scrollTo(0);
    expect(document.documentElement).not.toHaveAttribute("data-scrolled");
  });

  it("stops listening when it unmounts", async () => {
    const { unmount } = render(<NavFade />);
    unmount();
    await scrollTo(400);
    expect(document.documentElement).not.toHaveAttribute("data-scrolled");
  });
});
