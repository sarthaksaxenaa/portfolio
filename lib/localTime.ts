/** Whether `tz` is an IANA time zone the runtime knows (e.g. "Asia/Kolkata"). */
export function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "7:52 PM" in the given zone. Newer ICU puts a narrow no-break space before AM/PM; normalised. */
export function localTime(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone })
    .format(at)
    .replace(/\s/g, " ");
}

/** The zone's short name as people there write it ("IST" for Asia/Kolkata), at a given moment
 *  (zones with summer time change name). Takes the moment rather than reading the clock, so it is
 *  safe to call while a page is prerendered. */
export function timeZoneLabel(timeZone: string, at: Date = new Date(0)): string {
  const part = new Intl.DateTimeFormat("en-IN", { timeZone, timeZoneName: "short" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}

/** Milliseconds until the clock next shows a new minute. */
export const msToNextMinute = (now = Date.now()) => 60_000 - (now % 60_000);
