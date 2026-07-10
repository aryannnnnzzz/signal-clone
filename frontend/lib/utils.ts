/**
 * Format an ISO timestamp for the conversation list sidebar.
 * - < 60 min ago  → "14:32"  (24h time)
 * - Yesterday     → "Yesterday"
 * - This week     → "Mon" / "Tue" etc.
 * - Older         → "12/07/25"
 */
export function formatSidebarTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/**
 * Format an ISO timestamp for display inside a message bubble.
 * Always returns "HH:MM" in 24-hour format.
 */
export function formatMessageTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Build the date separator label shown between message groups.
 */
export function getDateLabel(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / 86_400_000
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * Return up to two uppercase initials from a display name.
 * "Alice Walker" → "AW", "Bob" → "B"
 */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

/**
 * Deterministically pick a background color for an avatar
 * based on the contact name hash.
 */
export function getAvatarColor(name: string): string {
  const palette = [
    "#2c6bed", // Signal blue
    "#e05d44", // red-orange
    "#5c6bc0", // indigo
    "#26a69a", // teal
    "#ef6c00", // orange
    "#8e24aa", // purple
    "#00897b", // green-teal
    "#c0392b", // crimson
    "#1565c0", // deep blue
    "#2e7d32", // forest green
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

/**
 * Returns true when consecutive messages in a list change day boundaries.
 * Used to decide whether to render a date separator.
 */
export function isNewDay(prev: string, curr: string): boolean {
  return new Date(prev).toDateString() !== new Date(curr).toDateString();
}
