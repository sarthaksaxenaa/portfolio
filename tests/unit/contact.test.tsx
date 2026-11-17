import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Cooldown } from "@/components/chapters/Cooldown";
import { CopyEmail } from "@/components/ui/CopyEmail";
import { LocalTime } from "@/components/ui/LocalTime";
import { profile } from "@/content/profile";
import { Profile, PUBLIC_EMAIL } from "@/content/schema";
import { localTime, timeZoneLabel } from "@/lib/localTime";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("local time", () => {
  it("shows the time where Sarthak is, whatever the visitor's own zone", () => {
    const at = new Date("2026-11-17T14:22:00Z"); // 19:52 in India
    expect(localTime(at, "Asia/Kolkata")).toBe("7:52 PM");
    expect(localTime(new Date("2026-11-17T18:30:00Z"), "Asia/Kolkata")).toBe("12:00 AM");
    expect(timeZoneLabel("Asia/Kolkata")).toBe("IST");
    // Summer time: the label follows the moment it is for, not the moment the page was built.
    expect(timeZoneLabel("Europe/London", new Date("2026-07-01T12:00:00Z"))).not.toBe(
      timeZoneLabel("Europe/London", new Date("2026-01-01T12:00:00Z")),
    );
  });

  it("refuses a time zone that does not exist", () => {
    const base = { ...profile };
    expect(Profile.safeParse({ ...base, timeZone: "Asia/Atlantis" }).success).toBe(false);
    expect(Profile.safeParse(base).success).toBe(true);
  });

  it("renders nothing time-specific on the server, then ticks every minute in the browser", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "Date"] });
    vi.setSystemTime(new Date("2026-11-17T14:22:30Z"));
    render(<LocalTime timeZone="Asia/Kolkata" />);
    expect(screen.getByTestId("local-time")).toHaveTextContent("7:52 PM");
    await act(async () => {
      vi.advanceTimersByTime(30_000); // to 14:23:00, the next minute
    });
    expect(screen.getByTestId("local-time")).toHaveTextContent("7:53 PM");
  });
});

describe("copy email", () => {
  it("copies the public address and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<CopyEmail email={PUBLIC_EMAIL} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy email address" }));
    });
    expect(writeText).toHaveBeenCalledWith(PUBLIC_EMAIL);
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
  });

  it("when the browser refuses, it selects the address and says how to copy it", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(
      <>
        <a id="addr">{PUBLIC_EMAIL}</a>
        <CopyEmail email={PUBLIC_EMAIL} selectId="addr" />
      </>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy email address" }));
    });
    expect(screen.getByRole("status")).toHaveTextContent(/selected, press Ctrl\+C/i);
    expect(window.getSelection()!.toString()).toBe(PUBLIC_EMAIL);
  });

  it("works where there is no clipboard at all", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    render(<CopyEmail email={PUBLIC_EMAIL} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy email address" }));
    });
    expect(screen.getByRole("status")).toHaveTextContent(/press Ctrl\+C/i);
  });
});

describe("contact section", () => {
  it("leads with LET'S TALK, the status, the email and the way to copy it", () => {
    render(<Cooldown />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/let.s\s*talk/i);
    expect(screen.getByText(profile.availability)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: PUBLIC_EMAIL })).toHaveAttribute("href", `mailto:${PUBLIC_EMAIL}`);
    expect(screen.getByRole("button", { name: "Copy email address" })).toBeInTheDocument();
    expect(screen.getByText(profile.location, { exact: false })).toBeInTheDocument();
    for (const l of profile.links) expect(screen.getByRole("link", { name: new RegExp(l.label) })).toHaveAttribute("href", l.href);
    expect(screen.getByTestId("contact-resume")).toHaveAttribute("href", profile.resume.href);
  });
});
