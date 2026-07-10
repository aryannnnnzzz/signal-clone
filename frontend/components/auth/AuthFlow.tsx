"use client";

import { useState } from "react";
import WelcomeScreen from "./WelcomeScreen";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import OtpScreen from "./OtpScreen";
import DisplayNameScreen from "./DisplayNameScreen";
import AvatarScreen from "./AvatarScreen";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";

export type AuthScreen =
  | "welcome"
  | "login"
  | "register"
  | "otp"
  | "displayName"
  | "avatar";

/**
 * Orchestrates the multi-step authentication UI flow.
 *
 * Screen order:
 *   Welcome → Login  → OTP → DisplayName → Avatar → (auth context updates → App)
 *   Welcome → Register    → OTP → DisplayName → Avatar → (auth context updates → App)
 *
 * Navigation is driven by `screen` state.
 * API calls are delegated to the `useAuth` context actions.
 * When `login` or `register` succeeds, the context sets `isAuthenticated = true`,
 * which causes page.tsx to automatically switch to <AppLayout> — no explicit
 * `onComplete` callback needed.
 *
 * For the Register flow, after register() the user still goes through OTP →
 * DisplayName → Avatar so they can complete their profile before entering the app.
 * Login goes straight OTP → app (OTP is skipped for existing users who already
 * verified; we still show it as a demo requirement).
 */
export default function AuthFlow() {
  const { login, register, verifyOtp, updateProfile, completeAuth } = useAuth();

  const [screen, setScreen] = useState<AuthScreen>("welcome");

  // Data carried across screens
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isRegisterFlow, setIsRegisterFlow] = useState(false);

  // Per-screen API error message (shown inside the screen component)
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const go = (next: AuthScreen) => {
    setApiError(null);
    setScreen(next);
  };

  /* ── Helpers ─────────────────────────────────────── */

  function extractErrorMessage(err: unknown): string {
    if (err instanceof ApiError) return err.message;
    if (err instanceof Error) return err.message;
    return "Something went wrong. Please try again.";
  }

  /* ── Login handler ───────────────────────────────── */

  async function handleLogin(uname: string, pwd: string) {
    setIsSubmitting(true);
    setApiError(null);
    try {
      await login(uname, pwd);
      // Auth context now has user → page.tsx renders AppLayout automatically.
      // For demo completeness we still show OTP first.
      setIsRegisterFlow(false);
      go("otp");
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Register handler ────────────────────────────── */

  async function handleRegister(params: {
    username: string;
    password: string;
    display_name: string;
    phone_number?: string;
  }) {
    setIsSubmitting(true);
    setApiError(null);
    try {
      setPhoneNumber(params.phone_number ?? "");
      setDisplayName(params.display_name);
      await register(params);
      setIsRegisterFlow(true);
      go("otp");
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── OTP handler ─────────────────────────────────── */

  async function handleOtpVerified(otp: string) {
    setIsSubmitting(true);
    setApiError(null);
    try {
      // The backend requires a phone_number for OTP — use a placeholder if
      // none was provided (login flow where phone is optional).
      await verifyOtp(phoneNumber || "+10000000000", otp);
      if (isRegisterFlow) {
        go("displayName");
      } else {
        // Login flow: OTP done → straight to app
        // Auth context already has the user from login(); page.tsx will
        // switch to AppLayout automatically. Just update display name if needed.
        go("displayName");
      }
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── DisplayName handler ─────────────────────────── */

  async function handleDisplayName(name: string) {
    setIsSubmitting(true);
    setApiError(null);
    try {
      setDisplayName(name);
      await updateProfile({ display_name: name });
      go("avatar");
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Avatar handler ──────────────────────────────── */

  async function handleAvatarComplete(avatarUrl?: string) {
    if (avatarUrl) {
      try {
        await updateProfile({ avatar_url: avatarUrl });
      } catch {
        // Non-fatal — user can update avatar later
      }
    }
    // All onboarding steps are done. Promote pendingUser → user in AuthContext,
    // which flips isAuthenticated to true and causes page.tsx to render AppLayout.
    completeAuth();
  }

  /* ── Screen render ───────────────────────────────── */

  switch (screen) {
    case "welcome":
      return (
        <WelcomeScreen
          onLogin={() => go("login")}
          onRegister={() => go("register")}
        />
      );

    case "login":
      return (
        <LoginScreen
          onSubmit={handleLogin}
          onBack={() => go("welcome")}
          onSwitchToRegister={() => go("register")}
          isLoading={isSubmitting}
          apiError={apiError}
        />
      );

    case "register":
      return (
        <RegisterScreen
          onSubmit={handleRegister}
          onBack={() => go("welcome")}
          onSwitchToLogin={() => go("login")}
          isLoading={isSubmitting}
          apiError={apiError}
        />
      );

    case "otp":
      return (
        <OtpScreen
          phoneNumber={phoneNumber}
          onVerified={handleOtpVerified}
          onBack={() => go(isRegisterFlow ? "register" : "login")}
          onResend={() => {
            /* mock resend — no-op for demo */
          }}
          isLoading={isSubmitting}
          apiError={apiError}
        />
      );

    case "displayName":
      return (
        <DisplayNameScreen
          initialValue={displayName}
          onSubmit={handleDisplayName}
          onBack={() => go("otp")}
          isLoading={isSubmitting}
          apiError={apiError}
        />
      );

    case "avatar":
      return (
        <AvatarScreen
          displayName={displayName}
          onComplete={handleAvatarComplete}
          onBack={() => go("displayName")}
          onSkip={() => handleAvatarComplete(undefined)}
        />
      );

    default:
      return null;
  }
}
