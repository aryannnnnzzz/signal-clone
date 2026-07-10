/**
 * Back-arrow button used at the top-left of every auth screen.
 * Renders a ← chevron that matches Signal's minimal icon style.
 */
export default function AuthBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      id="auth-back-btn"
      onClick={onClick}
      className="flex items-center gap-1.5 text-signal-secondary hover:text-signal-primary transition-colors duration-150 mb-6 group"
      aria-label="Go back"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="group-hover:-translate-x-0.5 transition-transform duration-150"
        aria-hidden="true"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      <span className="text-[13px]">Back</span>
    </button>
  );
}
