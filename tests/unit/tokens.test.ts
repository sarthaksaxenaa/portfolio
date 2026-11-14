import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  color,
  contrastPairs,
  contrastRatio,
  hairline,
  luminance,
  type ColorToken,
} from "@/lib/tokens";

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBe(1);
    // #767676 on white is the classic "just passes AA" grey (4.54:1).
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
  });

  it("is symmetric", () => {
    expect(contrastRatio(color.text, color.bg)).toBe(
      contrastRatio(color.bg, color.text),
    );
  });

  it("rejects malformed colours instead of returning NaN", () => {
    for (const bad of ["#FFF", "FFFFFF", "#GGGGGG", "", "#1234567", "rgb(0,0,0)"]) {
      expect(() => luminance(bad)).toThrow(/6-digit hex/);
    }
  });
});

describe("design tokens", () => {
  it.each(contrastPairs)(
    "$fg on $bg meets at least $min:1",
    ({ fg, bg, min }) => {
      expect(contrastRatio(color[fg], color[bg])).toBeGreaterThanOrEqual(min);
    },
  );

  it("keeps every surface darker than the text, in ascending order", () => {
    const ladder: ColorToken[] = ["bg", "surface1", "surface2", "surface3"];
    const l = ladder.map((t) => luminance(color[t]));
    for (let i = 1; i < l.length; i++) expect(l[i]).toBeGreaterThan(l[i - 1]);
    expect(luminance(color.text)).toBeGreaterThan(l[l.length - 1]);
  });

  it("never uses pure black as the page background", () => {
    expect(color.bg.toUpperCase()).not.toBe("#000000");
  });
});

describe("globals.css mirrors lib/tokens.ts", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  const root = /:root\s*{([^}]*)}/.exec(css)?.[1] ?? "";

  it.each(Object.entries(color))("--color-%s equals %s", (name, value) => {
    const m = new RegExp(`--color-${name}:\\s*([^;]+);`).exec(root);
    expect(m, `--color-${name} missing from :root`).not.toBeNull();
    expect(m![1].trim().toUpperCase()).toBe(value.toUpperCase());
  });

  it("declares the hairline", () => {
    const m = /--hairline:\s*([^;]+);/.exec(root);
    expect(m?.[1].replace(/\s/g, "")).toBe(hairline.replace(/\s/g, ""));
  });

  it("declares no colour variable that tokens.ts does not know about", () => {
    const declared = [...root.matchAll(/--color-([a-z0-9]+):/gi)].map((m) => m[1]);
    expect(declared.sort()).toEqual(Object.keys(color).sort());
  });
});
