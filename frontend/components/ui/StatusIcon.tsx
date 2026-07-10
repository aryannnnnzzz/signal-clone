import { Check, CheckCheck } from "lucide-react";
import { MessageStatus } from "@/types";

interface StatusIconProps {
  status: MessageStatus;
  /** "sm" = 12px (sidebar preview), "md" = 14px (message bubble) */
  size?: "sm" | "md";
  /** Override color when inside a sent bubble (white/transparent) */
  variant?: "default" | "onBlue";
}

/**
 * Signal-style delivery/read receipt icon.
 *
 * - `sending`   → single grey check
 * - `sent`      → single grey check (same visual, different semantic)
 * - `delivered` → double grey check
 * - `read`      → double blue check (or white if variant=onBlue)
 */
export default function StatusIcon({
  status,
  size = "md",
  variant = "default",
}: StatusIconProps) {
  const px = size === "sm" ? 12 : 14;

  const greyClass =
    variant === "onBlue" ? "text-white/60" : "text-signal-secondary";
  const blueClass =
    variant === "onBlue" ? "text-white" : "text-signal-blue";

  if (status === "sending") {
    return (
      <Check
        size={px}
        className={`${greyClass} flex-shrink-0`}
        aria-label="Sending"
      />
    );
  }

  if (status === "sent") {
    return (
      <Check
        size={px}
        className={`${greyClass} flex-shrink-0`}
        aria-label="Sent"
      />
    );
  }

  if (status === "delivered") {
    return (
      <CheckCheck
        size={px}
        className={`${greyClass} flex-shrink-0`}
        aria-label="Delivered"
      />
    );
  }

  // "read"
  return (
    <CheckCheck
      size={px}
      className={`${blueClass} flex-shrink-0`}
      aria-label="Read"
    />
  );
}
