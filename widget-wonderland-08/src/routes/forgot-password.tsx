import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/docusense-api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "DocuSense — Reset Password" },
      { name: "description", content: "Request password reset instructions for your DocuSense account." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await requestPasswordReset({ email });
      setSubmitted(true);
    } catch (err) {
      // NOTE: Since the backend endpoint POST /api/auth/forgot-password might not be deployed yet,
      // handle 404 gracefully with an informative message while still noting delivery attempt.
      const msg = err instanceof Error ? err.message : "Request failed";
      if (msg.includes("404")) {
        setError(
          "Password reset endpoint is not yet active on the server. Please contact your administrator.",
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-tabledeep px-6">
      <div className="w-full max-w-sm rounded-3xl bg-paper/5 p-8 ring-1 ring-paper/12">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-lg bg-signal/15 font-mono text-[11px] font-medium text-signal ring-1 ring-signal/40">
            D
          </span>
          <span className="font-display text-base text-paper">DocuSense</span>
        </div>

        <h1 className="mt-5 font-display text-2xl text-paper">Reset Password</h1>
        <p className="mt-2 text-sm leading-relaxed text-paper/60">
          Enter your account email to receive password reset instructions.
        </p>

        {submitted ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-signal/30 bg-signal/10 p-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-signal">
                Instructions Sent
              </p>
              <p className="mt-1 text-sm text-paper/80">
                If an account with <strong className="text-paper">{email}</strong> exists,
                instructions have been dispatched.
              </p>
            </div>
            <Link
              to="/login"
              className="block w-full rounded-xl bg-signal py-2 text-center text-sm font-medium text-tabledeep transition-opacity hover:opacity-90"
            >
              Back to Log In
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/50">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="mt-1 w-full rounded-xl border border-paper/20 bg-tabledeep px-3 py-2 text-paper focus:outline-none focus:ring-2 focus:ring-signal"
              />
            </div>

            {error ? <p className="text-sm leading-snug text-red-400">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-xl bg-signal px-4 py-2 font-medium text-tabledeep transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Sending instructions…" : "Send Reset Link"}
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="font-mono text-[11px] uppercase tracking-wider text-paper/50 transition-colors hover:text-signal"
              >
                ← Back to Log In
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
