/**
 * Spinner — small inline loading indicator.
 * FullPageSpinner — centred, full-viewport variant used while route-level
 * auth state is still being resolved (see components/common/ProtectedRoute).
 */

export function Spinner({ className = "h-5 w-5" }) {
  return (
    <svg className={`animate-spin text-brand-600 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner className="h-10 w-10" />
    </div>
  );
}
