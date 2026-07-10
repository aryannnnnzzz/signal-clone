"use client";

import { useState, type FormEvent } from "react";
import AuthContainer from "./AuthContainer";
import SignalLogo from "./SignalLogo";
import AuthBackButton from "./AuthBackButton";
import AuthInput from "./AuthInput";

interface LoginScreenProps {
  /** Called with (username, password) when form validates */
  onSubmit: (username: string, password: string) => void;
  onBack: () => void;
  onSwitchToRegister: () => void;
  /** True while the API call is in-flight */
  isLoading?: boolean;
  /** API error message to display below the form */
  apiError?: string | null;
}

/**
 * Login screen — collects username + password.
 *
 * The backend login endpoint uses `username`, not phone_number.
 * Client-side validation runs before the API call is made.
 */
export default function LoginScreen({
  onSubmit,
  onBack,
  onSwitchToRegister,
  isLoading = false,
  apiError,
}: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>(
    {}
  );

  function validate(): boolean {
    const next: typeof errors = {};
    if (!username.trim()) next.username = "Username is required.";
    else if (username.trim().length < 3)
      next.username = "Username must be at least 3 characters.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 4)
      next.password = "Password must be at least 4 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isLoading && validate()) onSubmit(username.trim(), password);
  }

  return (
    <AuthContainer>
      <AuthBackButton onClick={onBack} />

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <SignalLogo size={56} />
        <div className="text-center">
          <h1 className="text-[22px] font-bold text-signal-primary">
            Welcome back
          </h1>
          <p className="text-signal-secondary text-[14px] mt-1">
            Log in to your Signal account
          </p>
        </div>
      </div>

      {/* ── Form ──────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <AuthInput
          id="login-username"
          label="Username"
          type="text"
          placeholder="alice_walker"
          value={username}
          onChange={(v) => {
            setUsername(v);
            if (errors.username) setErrors((e) => ({ ...e, username: undefined }));
          }}
          error={errors.username}
          autoComplete="username"
          autoFocus
        />

        <AuthInput
          id="login-password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (errors.password)
              setErrors((e) => ({ ...e, password: undefined }));
          }}
          error={errors.password}
          autoComplete="current-password"
        />

        {/* API error */}
        {apiError && (
          <p role="alert" className="text-red-400 text-[13px] text-center">
            {apiError}
          </p>
        )}

        <button
          id="login-submit-btn"
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3 rounded-[10px] bg-signal-blue text-white font-semibold text-[15px] hover:bg-signal-blue-hover active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                style={{ animation: "spin 0.7s linear infinite" }}
                aria-hidden="true"
              />
              Logging in…
            </>
          ) : (
            "Continue"
          )}
        </button>
      </form>

      {/* ── Switch ────────────────────────────────────── */}
      <p className="text-center text-signal-secondary text-[13px] mt-6">
        Don&apos;t have an account?{" "}
        <button
          id="login-switch-register"
          onClick={onSwitchToRegister}
          className="text-signal-blue font-medium hover:underline"
        >
          Create one
        </button>
      </p>
    </AuthContainer>
  );
}
