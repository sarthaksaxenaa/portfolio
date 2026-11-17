import { readFileSync } from "node:fs";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RideRace } from "@/components/demos/RideRace";
import { PocketTriage, TRIAGE_DATA_URL, TRIAGE_EXAMPLES } from "@/components/demos/PocketTriage";
import { TESTS_DATA_URL, TestReplay } from "@/components/demos/TestReplay";

const files: Record<string, string> = {
  [TRIAGE_DATA_URL]: readFileSync("public/demos/carenexus-triage.json", "utf8"),
  [TESTS_DATA_URL]: readFileSync("public/demos/carenexus-tests.json", "utf8"),
};
const fetchMock = vi.fn(async (url: string) =>
  url in files ? new Response(files[url], { status: 200 }) : new Response("missing", { status: 404 }),
);

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("ride race demo", () => {
  it("with the lock, one driver gets the ride and the other is told it is taken", () => {
    render(<RideRace />);
    expect(screen.getByRole("button", { name: "With the lock" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Both accept" }));
    expect(screen.getByTestId("race-verdict")).toHaveTextContent(/got the ride.*changed 0 rows/);
    expect(document.querySelectorAll('[data-outcome="assigned"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-outcome="taken"]')).toHaveLength(1);
  });

  it("without the lock, the same taps double-book the ride", () => {
    render(<RideRace />);
    fireEvent.click(screen.getByRole("button", { name: "Without it" }));
    expect(screen.getByRole("button", { name: "Without it" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Both accept" }));
    expect(screen.getByTestId("race-verdict")).toHaveTextContent(/Double-booked/);
    expect(document.querySelectorAll('[data-outcome="assigned"]')).toHaveLength(2);
    expect(document.querySelector(".race-trip[data-double]")).not.toBeNull();
  });

  it("switching mode clears the last run", () => {
    render(<RideRace />);
    fireEvent.click(screen.getByRole("button", { name: "Both accept" }));
    fireEvent.click(screen.getByRole("button", { name: "Without it" }));
    expect(screen.getByTestId("race-verdict")).toBeEmptyDOMElement();
    expect(screen.getByRole("button", { name: "Both accept" })).toBeInTheDocument();
  });
});

describe("pocket triage demo", () => {
  it("loads the knowledge base only once, and answers a suggestion with its level and steps", async () => {
    render(<PocketTriage />);
    fireEvent.click(screen.getByRole("button", { name: "sore throat for 3 days" }));
    await waitFor(() => expect(screen.getByTestId("triage-result")).toHaveTextContent("See a doctor soon"));
    expect(screen.getByTestId("triage-result")).toHaveTextContent(/Strep/i);
    expect(screen.getByLabelText("Describe a symptom")).toHaveValue("sore throat for 3 days");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("every suggestion gives a definite answer", async () => {
    render(<PocketTriage />);
    for (const q of TRIAGE_EXAMPLES) {
      fireEvent.click(screen.getByRole("button", { name: q }));
      await waitFor(() => expect(screen.getByTestId("triage-result").querySelector("[data-level]")).not.toBeNull());
      expect(screen.getByTestId("triage-result").querySelector("[data-level]")).not.toHaveAttribute("data-level", "none");
    }
  });

  it("an emergency says to call now; a crisis points to people who can help", async () => {
    render(<PocketTriage />);
    const input = screen.getByLabelText("Describe a symptom");
    fireEvent.change(input, { target: { value: "chest pain spreading to my left arm" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(screen.getByTestId("triage-result")).toHaveTextContent(/Emergency.*call 112 or 108/));
    fireEvent.change(input, { target: { value: "I want to die" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(screen.getByTestId("triage-result")).toHaveTextContent(/talk to someone/i));
    expect(screen.getByRole("link", { name: "9152987821" })).toHaveAttribute("href", "tel:9152987821");
  });

  it("says so when the knowledge base cannot load", async () => {
    fetchMock.mockImplementationOnce(async () => new Response("down", { status: 503 }));
    render(<PocketTriage />);
    fireEvent.click(screen.getByRole("button", { name: "headache for 2 weeks" }));
    await waitFor(() => expect(screen.getByTestId("triage-result")).toHaveTextContent(/did not load/));
  });

  it("caps what can be typed", () => {
    render(<PocketTriage />);
    expect(screen.getByLabelText("Describe a symptom")).toHaveAttribute("maxLength", "500");
  });
});

describe("test replay demo", () => {
  it("draws one square per test and, without motion, shows the finished suite", async () => {
    const { container } = render(<TestReplay />);
    await waitFor(() => expect(container.querySelectorAll(".test-grid > span")).toHaveLength(570));
    await waitFor(() => expect(container.querySelectorAll(".test-grid > span[data-ran]")).toHaveLength(570));
    expect(screen.getByText(/570 tests passed, none failing: 453 backend, 72 frontend unit, 45 end to end/)).toBeInTheDocument();
    expect(container.querySelector(".test-grid > span")!.getAttribute("title")).toMatch(/^backend\/tests\/.+ › .+/);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Replay the suite" }));
    });
    expect(container.querySelectorAll(".test-grid > span[data-ran]")).toHaveLength(570);
  });
});
