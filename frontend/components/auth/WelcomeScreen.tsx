"use client";

import AuthContainer from "./AuthContainer";
import SignalLogo from "./SignalLogo";

interface WelcomeScreenProps {
  onLogin: () => void;
  onRegister: () => void;
}

/**
 * Welcome / landing screen — the first thing a user sees.
 *
 * Matches Signal Desktop's onboarding style:
 *   - Centred logo + wordmark
 *   - Brief privacy tagline
 *   - Two CTA buttons (Login / Create Account)
 */
export default function WelcomeScreen({
  onLogin,
  onRegister,
}: WelcomeScreenProps) {
  return (
    <AuthContainer>
      {/* ── Brand ─────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-5 mb-10">
        <SignalLogo size={80} />
        <div className="text-center">
          <h1 className="text-[28px] font-bold text-signal-primary tracking-tight leading-tight">
            Signal
          </h1>
          <p className="text-signal-secondary text-[15px] mt-1.5 leading-snug max-w-[280px]">
            Say hello to privacy. Messaging that&apos;s fast,
            simple, and completely private.
          </p>
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 h-px bg-signal-border" />
        <span className="text-signal-muted text-[11px] uppercase tracking-wider">
          Get Started
        </span>
        <div className="flex-1 h-px bg-signal-border" />
      </div>

      {/* ── CTAs ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <button
          id="welcome-register-btn"
          onClick={onRegister}
          className="w-full py-3 rounded-[10px] bg-signal-blue text-white font-semibold text-[15px] hover:bg-signal-blue-hover active:scale-[0.98] transition-all duration-150"
        >
          Create Account
        </button>
        <button
          id="welcome-login-btn"
          onClick={onLogin}
          className="w-full py-3 rounded-[10px] border border-signal-border text-signal-primary font-medium text-[15px] hover:bg-signal-hover active:scale-[0.98] transition-all duration-150"
        >
          Log In
        </button>
      </div>

      {/* ── Footer note ───────────────────────────────── */}
      <p className="text-center text-signal-muted text-[12px] mt-8 leading-relaxed">
        By continuing, you agree to our{" "}
        <button className="text-signal-blue hover:underline">Terms</button> and{" "}
        <button className="text-signal-blue hover:underline">
          Privacy Policy
        </button>
        .
      </p>
    </AuthContainer>
  );
}
