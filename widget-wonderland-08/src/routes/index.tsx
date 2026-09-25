import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/docusense/AppNav";
import { UploadPanel } from "@/components/docusense/UploadPanel";
import { useAuth } from "@/lib/auth";
import { uploadDocument, getResult } from "@/lib/docusense-api";
import { addScanToHistory, mapResultToScan } from "@/lib/scan-history";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DocuSense — Explainable AI-Content Detection for Academic Work" },
      {
        name: "description",
        content:
          "DocuSense scores academic documents across four transparent layers — stylometric, semantic, metadata and classifier — and shows exactly where the signals sit.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !user) {
      navigate({ to: "/login" });
    }
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-tabledeep">
        <p className="font-mono text-xs uppercase tracking-widest text-paper/50">Loading…</p>
      </main>
    );
  }

  const onFile = async (file: File) => {
    if (analyzing) return;
    setError(null);
    setFileName(file.name);
    setAnalyzing(true);
    setProgress(15);

    try {
      const uploadResult = await uploadDocument(file, user.id, user.token);
      setProgress(70);
      const result = await getResult(uploadResult.documentId, user.token);
      setProgress(100);

      const newScan = mapResultToScan(result, file.name.replace(/\.[^.]+$/, ""), user.name);
      addScanToHistory(newScan);
      navigate({ to: "/scan/$id", params: { id: newScan.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-tabledeep font-sans text-paper/80 antialiased">
      <AppNav />

      <section className="grain overflow-hidden bg-table">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_15%_-10%,color-mix(in_oklab,var(--signal)_22%,transparent),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_95%_110%,color-mix(in_oklab,var(--signal)_12%,transparent),transparent_60%)]" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
                Academic integrity · decision support
              </p>
              <h1 className="mt-5 max-w-[18ch] font-display text-[clamp(2.6rem,6vw,5rem)] font-medium leading-[0.96] tracking-[-0.02em] text-balance text-paper">
                Read a document the way evidence is read — layer by layer.
              </h1>
              <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-pretty text-paper/65">
                DocuSense scores a paper across four transparent layers and shows you exactly where
                the signals sit. It is a tool for judgement, not a verdict — the decision stays with
                you.
              </p>
            </div>

            <div className="lg:col-span-5">
              <UploadPanel
                onFile={onFile}
                analyzing={analyzing}
                progress={progress}
                fileName={fileName}
              />
              {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
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
