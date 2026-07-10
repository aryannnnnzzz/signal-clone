"use client";

import { useState } from "react";
import WelcomeScreen from "./WelcomeScreen";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import OtpScreen from "./OtpScreen";
import DisplayNameScreen from "./DisplayNameScreen";
import AvatarScreen from "./AvatarScreen";

export type AuthScreen =
  | "welcome"
  | "login"
  | "register"
  | "otp"
  | "displayName"
  | "avatar";

interface AuthFlowProps {
  /** Called when auth is fully complete; parent switches to the main app */
  onComplete: () => void;
}

/**
 * Orchestrates the multi-step authentication UI flow.
 *
 * Screen order:
 *   Welcome → Login (existing) → OTP → DisplayName → Avatar → App
 *   Welcome → Register (new)   → OTP → DisplayName → Avatar → App
 *
 * All navigation is mock — no API calls are made.
 */
export default function AuthFlow({ onComplete }: AuthFlowProps) {
  const [screen, setScreen] = useState<AuthScreen>("welcome");
  /** Carry the phone/email value across screens so OTP can show it */
  const [phoneNumber, setPhoneNumber] = useState("");

  const go = (next: AuthScreen) => setScreen(next);

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
          onSubmit={(phone) => {
            setPhoneNumber(phone);
            go("otp");
          }}
          onBack={() => go("welcome")}
          onSwitchToRegister={() => go("register")}
        />
      );

    case "register":
      return (
        <RegisterScreen
          onSubmit={(phone) => {
            setPhoneNumber(phone);
            go("otp");
          }}
          onBack={() => go("welcome")}
          onSwitchToLogin={() => go("login")}
        />
      );

    case "otp":
      return (
        <OtpScreen
          phoneNumber={phoneNumber}
          onVerified={() => go("displayName")}
          onBack={() => go("login")}
          onResend={() => {
            /* mock – no-op */
          }}
        />
      );

    case "displayName":
      return (
        <DisplayNameScreen
          onSubmit={() => go("avatar")}
          onBack={() => go("otp")}
        />
      );

    case "avatar":
      return (
        <AvatarScreen
          onComplete={() => {
            onComplete();
          }}
          onBack={() => go("displayName")}
          onSkip={onComplete}
        />
      );

    default:
      return null;
  }
}
