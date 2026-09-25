import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/docusense/AppNav";
import { Dashboard } from "@/components/docusense/Dashboard";
import { SCANS, type Scan } from "@/data/scans";
import { useAuth } from "@/lib/auth";
import { loadHistory } from "@/lib/scan-history";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "DocuSense — Scan History & Activity Dashboard" },
      {
        name: "description",
        content: "View previous scan records, overall score distributions, and flagged activity.",
      },
    ],
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<Scan[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

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

  const allScans = [...history, ...SCANS];

  return (
    <main className="min-h-screen bg-tabledeep font-sans text-paper/80 antialiased">
      <AppNav />

      <section className="bg-table">
        <Dashboard
          scans={allScans}
          onSelect={(scan) => navigate({ to: "/scan/$id", params: { id: scan.id } })}
        />
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
