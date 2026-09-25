import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { loginUser } from "@/lib/docusense-api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await loginUser({ email, password });
      login(user);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-tabledeep px-6">
      <div className="w-full max-w-sm rounded-3xl bg-paper/5 p-8 ring-1 ring-paper/12">
        <h1 className="font-display text-2xl text-paper">Log In</h1>
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
              className="mt-1 w-full rounded-xl border border-paper/20 bg-tabledeep px-3 py-2 text-paper focus:outline-none focus:ring-2 focus:ring-signal"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/50">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="font-mono text-[11px] text-signal/80 transition-colors hover:text-signal hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-paper/20 bg-tabledeep px-3 py-2 text-paper focus:outline-none focus:ring-2 focus:ring-signal"
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-signal px-4 py-2 font-medium text-tabledeep transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>
        <p className="mt-4 text-sm text-paper/50">
          No account?{" "}
          <Link to="/register" className="text-signal hover:underline">
            Register here
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
