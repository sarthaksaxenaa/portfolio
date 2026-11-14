import { chapterById } from "@/content/chapters";
import { SectionHeader } from "@/components/ui/SectionHeader";

const next = [
  { title: "System design", body: "Going from features that work to systems that hold up: queues, caching, failure modes." },
  { title: "Distributed systems", body: "Consistency, idempotency and the races I used to find in production instead of on paper." },
  { title: "RideShare's test suite", body: "CareNexus proved what measured feels like. RideShare is next." },
];

export function Overload() {
  const chapter = chapterById("overload");
  return (
    <section id="overload" aria-labelledby="overload-heading" className="px-6 py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <SectionHeader chapter={chapter} id="overload-heading" />
        <p className="max-w-2xl text-lg text-muted">
          Progressive overload: add a little weight every session, or stop growing. Graduating in
          2027. Here is what is going on the bar next.
        </p>
        <ol className="grid gap-6 md:grid-cols-3">
          {next.map((n, i) => (
            <li key={n.title} data-reveal className="flex flex-col gap-3 border-t border-hairline pt-5">
              <span className="font-mono text-xs text-muted">+{(i + 1) * 2.5} kg</span>
              <h3 className="text-xl font-semibold">{n.title}</h3>
              <p className="text-muted">{n.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
