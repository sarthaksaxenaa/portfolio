/**
 * Two drivers accept the same ride. Models RideShare's trip:accept handler
 * (server/src/socket/tripHandlers.ts) and the bug it exists to prevent.
 *
 *  lock:  one atomic `updateMany WHERE id AND status = 'REQUESTED'`. The database applies writes
 *         one at a time, so the second finds the trip already MATCHED and changes 0 rows.
 *  naive: read the trip, then write the driver if it looked free. When the two requests overlap,
 *         both read REQUESTED before either writes, both are told they got the ride, and the last
 *         write silently replaces the first: a double booking.
 */

export type Driver = "A" | "B";
export type Mode = "lock" | "naive";
/** Milliseconds after "both accept": when the request reads the trip, and when its write lands. */
export type Timing = { driver: Driver; readAt: number; writeAt: number };
export type LogEntry = { at: number; driver: Driver; kind: "read" | "write"; text: string };
export type DriverResult = { driver: Driver; rows: 0 | 1; outcome: "assigned" | "taken" };
export type RaceResult = {
  results: DriverResult[];
  winners: Driver[];
  finalDriver: Driver | null;
  doubleBooked: boolean;
  log: LogEntry[];
};

export const TRIP_ID = 482;

export function race(timings: Timing[], mode: Mode): RaceResult {
  if (timings.length !== 2 || timings[0].driver === timings[1].driver) throw new Error("A race needs drivers A and B");
  for (const t of timings) if (!(t.writeAt > t.readAt && t.readAt >= 0)) throw new Error("A write lands after its read");

  // Writes land one at a time; on a dead heat the database still picks an order (here, A first).
  const writes = [...timings].sort((a, b) => a.writeAt - b.writeAt || a.driver.localeCompare(b.driver));
  let status: "REQUESTED" | "MATCHED" = "REQUESTED";
  let driverId: Driver | null = null;
  const log: LogEntry[] = [];
  const results: DriverResult[] = [];

  if (mode === "naive") {
    const sawFree = new Map<Driver, boolean>();
    for (const t of timings) {
      const firstWrite = writes[0];
      const free = !(firstWrite.driver !== t.driver && firstWrite.writeAt <= t.readAt);
      sawFree.set(t.driver, free);
      log.push({ at: t.readAt, driver: t.driver, kind: "read", text: `trip.findUnique({ id: ${TRIP_ID} })  → ${free ? "REQUESTED" : "MATCHED"}` });
    }
    for (const t of writes) {
      if (!sawFree.get(t.driver)) {
        results.push({ driver: t.driver, rows: 0, outcome: "taken" });
        continue;
      }
      status = "MATCHED";
      driverId = t.driver;
      results.push({ driver: t.driver, rows: 1, outcome: "assigned" });
      log.push({ at: t.writeAt, driver: t.driver, kind: "write", text: `trip.update({ driverId: '${t.driver}' })  → saved` });
    }
  } else {
    for (const t of writes) {
      const claimed = status === "REQUESTED";
      if (claimed) {
        status = "MATCHED";
        driverId = t.driver;
      }
      results.push({ driver: t.driver, rows: claimed ? 1 : 0, outcome: claimed ? "assigned" : "taken" });
      log.push({
        at: t.writeAt,
        driver: t.driver,
        kind: "write",
        text: `trip.updateMany({ id: ${TRIP_ID}, status: 'REQUESTED' })  → count: ${claimed ? 1 : 0}`,
      });
    }
  }

  log.sort((a, b) => a.at - b.at);
  results.sort((a, b) => a.driver.localeCompare(b.driver));
  const winners = results.filter((r) => r.outcome === "assigned").map((r) => r.driver);
  return { results, winners, finalDriver: driverId, doubleBooked: winners.length > 1, log };
}

/** Network jitter for one tap of "both accept": the two requests always overlap, as they do when
 *  two phones tap within a few milliseconds of each other. */
export function randomTimings(random: () => number = Math.random): Timing[] {
  const a = 40 + random() * 260;
  const b = 40 + random() * 260;
  const readA = 30 + random() * 40;
  const readB = 30 + random() * 40;
  const lastRead = Math.max(readA, readB);
  // Each write lands after both reads, so without the lock both drivers see the trip as free.
  return [
    { driver: "A", readAt: readA, writeAt: lastRead + a },
    { driver: "B", readAt: readB, writeAt: lastRead + b + (Math.abs(a - b) < 1 ? 5 : 0) },
  ];
}
