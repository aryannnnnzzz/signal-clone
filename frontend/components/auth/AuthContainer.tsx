/**
 * Reusable animated container used by every auth screen.
 *
 * - Vertically centres its content.
 * - Provides a consistent max-width card on desktop.
 * - Uses a gentle fade+slide-up entrance via CSS animation.
 */
export default function AuthContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-signal-chat px-4 py-8">
      <div
        className="w-full max-w-[420px] animate-auth-enter"
        style={{
          animation: "authEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        {children}
      </div>
    </div>
  );
}
