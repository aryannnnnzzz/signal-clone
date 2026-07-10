import { Shield } from "lucide-react";

/**
 * Full-screen empty state shown in the right pane when
 * no conversation is selected. Replicates Signal Desktop's
 * centered logo + prompt UX.
 */
export default function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 bg-signal-chat select-none">
      {/* Signal logo mark */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-signal-blue/10" />
        {/* Inner circle */}
        <div className="w-20 h-20 rounded-full bg-signal-sidebar flex items-center justify-center shadow-lg">
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="22" cy="22" r="22" fill="#2C6BED" />
            {/* Stylised chat bubble */}
            <path
              d="M22 8C14.268 8 8 14.268 8 22c0 2.386.607 4.631 1.677 6.588L8 36l7.617-1.643A13.916 13.916 0 0022 36c7.732 0 14-6.268 14-14S29.732 8 22 8z"
              fill="white"
            />
          </svg>
        </div>
      </div>

      {/* Heading */}
      <div className="text-center space-y-2">
        <h2 className="text-signal-primary text-[22px] font-semibold tracking-tight">
          Signal Desktop
        </h2>
        <p className="text-signal-secondary text-sm max-w-[260px] leading-relaxed">
          Select a conversation from the sidebar to start messaging.
        </p>
      </div>

      {/* E2E badge */}
      <div className="flex items-center gap-1.5 text-signal-muted text-[12px] mt-2">
        <Shield size={13} />
        <span>End-to-end encrypted</span>
      </div>
    </div>
  );
}
