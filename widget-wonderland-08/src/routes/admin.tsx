import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/docusense/AppNav";
import { useAuth } from "@/lib/auth";
import { getUsers, deleteUser, type AdminUserDto } from "@/lib/docusense-api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "DocuSense — Admin Portal" },
      { name: "description", content: "Manage DocuSense users and access roles." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUserDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (ready && !user) {
      navigate({ to: "/login" });
    }
  }, [ready, user, navigate]);

  const fetchUsers = async () => {
    if (!user || user.role !== "Admin") return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers(user.token);
      setUsers(data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch user list. Ensure the API server is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && user?.role === "Admin") {
      fetchUsers();
    }
  }, [ready, user]);

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-tabledeep">
        <p className="font-mono text-xs uppercase tracking-widest text-paper/50">Loading…</p>
      </main>
    );
  }

  if (!user || user.role !== "Admin") {
    return (
      <main className="grid min-h-screen place-items-center bg-tabledeep px-6 text-center">
        <div className="w-full max-w-md rounded-3xl bg-paper/5 p-8 ring-1 ring-paper/12">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
            Access Restricted
          </p>
          <h1 className="mt-4 font-display text-2xl font-medium text-paper">Admin only</h1>
          <p className="mt-3 text-sm leading-relaxed text-paper/60">
            This area is restricted to administrators. Please log in with an administrator account to
            manage users.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/"
              className="rounded-xl bg-paper/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-paper transition-colors hover:bg-paper/20"
            >
              Back to Home
            </Link>
            <Link
              to="/login"
              className="rounded-xl bg-signal px-4 py-2 font-mono text-xs uppercase tracking-wider text-tabledeep transition-opacity hover:opacity-90"
            >
              Log in as Admin
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await deleteUser(userToDelete.id, user.token);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove user.");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <main className="min-h-screen bg-tabledeep font-sans text-paper/80 antialiased">
      <AppNav />

      {/* Main Content */}
      <section className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
              Management Console
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium text-paper">
              User Directory
            </h1>
            <p className="mt-1 text-sm text-paper/60">
              Manage registered accounts, review roles, and revoke access.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={loading}
              className="border-paper/20 bg-paper/5 font-mono text-xs text-paper hover:bg-paper/10"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <p className="font-medium">Notice</p>
            <p className="mt-1 text-xs text-red-300/80">{error}</p>
          </div>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-2xl border border-paper/12 bg-table/50 shadow-xl">
          {loading ? (
            <div className="py-20 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-paper/40">
                Loading users from directory…
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display text-lg text-paper">No users registered yet</p>
              <p className="mt-1 font-mono text-xs text-paper/40">
                Users will appear here once registered.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="border-b border-paper/10 bg-paper/4">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/50">
                    Name
                  </TableHead>
                  <TableHead className="py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/50">
                    Email
                  </TableHead>
                  <TableHead className="py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/50">
                    Role
                  </TableHead>
                  <TableHead className="py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/50">
                    Joined Date
                  </TableHead>
                  <TableHead className="py-3 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-paper/50">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-paper/8">
                {users.map((u) => (
                  <TableRow
                    key={u.id}
                    className="border-none transition-colors hover:bg-paper/4"
                  >
                    <TableCell className="py-4 font-medium text-paper">
                      {u.name}
                    </TableCell>
                    <TableCell className="py-4 font-mono text-xs text-paper/70">
                      {u.email}
                    </TableCell>
                    <TableCell className="py-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ring-1 ${
                          u.role === "Admin"
                            ? "bg-signal/15 text-signal ring-signal/30"
                            : u.role === "Educator"
                              ? "bg-paper/10 text-paper/90 ring-paper/20"
                              : "bg-paper/5 text-paper/60 ring-paper/10"
                        }`}
                      >
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 font-mono text-xs text-paper/50">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      {u.id === user.id ? (
                        <span className="font-mono text-[11px] text-paper/35">
                          (Current Admin)
                        </span>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setUserToDelete(u)}
                          className="h-7 cursor-pointer rounded-lg bg-red-500/20 px-3 font-mono text-[11px] uppercase tracking-wider text-red-300 ring-1 ring-red-500/40 hover:bg-red-500/30"
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      {/* Confirmation Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="border border-paper/15 bg-table text-paper sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-paper">
              Remove User
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-paper/70">
              Are you sure you want to remove{" "}
              <strong className="text-paper">{userToDelete?.name}</strong> (
              {userToDelete?.email})? This action cannot be undone and will revoke all access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setUserToDelete(null)}
              className="border-paper/20 bg-paper/5 font-mono text-xs text-paper hover:bg-paper/10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleDeleteConfirm}
              className="bg-red-600 font-mono text-xs text-white hover:bg-red-700"
            >
              {deleting ? "Removing…" : "Confirm Removal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
