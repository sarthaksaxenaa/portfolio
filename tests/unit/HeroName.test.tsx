import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroName } from "@/components/ui/HeroName";

describe("HeroName", () => {
  it("is one heading named once for screen readers and search", () => {
    render(<HeroName id="t" name="Sarthak Saxena" />);
    expect(screen.getByRole("heading", { level: 1, name: "Sarthak Saxena" })).toBeInTheDocument();
  });

  it("draws every letter as decoration, each carrying its glyph and line", () => {
    const { container } = render(<HeroName id="t" name="Sarthak Saxena" />);
    const stage = container.querySelector("[data-forge-stage]")!;
    expect(stage).toHaveAttribute("aria-hidden", "true");
    const letters = Array.from(container.querySelectorAll<HTMLElement>("[data-forge-ch]"));
    expect(letters.map((l) => l.dataset.ch).join("")).toBe("SarthakSaxena");
    expect(letters.map((l) => l.textContent).join("")).toBe("SarthakSaxena");
    expect(letters.filter((l) => l.dataset.line === "1")).toHaveLength(6);
  });

  it("staggers left to right, the second line starting a beat early", () => {
    const { container } = render(<HeroName id="t" name="Sarthak Saxena" />);
    const order = Array.from(container.querySelectorAll<HTMLElement>("[data-forge-ch]")).map((l) =>
      Number(l.style.getPropertyValue("--i")),
    );
    expect(order.slice(0, 7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(order[7]).toBe(4); // overlaps the first line's last three letters
    expect(order.slice(7)).toEqual([4, 5, 6, 7, 8, 9]);
  });
});
