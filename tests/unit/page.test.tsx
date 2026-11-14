import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("renders exactly one h1 with the name", () => {
    render(<Home />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Sarthak Saxena");
  });

  it("has a main landmark for the skip link to target", () => {
    render(<Home />);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });

  it("shows the tagline", () => {
    render(<Home />);
    expect(screen.getByText(/burn the ships/i)).toBeInTheDocument();
  });
});
