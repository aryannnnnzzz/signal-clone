"use client";

import { useState } from "react";

interface AuthInputProps {
  id: string;
  label: string;
  type: "text" | "tel" | "password" | "email";
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}

/**
 * Reusable styled input field for auth screens.
 *
 * - Dark Signal-themed styling with blue focus ring.
 * - Inline error message shown below the field.
 * - Password fields get a show/hide toggle button.
 */
export default function AuthInput({
  id,
  label,
  type,
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
  autoFocus,
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[13px] font-medium text-signal-secondary"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`
            w-full px-3.5 py-3 rounded-[10px] text-[15px]
            bg-signal-hover text-signal-primary placeholder:text-signal-muted
            border outline-none transition-all duration-150
            focus:ring-2 focus:ring-signal-blue/25 focus:border-signal-blue
            ${error ? "border-red-500/60" : "border-signal-border"}
            ${isPassword ? "pr-11" : ""}
          `}
        />

        {/* Password toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-signal-muted hover:text-signal-secondary transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              /* Eye-off icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              /* Eye icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-red-400 text-[12px]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
