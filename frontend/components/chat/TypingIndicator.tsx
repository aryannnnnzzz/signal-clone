"use client";

/**
 * TypingIndicator - shows "Alice is typing..." with an animated 3-dot pulse.
 *
 * Rules:
 *   0 typers  - renders nothing
 *   1 typer   - "Alice is typing..."
 *   2 typers  - "Alice and Bob are typing..."
 *   3+ typers - "Alice, Bob and 2 others are typing..."
 *
 * The three dots are animated via CSS keyframes (typingBounce) in globals.css.
 * Each dot has a staggered animation-delay so they bounce in sequence.
 */

interface Typer {
  userId: string;
  displayName: string;
}

interface TypingIndicatorProps {
  typers: Typer[];
}

export default function TypingIndicator({ typers }: TypingIndicatorProps) {
  if (typers.length === 0) return null;

  /* Build label text */
  let label: string;
  if (typers.length === 1) {
    label = typers[0].displayName + " is typing";
  } else if (typers.length === 2) {
    label =
      typers[0].displayName + " and " + typers[1].displayName + " are typing";
  } else {
    label = typers.length + " people are typing";
  }

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 select-none"
      aria-live="polite"
      aria-label={label + "..."}
      role="status"
    >
      {/* Animated dot trio */}
      <div className="flex items-center gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 rounded-full bg-signal-secondary"
            style={{
              animation: "typingBounce 1.2s ease-in-out infinite",
              animationDelay: i * 0.2 + "s",
            }}
          />
        ))}
      </div>

      {/* Label text */}
      <span className="text-signal-secondary text-[12px] leading-none">
        {label}...
      </span>
    </div>
  );
}
