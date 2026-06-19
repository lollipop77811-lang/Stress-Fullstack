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

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:5000/api";

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
