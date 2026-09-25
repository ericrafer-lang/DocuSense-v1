import type { AuthUser } from "./auth";

// Set VITE_API_URL in a .env file at the project root if your API runs on a
// different port. Falls back to the default ASP.NET Core dev port.
const API_BASE_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:5230";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed (${res.status})`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRoleInput;
}) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<AuthUser>(res);
}

export async function loginUser(input: { email: string; password: string }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<AuthUser>(res);
}

// Matches DocuSense.Shared.UserRole's string names exactly
export type UserRoleInput = "Student" | "Educator" | "Admin";

export type LayerScoreDto = { layerType: string; score: number };
export type HighlightedSectionDto = {
  sectionText: string;
  sectionScore: number;
  position: number;
};
export type DetectionResultDto = {
  documentId: number;
  overallScore: number;
  status: string;
  layerScores: LayerScoreDto[];
  highlightedSections: HighlightedSectionDto[];
  document?: { filename: string; extractedText?: string | null };
};

// Shape returned by POST /api/scan on our .NET backend
type ScanResultDto = {
  id: string;
  title: string;
  author: string;
  words: number;
  draft: string;
  date: string;
  overall: number; // 0–1
  flagged: number;
  summary: string;
  layers: Array<{ key: string; index: string; name: string; score: number; note: string }>;
  passages: Array<{ id: string; text: string; layer?: string; reason?: string }>;
};

/**
 * Upload a file to the .NET backend (/api/scan).
 * The result is stored in-memory on the window object so getResult() can
 * retrieve it immediately without a second round-trip.
 * Returns a fake { documentId } that encodes the scan id as a number hash.
 */
const _pendingScans = new Map<number, ScanResultDto>();
let _nextId = 1;

export async function uploadDocument(file: File, _uploaderId?: number, token?: string) {
  const form = new FormData();
  form.append("file", file);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/scan`, {
    method: "POST",
    headers,
    body: form,
  });

  const scan = await handle<ScanResultDto>(res);
  const documentId = _nextId++;
  _pendingScans.set(documentId, scan);

  return { documentId, resultId: documentId, overallScore: scan.overall * 100, status: "complete" };
}

/**
 * Retrieve the scan result previously stored by uploadDocument().
 * Maps the .NET ScanResult shape into the DetectionResultDto shape the
 * React components already use.
 */
export async function getResult(documentId: number, _token?: string): Promise<DetectionResultDto> {
  const scan = _pendingScans.get(documentId);
  if (!scan) throw new Error(`No scan result found for document ${documentId}`);
  _pendingScans.delete(documentId);

  return {
    documentId,
    overallScore: scan.overall * 100,
    status: scan.draft,
    layerScores: scan.layers.map((l) => ({
      layerType: l.key,
      score: l.score * 100,
    })),
    highlightedSections: scan.passages.map((p, i) => ({
      sectionText: p.text,
      sectionScore: scan.overall * 100,
      position: i,
    })),
    document: { filename: scan.title },
  };
}

export async function resetPassword(input: { email: string; newPassword: string }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<{ message: string }>(res);
}

export type AdminUserDto = {
  id: number;
  name: string;
  email: string;
  role: UserRoleInput;
  createdAt: string;
};

// Known backend gap: the API's AdminController does not actually verify the caller's role
// server-side yet — it only checks the role client-side once real auth enforcement is added on
// the backend (tracked separately). Real protection depends on that backend fix landing too.
export async function getUsers(token?: string): Promise<AdminUserDto[]> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
    headers,
  });
  return handle<AdminUserDto[]>(res);
}

export async function deleteUser(id: number, token?: string): Promise<{ message?: string } | null> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
    method: "DELETE",
    headers,
  });
  return handle<{ message?: string } | null>(res);
}

/**
 * Request password reset instructions.
 * NOTE: The backend endpoint POST /api/auth/forgot-password is not yet implemented on the
 * API side, so calling this will return 404 until the backend endpoint exists.
 */
export async function requestPasswordReset(input: { email: string }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<{ message: string }>(res);
}
