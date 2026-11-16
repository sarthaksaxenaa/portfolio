import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChapterObserver } from "@/components/motion/ChapterObserver";
import { chapters, navItems } from "@/content/chapters";

let positions: Record<string, number> = {};
const H = 1000;

function Page() {
  return (
    <>
      <nav aria-label="Sections">
        {navItems.map((n) => (
          <a key={n.href} href={n.href} data-chapters={n.chapters.join(" ")}>
            {n.label}
          </a>
        ))}
      </nav>
      {chapters.map((c) => (
        <section key={c.id} id={c.id} />
      ))}
      <ChapterObserver />
    </>
  );
}

beforeEach(() => {
  // Each section is 1000px tall; scrollY shifts them all.
  positions = Object.fromEntries(chapters.map((c, i) => [c.id, i * H]));
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const top = (positions[this.id] ?? 0) - window.scrollY;
    return { top, bottom: top + H, left: 0, right: 0, width: 0, height: H, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
  });
  vi.stubGlobal("innerHeight", H);
  // Real rAF is async; run the frame on a microtask so ordering matches the browser.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    queueMicrotask(() => cb(0));
    return 1;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const scrollTo = (y: number) =>
  act(async () => {
    vi.stubGlobal("scrollY", y);
    window.dispatchEvent(new Event("scroll"));
    await Promise.resolve();
  });

const current = () => document.querySelector('[aria-current="location"]')?.getAttribute("href");

describe("ChapterObserver", () => {
  it("marks Home in the hero and leaves the glow white", () => {
    vi.stubGlobal("scrollY", 0);
    render(<Page />);
    expect(current()).toBe("#warmup");
    expect(document.documentElement.style.getPropertyValue("--glow")).toBe("");
  });

  it("follows the scroll and tints the light inside a case study", async () => {
    vi.stubGlobal("scrollY", 0);
    render(<Page />);
    await scrollTo(2 * H);
    expect(current()).toBe("#rideshare");
    expect(document.documentElement.getAttribute("data-chapter")).toBe("rideshare");
    expect(document.documentElement.style.getPropertyValue("--glow")).toBe("129 140 248");
    await scrollTo(3 * H); // CareNexus: still under "Projects"
    expect(current()).toBe("#rideshare");
    expect(document.documentElement.style.getPropertyValue("--glow")).toBe("155 107 255");
    await scrollTo(4 * H);
    expect(current()).toBe("#overload");
    expect(document.documentElement.style.getPropertyValue("--glow")).toBe("");
  });

  it("announces each chapter change once, for the particle scene", async () => {
    vi.stubGlobal("scrollY", 0);
    const seen: string[] = [];
    const on = (e: Event) => seen.push((e as CustomEvent<string>).detail);
    window.addEventListener("chapterchange", on);
    render(<Page />);
    await scrollTo(2 * H);
    await scrollTo(2 * H + 100); // same chapter: no duplicate event
    await scrollTo(3 * H);
    window.removeEventListener("chapterchange", on);
    expect(seen).toEqual(["warmup", "rideshare", "carenexus"]);
  });

  it("never marks more than one link", async () => {
    vi.stubGlobal("scrollY", 0);
    render(<Page />);
    for (const y of [0, 1500, 3000, 4200, 5900]) {
      await scrollTo(y);
      expect(document.querySelectorAll('[aria-current="location"]').length).toBeLessThanOrEqual(1);
    }
  });

  it("cleans up on unmount", () => {
    vi.stubGlobal("scrollY", 2 * H);
    const { unmount } = render(<Page />);
    unmount();
    expect(document.documentElement.hasAttribute("data-chapter")).toBe(false);
    expect(document.documentElement.style.getPropertyValue("--glow")).toBe("");
  });
});
