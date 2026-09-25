import { SCANS, TREND, type Scan } from "@/data/scans";

export function Dashboard({
  selected,
  onSelect,
  scans = SCANS,
}: {
  selected?: Scan;
  onSelect: (scan: Scan) => void;
  scans?: Scan[];
}) {
  const avg = scans.length > 0 ? scans.reduce((s, x) => s + x.overall, 0) / scans.length : 0;
  const flagged = scans.reduce((s, x) => s + x.flagged, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/40">
        Recent activity
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="grid grid-cols-3 gap-4 lg:col-span-5">
          <div className="rounded-2xl bg-paper/4 p-4 ring-1 ring-paper/10">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">
              Papers this month
            </p>
            <p className="mt-2 font-display text-3xl font-medium leading-none text-paper">
              {scans.length}
            </p>
          </div>
          <div className="rounded-2xl bg-paper/4 p-4 ring-1 ring-paper/10">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">
              Flagged passages
            </p>
            <p className="mt-2 font-display text-3xl font-medium leading-none text-signal">
              {flagged}
            </p>
          </div>
          <div className="rounded-2xl bg-paper/4 p-4 ring-1 ring-paper/10">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">
              Avg. overall
            </p>
            <p className="mt-2 font-display text-3xl font-medium leading-none text-paper">
              {avg.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-paper/4 p-6 ring-1 ring-paper/12 lg:col-span-7">
          <div className="flex items-center justify-between">
            <p className="text-sm text-paper/70">Mean overall signal · last 8 weeks</p>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper/35">
              linear scale
            </span>
          </div>
          <div className="mt-5 flex h-32 items-end gap-2 sm:gap-3">
            {TREND.map((t, i) => (
              <div key={t.label} className="group flex flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className={`ds-cb w-full rounded-t-[3px] ${
                      i === TREND.length - 1 ? "bg-signal" : "bg-signal/55"
                    } group-hover:bg-signal`}
                    style={{ height: `${t.value * 100}%`, animationDelay: `${0.1 + i * 0.08}s` }}
                  />
                  <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-[6px] bg-ink px-2 py-1 font-mono text-[10px] text-paper/90 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {t.value.toFixed(2)}
                  </span>
                </div>
                <span
                  className={`font-mono text-[9px] ${
                    i === TREND.length - 1 ? "text-signal" : "text-paper/30"
                  }`}
                >
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl ring-1 ring-paper/10">
        <div className="grid grid-cols-12 gap-4 border-b border-paper/10 bg-paper/4 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">
          <span className="col-span-5">Paper</span>
          <span className="col-span-2">Author</span>
          <span className="col-span-3">Overall</span>
          <span className="col-span-2 text-right">Flagged</span>
        </div>
        <div className="divide-y divide-paper/8">
          {scans.map((scan) => (
            <button
              key={scan.id}
              type="button"
              onClick={() => onSelect(scan)}
              className={`grid w-full grid-cols-12 items-center gap-4 px-5 py-4 text-left transition-colors ${
                selected?.id === scan.id ? "bg-signal/8" : "hover:bg-paper/5"
              }`}
            >
              <span className="col-span-5 flex items-center gap-2 pr-2">
                <span className="truncate text-sm text-paper/80">{scan.title}</span>
                {scan.isSample && (
                  <span className="shrink-0 rounded-full bg-signal/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-signal ring-1 ring-signal/30">
                    Sample
                  </span>
                )}
              </span>
              <span className="col-span-2 font-mono text-[12px] text-paper/50">{scan.author}</span>
              <span className="col-span-3 flex items-center gap-2">
                <span className="h-1.5 flex-1 rounded-full bg-paper/10">
                  <span
                    className="block h-full rounded-full bg-signal"
                    style={{ width: `${scan.overall * 100}%` }}
                  />
                </span>
                <span className="font-mono text-[12px] text-signal">{scan.overall.toFixed(2)}</span>
              </span>
              <span className="col-span-2 text-right font-mono text-[12px] text-paper/60">
                {scan.flagged} passages
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
