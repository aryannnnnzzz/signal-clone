"use client";

/**
 * AuthContext — global authentication state for the Signal Clone frontend.
 *
 * Provides:
 *   - user: AuthUser | null  — the authenticated user profile
 *   - token: string | null   — the current JWT
 *   - isAuthenticated: bool  — derived from user !== null
 *   - isLoading: bool        — true while session is being restored on mount
 *
 * Actions:
 *   - login(username, password) → calls POST /api/auth/login
 *   - register(params)         → calls POST /api/auth/register
 *   - verifyOtp(phone, code)   → calls POST /api/auth/verify-otp
 *   - updateProfile(params)    → calls PATCH /api/users/me
 *   - logout()                 → clears token and user state
 *
 * Session persistence:
 *   On mount, reads the JWT from localStorage and calls GET /api/auth/me.
 *   If the token is valid the user is silently restored; if not (expired/
 *   invalid) the stored token is removed and the user sees the auth flow.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  loginUser,
  registerUser,
  verifyOtp as verifyOtpService,
  fetchMe,
  updateProfile as updateProfileService,
  logoutUser,
} from "@/lib/authService";
import { getStoredToken } from "@/lib/api";
import type { AuthUser } from "@/types";

// ─── Context shape ─────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (params: {
    username: string;
    password: string;
    display_name: string;
    phone_number?: string;
  }) => Promise<void>;
  verifyOtp: (phone_number: string, otp: string) => Promise<void>;
  updateProfile: (params: {
    display_name?: string;
    avatar_url?: string;
    phone_number?: string;
  }) => Promise<void>;
  /**
   * Called at the very end of the onboarding flow (after Avatar step).
   * Promotes the pendingUser to user, flipping isAuthenticated → true
   * and causing page.tsx to render AppLayout.
   */
  completeAuth: () => void;
  logout: () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  /**
   * Holds the user returned by register() or login() while the onboarding
   * flow (OTP → DisplayName → Avatar) is still in progress.
   * Once completeAuth() is called it is promoted to `user`, which flips
   * isAuthenticated → true and renders AppLayout.
   */
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ── Restore session on mount ────────────────────── */
  useEffect(() => {
    async function restoreSession() {
      const stored = getStoredToken();
      if (!stored) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await fetchMe(stored);
        setToken(stored);
        setUser(me);
      } catch {
        // Token is expired or invalid — clear it silently
        logoutUser();
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  /* ── Actions ─────────────────────────────────────── */

  const login = useCallback(async (username: string, password: string) => {
    const data = await loginUser({ username, password });
    setToken(data.access_token);
    // Store in pendingUser so onboarding screens (OTP → DisplayName → Avatar)
    // can still run before isAuthenticated flips to true.
    setPendingUser(data.user);
  }, []);

  const register = useCallback(
    async (params: {
      username: string;
      password: string;
      display_name: string;
      phone_number?: string;
    }) => {
      const data = await registerUser(params);
      setToken(data.access_token);
      // Do NOT call setUser here — that would immediately flip isAuthenticated
      // to true and skip the OTP → DisplayName → Avatar onboarding screens.
      // The token is stored in localStorage by registerUser(), so subsequent
      // authenticated API calls (verifyOtp, updateProfile) will work fine.
      setPendingUser(data.user);
    },
    []
  );

  const verifyOtp = useCallback(
    async (phone_number: string, otp: string) => {
      await verifyOtpService({ phone_number, otp });
      // OTP verification doesn't change auth state — the token was already
      // set by login/register. We just need the call to succeed.
    },
    []
  );

  const updateProfile = useCallback(
    async (params: {
      display_name?: string;
      avatar_url?: string;
      phone_number?: string;
    }) => {
      const updated = await updateProfileService(params);
      // Update pendingUser if we are still in onboarding; otherwise update user.
      if (user !== null) {
        setUser(updated);
      } else {
        setPendingUser(updated);
      }
    },
    [user]
  );

  /**
   * Finalises authentication after the onboarding flow completes.
   * Promotes pendingUser → user, which causes page.tsx to render AppLayout.
   */
  const completeAuth = useCallback(() => {
    if (pendingUser) {
      setUser(pendingUser);
      setPendingUser(null);
    }
  }, [pendingUser]);

  const logout = useCallback(() => {
    logoutUser();
    setToken(null);
    setUser(null);
    setPendingUser(null);
  }, []);

  /* ── Value ───────────────────────────────────────── */

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    verifyOtp,
    updateProfile,
    completeAuth,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * useAuth — consume the authentication context.
 *
 * Must be used inside <AuthProvider>.
 * Throws if called outside the provider so misuse is caught at dev time.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
