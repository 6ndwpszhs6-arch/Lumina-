export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="12" r="6" stroke="currentColor" strokeWidth="1.8" className="logo-ring logo-ring-a" />
      <circle cx="15" cy="12" r="6" stroke="currentColor" strokeWidth="1.8" className="logo-ring logo-ring-b" />
    </svg>
  );
}
