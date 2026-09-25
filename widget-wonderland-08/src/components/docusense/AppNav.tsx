import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function AppNav() {
  const { user, logout } = useAuth();

  return (
    <header className="grain border-b border-paper/10 bg-table">
      <div className="mx-auto max-w-6xl px-6 py-5 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <span className="grid size-7 place-items-center rounded-xl bg-signal/15 font-mono text-[13px] font-medium text-signal ring-1 ring-signal/40">
                D
              </span>
              <span className="font-display text-lg text-paper">DocuSense</span>
            </Link>
            <span className="ml-1 rounded-full bg-paper/8 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/50 ring-1 ring-paper/10">
              integrity lab
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-5 font-mono text-[11px] uppercase tracking-[0.16em] text-paper/45 sm:gap-7">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              className="transition-colors hover:text-signal [&.active]:text-signal"
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              className="transition-colors hover:text-signal [&.active]:text-signal"
            >
              Dashboard
            </Link>
            {user?.role === "Admin" && (
              <Link
                to="/admin"
                className="text-signal transition-colors hover:underline [&.active]:underline"
              >
                Admin
              </Link>
            )}
            {user && (
              <span className="text-paper/70">
                {user.name} · {user.role}
              </span>
            )}
            {user && (
              <button
                type="button"
                onClick={logout}
                className="cursor-pointer transition-colors hover:text-signal"
              >
                Log out
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
