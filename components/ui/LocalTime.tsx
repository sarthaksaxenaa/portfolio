"use client";

import { useSyncExternalStore } from "react";
import { localTime, msToNextMinute, timeZoneLabel } from "@/lib/localTime";

/** Calls back once per minute, on the minute, so the clock never shows a stale time for long. */
function subscribe(onMinute: () => void) {
  let timer = setTimeout(function tick() {
    onMinute();
    timer = setTimeout(tick, msToNextMinute());
  }, msToNextMinute());
  return () => clearTimeout(timer);
}
const currentMinute = () => Math.floor(Date.now() / 60_000);
const noMinuteOnServer = () => null;

/** The time where Sarthak is. The server renders a placeholder (it cannot know when the page is
 *  read); the browser shows the real time and moves it on each minute. */
export function LocalTime({ timeZone }: { timeZone: string }) {
  const minute = useSyncExternalStore(subscribe, currentMinute, noMinuteOnServer);
  const at = minute === null ? null : new Date(minute * 60_000);
  return (
    <span data-testid="local-time">
      {at ? localTime(at, timeZone) : "—"} {timeZoneLabel(timeZone, at ?? undefined)}
    </span>
  );
}
