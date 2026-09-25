import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { registerUser, type UserRoleInput } from "@/lib/docusense-api";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRoleInput>("Student");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerUser({ name, email, password, role });
      navigate({ to: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-tabledeep px-6">
      <div className="w-full max-w-sm rounded-3xl bg-paper/5 p-8 ring-1 ring-paper/12">
        <h1 className="font-display text-2xl text-paper">Create an Account</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/50">
              Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-paper/20 bg-tabledeep px-3 py-2 text-paper focus:outline-none focus:ring-2 focus:ring-signal"
            />
          </div>
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
            <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/50">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-paper/20 bg-tabledeep px-3 py-2 text-paper focus:outline-none focus:ring-2 focus:ring-signal"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/50">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRoleInput)}
              className="mt-1 w-full rounded-xl border border-paper/20 bg-tabledeep px-3 py-2 text-paper focus:outline-none focus:ring-2 focus:ring-signal"
            >
              <option value="Student">Student</option>
              <option value="Educator">Educator</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-signal px-4 py-2 font-medium text-tabledeep transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Register"}
          </button>
        </form>
        <p className="mt-4 text-sm text-paper/50">
          Already have an account?{" "}
          <Link to="/login" className="text-signal hover:underline">
            Log in
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
