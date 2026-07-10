/**
 * Auth service — thin wrappers around the FastAPI /api/auth/* endpoints.
 *
 * All functions throw ApiError on failure so callers (AuthContext) can
 * handle errors with a single try/catch and show user-friendly messages.
 */

import { apiRequest, setStoredToken, removeStoredToken } from "./api";
import type { AuthUser } from "@/types";

// ─── Response shapes (match backend Pydantic schemas exactly) ──────────────

interface AuthResponse {
  user: AuthUser;
  access_token: string;
  token_type: string;
}

interface VerifyOTPResponse {
  verified: boolean;
}

// ─── Auth service functions ────────────────────────────────────────────────

/**
 * POST /api/auth/register
 *
 * Backend accepts: { username, password, display_name, phone_number? }
 * Returns: { user, access_token, token_type }
 */
export async function registerUser(params: {
  username: string;
  password: string;
  display_name: string;
  phone_number?: string;
}): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: params,
  });
  setStoredToken(data.access_token);
  return data;
}

/**
 * POST /api/auth/login
 *
 * Backend accepts: { username, password }
 * Returns: { user, access_token, token_type }
 */
export async function loginUser(params: {
  username: string;
  password: string;
}): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: params,
  });
  setStoredToken(data.access_token);
  return data;
}

/**
 * POST /api/auth/verify-otp
 *
 * Backend accepts: { phone_number, otp }
 * The mock backend accepts "123456" for any phone_number.
 * Returns: { verified: bool }
 */
export async function verifyOtp(params: {
  phone_number: string;
  otp: string;
}): Promise<VerifyOTPResponse> {
  return apiRequest<VerifyOTPResponse>("/api/auth/verify-otp", {
    method: "POST",
    body: params,
  });
}

/**
 * GET /api/auth/me
 *
 * Returns the current user profile. Requires a valid Bearer token.
 * Used on app start to restore the session from localStorage.
 */
export async function fetchMe(token?: string): Promise<AuthUser> {
  return apiRequest<AuthUser>("/api/auth/me", { token });
}

/**
 * PATCH /api/users/me
 *
 * Update mutable profile fields. Any field can be omitted (partial update).
 */
export async function updateProfile(params: {
  display_name?: string;
  avatar_url?: string;
  phone_number?: string;
}): Promise<AuthUser> {
  return apiRequest<AuthUser>("/api/users/me", {
    method: "PATCH",
    body: params,
  });
}

/** Remove the JWT from storage (client-side logout). */
export function logoutUser(): void {
  removeStoredToken();
}
