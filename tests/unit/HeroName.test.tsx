import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroName } from "@/components/ui/HeroName";

describe("HeroName", () => {
  it("is one heading named once for screen readers and search", () => {
    render(<HeroName id="t" name="Sarthak Saxena" />);
    expect(screen.getByRole("heading", { level: 1, name: "Sarthak Saxena" })).toBeInTheDocument();
  });

  it("draws two loading lines, each carrying its own text for the outline layer", () => {
    const { container } = render(<HeroName id="t" name="Sarthak Saxena" />);
    const lines = Array.from(container.querySelectorAll<HTMLElement>(".hero-name-line"));
    expect(lines.map((l) => [l.dataset.line, l.dataset.text, l.textContent])).toEqual([
      ["0", "Sarthak", "Sarthak"],
      ["1", "Saxena", "Saxena"],
    ]);
    expect(lines[0].closest("[aria-hidden]")).not.toBeNull();
  });

  it("puts the counter beside the last line, hidden from assistive tech", () => {
    render(<HeroName id="t" name="Sarthak Saxena" />);
    const count = screen.getByTestId("name-count");
    expect(count.previousElementSibling).toHaveAttribute("data-text", "Saxena");
    expect(count.closest("[aria-hidden]")).not.toBeNull();
    expect(count).toBeEmptyDOMElement(); // the number is drawn by CSS
  });

  it("copes with a single-word name", () => {
    const { container } = render(<HeroName id="t" name="Sarthak" />);
    expect(container.querySelectorAll(".hero-name-line")).toHaveLength(1);
    expect(screen.queryByTestId("name-count")).toBeNull();
  });
});
