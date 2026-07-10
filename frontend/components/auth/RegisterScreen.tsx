"use client";

import { useState, type FormEvent } from "react";
import AuthContainer from "./AuthContainer";
import SignalLogo from "./SignalLogo";
import AuthBackButton from "./AuthBackButton";
import AuthInput from "./AuthInput";

interface RegisterScreenProps {
  /**
   * Called with the full registration data when form validates.
   * Matches the backend RegisterRequest schema exactly.
   */
  onSubmit: (params: {
    username: string;
    password: string;
    display_name: string;
    phone_number?: string;
  }) => void;
  onBack: () => void;
  onSwitchToLogin: () => void;
  /** True while the API call is in-flight */
  isLoading?: boolean;
  /** API error message to display below the form */
  apiError?: string | null;
}

/**
 * Registration screen — collects username, display name, password, and
 * optional phone number.
 *
 * Field order matches the backend RegisterRequest schema:
 *   { username, password, display_name, phone_number? }
 *
 * Client-side validation runs before the API call is made.
 */
export default function RegisterScreen({
  onSubmit,
  onBack,
  onSwitchToLogin,
  isLoading = false,
  apiError,
}: RegisterScreenProps) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    username?: string;
    displayName?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  function validate(): boolean {
    const next: typeof errors = {};

    if (!username.trim()) next.username = "Username is required.";
    else if (username.trim().length < 3)
      next.username = "Username must be at least 3 characters.";
    else if (!/^[a-z0-9_]{3,50}$/i.test(username.trim()))
      next.username = "Only letters, numbers, and underscores allowed.";

    if (!displayName.trim()) next.displayName = "Display name is required.";
    else if (displayName.trim().length < 1)
      next.displayName = "Display name cannot be empty.";

    if (!password) next.password = "Password is required.";
    else if (password.length < 4)
      next.password = "Password must be at least 4 characters.";

    if (!confirmPassword)
      next.confirmPassword = "Please confirm your password.";
    else if (password && confirmPassword !== password)
      next.confirmPassword = "Passwords do not match.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isLoading && validate()) {
      onSubmit({
        username: username.trim(),
        password,
        display_name: displayName.trim(),
        phone_number: phone.trim() || undefined,
      });
    }
  }

  return (
    <AuthContainer>
      <AuthBackButton onClick={onBack} />

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <SignalLogo size={56} />
        <div className="text-center">
          <h1 className="text-[22px] font-bold text-signal-primary">
            Create Account
          </h1>
          <p className="text-signal-secondary text-[14px] mt-1">
            Set up your Signal account in seconds
          </p>
        </div>
      </div>

      {/* ── Form ──────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <AuthInput
          id="register-username"
          label="Username"
          type="text"
          placeholder="alice_walker"
          value={username}
          onChange={(v) => {
            setUsername(v);
            if (errors.username)
              setErrors((e) => ({ ...e, username: undefined }));
          }}
          error={errors.username}
          autoComplete="username"
          autoFocus
        />

        <AuthInput
          id="register-display-name"
          label="Display Name"
          type="text"
          placeholder="Alice Walker"
          value={displayName}
          onChange={(v) => {
            setDisplayName(v);
            if (errors.displayName)
              setErrors((e) => ({ ...e, displayName: undefined }));
          }}
          error={errors.displayName}
          autoComplete="name"
        />

        <AuthInput
          id="register-phone"
          label="Phone Number (optional)"
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={phone}
          onChange={(v) => setPhone(v)}
          autoComplete="tel"
        />

        <AuthInput
          id="register-password"
          label="Password"
          type="password"
          placeholder="Create a strong password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (errors.password)
              setErrors((e) => ({ ...e, password: undefined }));
          }}
          error={errors.password}
          autoComplete="new-password"
        />

        <AuthInput
          id="register-confirm-password"
          label="Confirm Password"
          type="password"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(v) => {
            setConfirmPassword(v);
            if (errors.confirmPassword)
              setErrors((e) => ({ ...e, confirmPassword: undefined }));
          }}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        {/* API error */}
        {apiError && (
          <p role="alert" className="text-red-400 text-[13px] text-center">
            {apiError}
          </p>
        )}

        <button
          id="register-submit-btn"
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
              Creating account…
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      {/* ── Switch ────────────────────────────────────── */}
      <p className="text-center text-signal-secondary text-[13px] mt-6">
        Already have an account?{" "}
        <button
          id="register-switch-login"
          onClick={onSwitchToLogin}
          className="text-signal-blue font-medium hover:underline"
        >
          Log in
        </button>
      </p>
    </AuthContainer>
  );
}
