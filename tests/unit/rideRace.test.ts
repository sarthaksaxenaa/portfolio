import { describe, expect, it } from "vitest";
import { race, randomTimings, type Timing } from "@/lib/rideRace";

const t = (driver: "A" | "B", readAt: number, writeAt: number): Timing => ({ driver, readAt, writeAt });

describe("ride race", () => {
  it("with the lock, exactly one driver gets the ride however the requests interleave", () => {
    const orders: Timing[][] = [
      [t("A", 0, 10), t("B", 5, 20)],
      [t("A", 0, 30), t("B", 5, 20)],
      [t("A", 5, 15), t("B", 5, 15)], // a dead heat: the database still serialises the writes
      [t("A", 0, 1), t("B", 100, 101)],
    ];
    for (const timings of orders) {
      const r = race(timings, "lock");
      expect(r.winners).toHaveLength(1);
      expect(r.finalDriver).toBe(r.winners[0]);
      const loser = r.results.find((x) => x.driver !== r.winners[0])!;
      expect(loser).toMatchObject({ rows: 0, outcome: "taken" });
    }
  });

  it("the first write to land wins, not the first tap", () => {
    const r = race([t("A", 0, 40), t("B", 10, 25)], "lock");
    expect(r.winners).toEqual(["B"]);
  });

  it("without the lock, overlapping requests both think they won and the ride is double-booked", () => {
    const r = race([t("A", 0, 30), t("B", 10, 40)], "naive");
    expect(r.winners).toEqual(["A", "B"]);
    expect(r.doubleBooked).toBe(true);
    expect(r.finalDriver).toBe("B"); // the last write silently overwrote A
  });

  it("without the lock, requests that do not overlap are still fine (why the bug hides in testing)", () => {
    const r = race([t("A", 0, 10), t("B", 20, 30)], "naive");
    expect(r.winners).toEqual(["A"]);
    expect(r.doubleBooked).toBe(false);
  });

  it("logs every step in time order, with the query each driver sent", () => {
    const r = race([t("A", 0, 30), t("B", 10, 20)], "lock");
    expect(r.log.map((e) => e.at)).toEqual([...r.log.map((e) => e.at)].sort((a, b) => a - b));
    expect(r.log.filter((e) => e.kind === "write").map((e) => e.text)).toEqual([
      expect.stringMatching(/updateMany.*status: 'REQUESTED'.*count: 1/),
      expect.stringMatching(/count: 0/),
    ]);
  });

  it("random timings always overlap, so the lock is what makes the difference", () => {
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 200; i++) {
      const timings = randomTimings(rnd);
      expect(race(timings, "naive").doubleBooked).toBe(true);
      expect(race(timings, "lock").winners).toHaveLength(1);
      for (const x of timings) expect(x.writeAt).toBeGreaterThan(x.readAt);
    }
  });

  it("refuses timings that make no sense", () => {
    expect(() => race([t("A", 10, 5), t("B", 0, 1)], "lock")).toThrow();
    expect(() => race([t("A", 0, 5)], "lock")).toThrow();
    expect(() => race([t("A", 0, 5), t("A", 1, 6)], "lock")).toThrow();
  });
});
