import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type UserRole = "Student" | "Educator" | "Admin";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  token?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "docusense_user";

/**
 * Unlike the Blazor Server version, this state survives page navigation AND
 * a full browser refresh, because it's a plain client-side value backed by
 * localStorage instead of a server-side circuit. This is the fix for every
 * "logged out after clicking a link" bug from the Blazor attempt.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  const login = (u: AuthUser) => {
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
