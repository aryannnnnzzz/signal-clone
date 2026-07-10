"use client";

import { useState, type FormEvent } from "react";
import AuthContainer from "./AuthContainer";
import AuthBackButton from "./AuthBackButton";
import AuthInput from "./AuthInput";

interface DisplayNameScreenProps {
  onSubmit: (displayName: string) => void;
  onBack: () => void;
}

/**
 * Display Name setup screen — lets the user pick their public name.
 *
 * Shown after OTP verification, before avatar selection.
 * Client-side validation only — no API calls.
 */
export default function DisplayNameScreen({
  onSubmit,
  onBack,
}: DisplayNameScreenProps) {
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | undefined>();

  function validate(): boolean {
    if (!displayName.trim()) {
      setError("Display name is required.");
      return false;
    }
    if (displayName.trim().length < 2) {
      setError("Display name must be at least 2 characters.");
      return false;
    }
    if (displayName.trim().length > 64) {
      setError("Display name must be 64 characters or fewer.");
      return false;
    }
    return true;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (validate()) onSubmit(displayName.trim());
  }

  const remaining = 64 - displayName.length;

  return (
    <AuthContainer>
      <AuthBackButton onClick={onBack} />

      {/* ── Illustration ──────────────────────────────── */}
      <div className="flex flex-col items-center gap-4 mb-8">
        {/* Person icon placeholder */}
        <div className="w-[72px] h-[72px] rounded-full bg-signal-blue/15 border border-signal-blue/30 flex items-center justify-center">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2c6bed"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-[22px] font-bold text-signal-primary">
            Your Name
          </h1>
          <p className="text-signal-secondary text-[14px] mt-1 leading-snug max-w-[260px]">
            This is how you&apos;ll appear to others on Signal.
            You can change it later.
          </p>
        </div>
      </div>

      {/* ── Form ──────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <AuthInput
            id="display-name-input"
            label="Display Name"
            type="text"
            placeholder="e.g. Alice Walker"
            value={displayName}
            onChange={(v) => {
              if (v.length <= 64) {
                setDisplayName(v);
                setError(undefined);
              }
            }}
            error={error}
            autoComplete="name"
            autoFocus
          />
          <p
            className={`text-right text-[11px] mt-1 ${
              remaining < 10 ? "text-amber-400" : "text-signal-muted"
            }`}
          >
            {remaining} characters remaining
          </p>
        </div>

        <button
          id="display-name-submit-btn"
          type="submit"
          className="w-full mt-1 py-3 rounded-[10px] bg-signal-blue text-white font-semibold text-[15px] hover:bg-signal-blue-hover active:scale-[0.98] transition-all duration-150"
        >
          Next
        </button>
      </form>
    </AuthContainer>
  );
}
