/**
 * Centralised API client for the Signal Clone FastAPI backend.
 *
 * All fetch calls go through `apiRequest` which:
 *   - Prepends the base URL
 *   - Attaches the Bearer token when available
 *   - Parses JSON responses
 *   - Throws typed ApiError on non-2xx responses
 *
 * Base URL is read from NEXT_PUBLIC_API_URL (defaults to localhost:8000
 * for local development).
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Structured error thrown by apiRequest on non-2xx responses. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Retrieve the stored JWT from localStorage (client-side only). */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("signal_token");
}

/** Persist the JWT to localStorage. */
export function setStoredToken(token: string): void {
  localStorage.setItem("signal_token", token);
}

/** Remove the JWT from localStorage (logout). */
export function removeStoredToken(): void {
  localStorage.removeItem("signal_token");
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
}

/**
 * Core fetch wrapper used by all service functions.
 *
 * @param path    - Endpoint path, e.g. "/api/auth/login"
 * @param options - Method, body, and optional token override
 */
export async function apiRequest<T>(
  path: string,
  { method = "GET", body, token }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Use explicitly passed token first, then fall back to localStorage
  const jwt = token !== undefined ? token : getStoredToken();
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail: unknown;
    try {
      const json = await res.json();
      detail = json.detail ?? json;
    } catch {
      detail = res.statusText;
    }

    const message =
      typeof detail === "string"
        ? detail
        : typeof detail === "object" && detail !== null && "msg" in detail
        ? String((detail as { msg: string }).msg)
        : `HTTP ${res.status}`;

    throw new ApiError(res.status, message, detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
