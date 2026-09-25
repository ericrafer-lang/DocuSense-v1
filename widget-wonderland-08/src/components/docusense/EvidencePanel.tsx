import type { LayerKey, Scan } from "@/data/scans";

export function EvidencePanel({
  scan,
  activeLayer,
  onLayer,
  revealKey,
}: {
  scan: Scan;
  activeLayer: LayerKey | null;
  onLayer: (key: LayerKey | null) => void;
  revealKey: string;
}) {
  const dash = 327;

  return (
    <div className="rounded-[18px] bg-paper/4 p-7 ring-1 ring-paper/12">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/45">
            Overall read
          </p>
          {scan.isSample && (
            <span className="rounded-full bg-signal/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-signal ring-1 ring-signal/30">
              Sample
            </span>
          )}
        </div>
        <span className="rounded-full bg-signal/12 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-signal ring-1 ring-signal/30">
          signal · not a verdict
        </span>
      </div>

      <div className="mt-5 flex items-center gap-6">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="oklch(0.28 0.008 265)" strokeWidth="12" />
            <circle
              key={revealKey}
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--signal)"
              strokeWidth="12"
              strokeLinecap="round"
              className="ds-rc"
              style={{ strokeDashoffset: dash * (1 - scan.overall) }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="font-display text-3xl font-medium leading-none text-paper">
                {scan.overall.toFixed(2)}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/45">
                overall
              </p>
            </div>
          </div>
        </div>
        <p className="max-w-[34ch] text-sm leading-relaxed text-pretty text-paper/60">
          {scan.summary}
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {scan.layers.map((layer, i) => {
          const active = activeLayer === layer.key;
          return (
            <button
              key={`${revealKey}-${layer.key}`}
              type="button"
              onClick={() => onLayer(active ? null : layer.key)}
              aria-pressed={active}
              className={`ds-lay block w-full rounded-[10px] px-3 py-3 text-left transition-colors ${
                active ? "bg-signal/10 ring-1 ring-signal/30" : "hover:bg-paper/5"
              }`}
              style={{ animationDelay: `${0.1 + i * 0.18}s` }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/70">
                  {layer.index} · {layer.name}
                </p>
                <span className="font-mono text-sm text-signal">
                  {layer.score.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper/10">
                <div
                  className="ds-bd h-full rounded-full bg-signal"
                  style={{
                    width: `${Math.round(layer.score * 100)}%`,
                    animationDelay: `${0.15 + i * 0.18}s`,
                  }}
                />
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-pretty text-paper/50">
                {layer.note}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-signal/70">
                {active ? "showing passages ↓" : "isolate this layer"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
