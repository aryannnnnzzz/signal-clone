"use client";

import {
  useState,
  useRef,
  useEffect,
  type FormEvent,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import AuthContainer from "./AuthContainer";
import SignalLogo from "./SignalLogo";
import AuthBackButton from "./AuthBackButton";

interface OtpScreenProps {
  phoneNumber: string;
  onVerified: () => void;
  onBack: () => void;
  onResend: () => void;
}

const OTP_LENGTH = 6;
const MOCK_VALID_CODE = "123456";

/**
 * OTP Verification screen.
 *
 * - 6 individual digit inputs that auto-advance on typing.
 * - Paste support (pastes all 6 digits at once).
 * - Accepts the mock code "123456" (matches the backend's verify-otp endpoint).
 * - 30-second resend countdown timer.
 */
export default function OtpScreen({
  phoneNumber,
  onVerified,
  onBack,
  onResend,
}: OtpScreenProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* ── Resend countdown ─────────────────────────────── */
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  /* ── Verify ───────────────────────────────────────── */
  function verify(code: string) {
    if (code === MOCK_VALID_CODE) {
      setError(null);
      onVerified();
    } else {
      setError("Incorrect code. Try 123456 for demo.");
      // Shake inputs back to empty
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    }
  }

  /* ── Input handlers ───────────────────────────────── */
  function handleChange(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1); // only last digit
    if (!char) return;
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError(null);

    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // Last digit filled — auto-verify
      verify(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        next[index - 1] = "";
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    // Focus the next empty or the last input
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
    if (pasted.length === OTP_LENGTH) verify(pasted);
  }

  function handleResend() {
    setCountdown(30);
    setDigits(Array(OTP_LENGTH).fill(""));
    setError(null);
    onResend();
    inputRefs.current[0]?.focus();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < OTP_LENGTH) {
      setError("Please enter all 6 digits.");
      return;
    }
    verify(code);
  }

  const maskedPhone = phoneNumber
    ? phoneNumber.replace(/(\+?\d{1,3})\s?(\d{2,4})\s?\d+(\d{4})/, "$1 $2•••$3")
    : "your phone";

  return (
    <AuthContainer>
      <AuthBackButton onClick={onBack} />

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <SignalLogo size={56} />
        <div className="text-center">
          <h1 className="text-[22px] font-bold text-signal-primary">
            Verify your number
          </h1>
          <p className="text-signal-secondary text-[14px] mt-1 leading-snug">
            Enter the 6-digit code sent to
            <br />
            <span className="text-signal-primary font-medium">{maskedPhone}</span>
          </p>
        </div>
      </div>

      {/* ── OTP inputs ────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate>
        <div
          className="flex gap-2.5 justify-center mb-6"
          role="group"
          aria-label="One-time password"
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              id={`otp-digit-${i}`}
              type="text"
              inputMode="numeric"
              pattern="\d"
              maxLength={1}
              value={digit}
              aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className={`
                w-11 h-14 rounded-[10px] text-center text-[22px] font-bold
                bg-signal-hover border text-signal-primary
                outline-none transition-all duration-150
                focus:border-signal-blue focus:ring-2 focus:ring-signal-blue/20
                ${error
                  ? "border-red-500/70"
                  : digit
                  ? "border-signal-blue/60"
                  : "border-signal-border"
                }
              `}
              autoFocus={i === 0}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p
            role="alert"
            className="text-center text-red-400 text-[13px] mb-4"
          >
            {error}
          </p>
        )}

        {/* Demo hint */}
        <p className="text-center text-signal-muted text-[12px] mb-5">
          Demo: enter <span className="font-mono text-signal-secondary">123456</span>
        </p>

        <button
          id="otp-verify-btn"
          type="submit"
          className="w-full py-3 rounded-[10px] bg-signal-blue text-white font-semibold text-[15px] hover:bg-signal-blue-hover active:scale-[0.98] transition-all duration-150"
        >
          Verify
        </button>
      </form>

      {/* ── Resend ────────────────────────────────────── */}
      <p className="text-center text-signal-secondary text-[13px] mt-6">
        Didn&apos;t receive a code?{" "}
        {countdown > 0 ? (
          <span className="text-signal-muted">
            Resend in {countdown}s
          </span>
        ) : (
          <button
            id="otp-resend-btn"
            onClick={handleResend}
            className="text-signal-blue font-medium hover:underline"
          >
            Resend
          </button>
        )}
      </p>
    </AuthContainer>
  );
}
