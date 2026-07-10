/**
 * Signal logo SVG — matches the official circular gradient + dove icon.
 * Rendered inline so no external image dependency is needed for the auth flow.
 */
export default function SignalLogo({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Signal logo"
      role="img"
    >
      <defs>
        <linearGradient
          id="signal-gradient"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2C6BED" />
          <stop offset="100%" stopColor="#1A3FA3" />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <circle cx="32" cy="32" r="32" fill="url(#signal-gradient)" />
      {/* Speech bubble body */}
      <path
        d="M32 14C21.507 14 13 21.611 13 31c0 5.314 2.71 10.043 6.964 13.194L17 50l7.003-2.498A21.1 21.1 0 0 0 32 48c10.493 0 19-7.611 19-17S42.493 14 32 14Z"
        fill="white"
        fillOpacity="0.95"
      />
      {/* Typing dots inside bubble */}
      <circle cx="24" cy="31" r="2.2" fill="#2C6BED" />
      <circle cx="32" cy="31" r="2.2" fill="#2C6BED" />
      <circle cx="40" cy="31" r="2.2" fill="#2C6BED" />
    </svg>
  );
}
