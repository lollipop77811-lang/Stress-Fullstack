// Tiny API client for talking to the Stress-backend Express server.
// All functions return typed data and throw on non-2xx responses.

export type ConfessionColor =
  | "yellow"
  | "pink"
  | "blue"
  | "green"
  | "orange"
  | "purple";

export type ConfessionAging =
  | "fresh"
  | "faded"
  | "torn"
  | "crumpled"
  | "old";

export type Confession = {
  id: string;
  text: string;
  author: string;
  color: ConfessionColor;
  aging: ConfessionAging;
  wallIdx: number;
  createdAt: string;
  /** Only returned by GET /api/mine — true if the confession has been
   *  archived off its wall (wall-cap eviction). */
  isArchived?: boolean;
};

export type NewConfession = {
  text: string;
  author?: string;
  color: ConfessionColor;
  aging: ConfessionAging;
  wallIdx: number;
};

export type CreateResponse = {
  confession: Confession;
  archivedOldest: { id: string } | null;
  wallCount: number;
  wallCap: number;
};

/**
 * API base URL.
 *
 * - In DEV: relative "/api" — Vite proxies it to the backend at
 *   http://localhost:5000 (see vite.config.ts → server.proxy). Override
 *   with VITE_BACKEND_URL if your backend runs on a different port.
 * - In PROD: relative "/api" — assumes the backend is served from the
 *   same origin (recommended), OR set VITE_API_URL to an absolute URL
 *   if the backend lives on a different host.
 */
const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      try {
        body = await res.text();
      } catch {
        /* ignore */
      }
    }
    const msg =
      (body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`) || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, body);
  }
  return (await res.json()) as T;
}

/**
 * Fetch all non-archived user confessions for a wall (newest first).
 * Returns empty array on error so the wall still renders with seed data.
 */
export async function listConfessions(wallIdx: number): Promise<Confession[]> {
  try {
    const res = await fetch(`${API_URL}/walls/${wallIdx}/confessions`, {
      headers: { Accept: "application/json" },
    });
    const data = await handle<{ confessions: Confession[] }>(res);
    return data.confessions;
  } catch (err) {
    console.warn("[confessionsApi] listConfessions failed:", err);
    return [];
  }
}

/**
 * Fetch the user's own confessions by ID.
 *
 * The IDs come from localStorage (osk.confessions.mine.v1) — the server
 * doesn't track ownership, only the client does. Returns confessions
 * regardless of wallIdx or archived state, newest first.
 *
 * Returns empty array on error so the page renders gracefully.
 */
export async function listMyConfessions(ids: string[]): Promise<Confession[]> {
  if (ids.length === 0) return [];
  try {
    const url = `${API_URL}/mine?ids=${encodeURIComponent(ids.join(","))}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    const data = await handle<{ confessions: Confession[] }>(res);
    return data.confessions;
  } catch (err) {
    console.warn("[confessionsApi] listMyConfessions failed:", err);
    return [];
  }
}

/**
 * Create a new confession. Throws on error (caller should handle).
 */
export async function createConfession(
  payload: NewConfession
): Promise<CreateResponse> {
  const res = await fetch(`${API_URL}/confessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<CreateResponse>(res);
}

/**
 * Health check — returns true if the backend is reachable.
 */
export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export { API_URL };
