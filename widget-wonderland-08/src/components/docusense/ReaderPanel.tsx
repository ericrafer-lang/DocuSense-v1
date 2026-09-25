import { useState } from "react";
import type { LayerKey, Scan } from "@/data/scans";

export function ReaderPanel({
  scan,
  activeLayer,
}: {
  scan: Scan;
  activeLayer: LayerKey | null;
}) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="rounded-[18px] bg-paper p-7 ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-inksoft/70">
            Manuscript · reader
          </p>
          {scan.isSample && (
            <span className="rounded-full bg-signal/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink ring-1 ring-signal/40">
              Reference paper
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-inksoft/60">
          {scan.flagged} flagged
        </span>
      </div>
      <h3 className="mt-3 font-display text-2xl font-medium tracking-[-0.01em] text-balance text-ink">
        {scan.title}
      </h3>
      <p className="mt-1 font-mono text-[11px] text-inksoft/70">
        {scan.author} · {scan.draft} · {scan.date} · {scan.words.toLocaleString()} words
      </p>

      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink/85">
        {scan.passages.map((p) => {
          if (!p.layer) return <p key={p.id}>{p.text}</p>;
          const dimmed = activeLayer !== null && activeLayer !== p.layer;
          const isOpen = open === p.id;
          return (
            <p key={p.id} className="relative">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : p.id)}
                className={`rounded-[3px] px-1 text-left ring-1 transition-colors ${
                  dimmed
                    ? "bg-signal/8 ring-signal/20 text-ink/45"
                    : "bg-signal/25 ring-signal/50 text-ink hover:bg-signal/35"
                }`}
              >
                {p.text}
              </button>
              {isOpen ? (
                <span className="mt-2 block w-fit rounded-[7px] bg-ink px-2.5 py-1.5 font-mono text-[10px] leading-snug text-paper/90 shadow-lg">
                  {p.reason}
                </span>
              ) : null}
            </p>
          );
        })}
      </div>

      <p className="mt-6 border-t border-ink/10 pt-4 font-mono text-[10px] leading-relaxed text-inksoft/70">
        Click a highlight to read why it was flagged. Highlights dim when a single
        layer is isolated.
      </p>
    </div>
  );
}
