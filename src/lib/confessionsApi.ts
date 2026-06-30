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
  /** Number of times this confession has been witnessed. */
  witnessCount?: number;
  /** Only returned by GET /api/mine — true if the confession has been
   *  archived off its wall (wall-cap eviction). */
  isArchived?: boolean;
  /** True if the confession has been auto-hidden after 3 reports. */
  isHidden?: boolean;
  /** True if crisis/self-harm language was detected (admin-only, but
   *  returned so the deep-link page can show a supportive notice). */
  isFlagged?: boolean;
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
  requestedWallIdx: number;
  actualWallIdx: number;
  wallCount: number;
  wallCap: number;
  /** True if the confession was spawned on a different wall than requested
   *  (because the requested wall was full). */
  spawnedNewWall: boolean;
  /** List of PII types that were stripped from the text (e.g. ["email", "phone"]). */
  strippedPII?: string[];
  /** True if crisis/self-harm language was detected. Triggers the crisis overlay. */
  isFlagged?: boolean;
};

export type WallStats = {
  totalWalls: number;
  totalConfessions: number;
  wallCap: number;
};

export type WitnessResponse = {
  witnessed: boolean;
  witnessCount: number;
};

export type ReportResponse = {
  reported: boolean;
  reportCount: number;
  isHidden: boolean;
  reason: string;
  message?: string;
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
 * Fetch summary stats about all walls (total wall count, total confessions).
 * Returns null on error.
 */
export async function getWallStats(): Promise<WallStats | null> {
  try {
    const res = await fetch(`${API_URL}/walls/stats`, {
      headers: { Accept: "application/json" },
    });
    return await handle<WallStats>(res);
  } catch (err) {
    console.warn("[confessionsApi] getWallStats failed:", err);
    return null;
  }
}

/**
 * Fetch a single confession by ID. Used by the deep-link page (#/c/<id>)
 * so shared confession links load directly. Returns null on error or 404.
 */
export async function getConfessionById(id: string): Promise<Confession | null> {
  try {
    const res = await fetch(`${API_URL}/confessions/${id}`, {
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) return null;
    const data = await handle<{ confession: Confession }>(res);
    return data.confession;
  } catch (err) {
    console.warn("[confessionsApi] getConfessionById failed:", err);
    return null;
  }
}

/**
 * Fetch the "Confession of the Day" — most-witnessed from last 24h.
 * Returns null if the DB is empty.
 */
export async function getFeaturedConfession(): Promise<Confession | null> {
  try {
    const res = await fetch(`${API_URL}/confessions/featured`, {
      headers: { Accept: "application/json" },
    });
    const data = await handle<{ confession: Confession | null }>(res);
    return data.confession;
  } catch (err) {
    console.warn("[confessionsApi] getFeaturedConfession failed:", err);
    return null;
  }
}

/**
 * Witness a confession. Sends the browser's sessionId for dedup (one
 * witness per browser session per confession). Returns the new count.
 *
 * The caller should track locally whether they've already witnessed (via
 * localStorage) to avoid unnecessary API calls + enable optimistic UI.
 */
export async function witnessConfession(
  id: string,
  sessionId: string
): Promise<WitnessResponse> {
  const res = await fetch(`${API_URL}/confessions/${id}/witness`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  return handle<WitnessResponse>(res);
}

/**
 * Report a confession. After 3 reports from distinct sessions, the
 * confession is auto-hidden. Dedup: one report per sessionId.
 */
export async function reportConfession(
  id: string,
  sessionId: string,
  reason: "spam" | "hate" | "self-harm" | "doxxing" | "other"
): Promise<ReportResponse> {
  const res = await fetch(`${API_URL}/confessions/${id}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sessionId, reason }),
  });
  return handle<ReportResponse>(res);
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
