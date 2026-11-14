import type { Stat } from "@/content/schema";

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** One line saying where a number came from. Every stat on the site has one. */
export function provenance(stat: Stat): string {
  switch (stat.kind) {
    case "measured":
      return `Measured · ${stat.source} · ${fmt.format(new Date(`${stat.measuredAt}T00:00:00Z`))}`;
    case "reported":
      return `Reported by ${stat.source}`;
    case "target":
      return "Target, not yet measured";
  }
}

export function StatTile({ stat }: { stat: Stat }) {
  return (
    <figure className="flex flex-col gap-2 border-t border-hairline pt-4">
      <span className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-none tracking-tight">
        {stat.value}
      </span>
      <figcaption className="flex flex-col gap-1">
        <span className="text-sm text-text">{stat.label}</span>
        <span className="font-mono text-[11px] text-muted" data-kind={stat.kind}>
          {provenance(stat)}
        </span>
      </figcaption>
    </figure>
  );
}
