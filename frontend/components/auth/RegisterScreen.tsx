"use client";

import { useState, type FormEvent } from "react";
import AuthContainer from "./AuthContainer";
import SignalLogo from "./SignalLogo";
import AuthBackButton from "./AuthBackButton";
import AuthInput from "./AuthInput";

interface RegisterScreenProps {
  onSubmit: (phoneNumber: string) => void;
  onBack: () => void;
  onSwitchToLogin: () => void;
}

/**
 * Registration screen — collects phone number, username, and password.
 *
 * - Client-side validation UI only (no API calls).
 * - On valid submit, advances to the OTP screen.
 */
export default function RegisterScreen({
  onSubmit,
  onBack,
  onSwitchToLogin,
}: RegisterScreenProps) {
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    phone?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!phone.trim()) next.phone = "Phone number is required.";
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(phone.trim()))
      next.phone = "Enter a valid phone number.";

    if (!username.trim()) next.username = "Username is required.";
    else if (username.trim().length < 3)
      next.username = "Username must be at least 3 characters.";
    else if (!/^[a-z0-9_]{3,32}$/i.test(username.trim()))
      next.username = "Only letters, numbers and underscores allowed.";

    if (!password) next.password = "Password is required.";
    else if (password.length < 8)
      next.password = "Password must be at least 8 characters.";

    if (!confirmPassword)
      next.confirmPassword = "Please confirm your password.";
    else if (password && confirmPassword !== password)
      next.confirmPassword = "Passwords do not match.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (validate()) onSubmit(phone.trim());
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
          id="register-phone"
          label="Phone Number"
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={phone}
          onChange={(v) => {
            setPhone(v);
            if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
          }}
          error={errors.phone}
          autoComplete="tel"
        />

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

        <button
          id="register-submit-btn"
          type="submit"
          className="w-full mt-2 py-3 rounded-[10px] bg-signal-blue text-white font-semibold text-[15px] hover:bg-signal-blue-hover active:scale-[0.98] transition-all duration-150"
        >
          Create Account
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
