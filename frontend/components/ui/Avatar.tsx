import { getInitials, getAvatarColor } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  name: string;
  /** Optional image URL. Falls back to generated initials. */
  src?: string;
  size?: AvatarSize;
  className?: string;
}

const SIZE_MAP: Record<AvatarSize, { outer: string; text: string }> = {
  xs: { outer: "w-6 h-6",   text: "text-[9px]" },
  sm: { outer: "w-8 h-8",   text: "text-xs"    },
  md: { outer: "w-10 h-10", text: "text-sm"    },
  lg: { outer: "w-12 h-12", text: "text-base"  },
  xl: { outer: "w-14 h-14", text: "text-lg"    },
};

/**
 * Avatar component with automatic initials fallback.
 * When no `src` is provided, renders a colored circle with
 * up to two initials derived deterministically from `name`.
 */
export default function Avatar({
  name,
  src,
  size = "md",
  className = "",
}: AvatarProps) {
  const { outer, text } = SIZE_MAP[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name}'s avatar`}
        className={`${outer} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${outer} rounded-full flex items-center justify-center flex-shrink-0 select-none ${className}`}
      style={{ backgroundColor: getAvatarColor(name) }}
      aria-label={`${name} avatar`}
      role="img"
    >
      <span className={`${text} font-semibold text-white leading-none`}>
        {getInitials(name)}
      </span>
    </div>
  );
}
