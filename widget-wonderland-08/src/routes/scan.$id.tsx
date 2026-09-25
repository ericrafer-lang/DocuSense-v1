import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/docusense/AppNav";
import { ReaderPanel } from "@/components/docusense/ReaderPanel";
import { EvidencePanel } from "@/components/docusense/EvidencePanel";
import { type LayerKey, type Scan } from "@/data/scans";
import { useAuth } from "@/lib/auth";
import { getScanById } from "@/lib/scan-history";

export const Route = createFileRoute("/scan/$id")({
  head: () => ({
    meta: [
      { title: "DocuSense — Scan Detail & Layer Analysis" },
      {
        name: "description",
        content: "Layer-by-layer forensic analysis of document authenticity and integrity.",
      },
    ],
  }),
  component: ScanDetailRoute,
});

function ScanDetailRoute() {
  const { id } = Route.useParams();
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState<LayerKey | null>(null);
  const [revealKey, setRevealKey] = useState(`scan-${id}`);

  useEffect(() => {
    if (ready && !user) {
      navigate({ to: "/login" });
      return;
    }

    if (ready && user) {
      const found = getScanById(id);
      setScan(found ?? null);
      setRevealKey(`${id}-${Date.now()}`);
      setLoading(false);
    }
  }, [id, ready, user, navigate]);

  if (!ready || loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-tabledeep">
        <p className="font-mono text-xs uppercase tracking-widest text-paper/50">Loading…</p>
      </main>
    );
  }

  if (!scan) {
    return (
      <main className="min-h-screen bg-tabledeep font-sans text-paper/80 antialiased">
        <AppNav />

        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
          <div className="w-full rounded-3xl bg-paper/5 p-8 ring-1 ring-paper/10">
            <span className="rounded-full bg-signal/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-signal ring-1 ring-signal/30">
              Scan not found
            </span>
            <h1 className="mt-4 font-display text-2xl font-medium text-paper">
              Document could not be located
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-paper/60">
              No scan record was found with ID <code className="font-mono text-signal">{id}</code>.
              It may have expired, been cleared from browser storage, or never existed.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/dashboard"
                className="rounded-xl bg-signal px-4 py-2 font-mono text-xs uppercase tracking-wider text-tabledeep transition-opacity hover:opacity-90"
              >
                Scan Library
              </Link>
              <Link
                to="/"
                className="rounded-xl bg-paper/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-paper transition-colors hover:bg-paper/20"
              >
                Upload New Document
              </Link>
            </div>
          </div>
        </div>

        <footer id="guidance" className="bg-tabledeep">
          <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
            <div className="border-t border-paper/10 pt-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="font-display text-base text-paper/70">
                  DocuSense — a forensic reading instrument
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/30">
                  Ref. DS-2025 · build 04.19
                </span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-tabledeep font-sans text-paper/80 antialiased">
      <AppNav />

      <section id="result" className="scroll-mt-6 bg-tabledeep">
        <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-signal hover:underline"
                >
                  ← Back to Dashboard
                </Link>
              </div>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/40">
                Scan result
              </p>
              <h1 className="mt-2 max-w-[30ch] font-display text-3xl font-medium leading-tight tracking-[-0.01em] text-balance text-paper">
                Evidence, layer by layer
              </h1>
            </div>
            <div className="rounded-[10px] bg-paper/5 px-3 py-2 ring-1 ring-paper/10">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">
                  Paper
                </p>
                {scan.isSample && (
                  <span className="rounded-full bg-signal/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-signal ring-1 ring-signal/30">
                    Reference paper
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-paper/80">
                {scan.title} · {scan.words.toLocaleString()} words
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <ReaderPanel scan={scan} activeLayer={activeLayer} />
            </div>
            <div className="lg:col-span-7">
              <EvidencePanel
                scan={scan}
                activeLayer={activeLayer}
                onLayer={setActiveLayer}
                revealKey={revealKey}
              />
            </div>
          </div>
        </div>
      </section>

      <footer id="guidance" className="bg-tabledeep">
        <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
          <div className="border-t border-paper/10 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="font-display text-base text-paper/70">
                DocuSense — a forensic reading instrument
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/30">
                Ref. DS-2025 · build 04.19
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
