"use client";

import { useState, type FormEvent } from "react";
import AuthContainer from "./AuthContainer";
import SignalLogo from "./SignalLogo";
import AuthBackButton from "./AuthBackButton";
import AuthInput from "./AuthInput";

interface LoginScreenProps {
  onSubmit: (phoneNumber: string) => void;
  onBack: () => void;
  onSwitchToRegister: () => void;
}

/**
 * Login screen — collects phone number + password.
 *
 * - Client-side validation UI only (no API calls).
 * - Accepting code 123456 is handled in OtpScreen, not here.
 */
export default function LoginScreen({
  onSubmit,
  onBack,
  onSwitchToRegister,
}: LoginScreenProps) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>(
    {}
  );

  function validate(): boolean {
    const next: typeof errors = {};
    if (!phone.trim()) next.phone = "Phone number is required.";
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(phone.trim()))
      next.phone = "Enter a valid phone number.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 6)
      next.password = "Password must be at least 6 characters.";
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
          id="login-phone"
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

        <button
          id="login-submit-btn"
          type="submit"
          className="w-full mt-2 py-3 rounded-[10px] bg-signal-blue text-white font-semibold text-[15px] hover:bg-signal-blue-hover active:scale-[0.98] transition-all duration-150"
        >
          Continue
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
