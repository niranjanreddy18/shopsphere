/**
 * PasswordStrengthMeter — live strength bar + requirement checklist shown
 * while typing a new password. The checklist rules mirror the backend's
 * actual validator exactly (see
 * backend/apps/accounts/validators.py::validate_strong_password) — min 8
 * characters, uppercase, lowercase, digit, symbol — so what this shows as
 * "met" is never out of sync with what the server will actually accept.
 */

const REQUIREMENTS = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One number", test: (v) => /\d/.test(v) },
  { label: "One special character", test: (v) => /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(v) },
];

const STRENGTH_LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["bg-red-500", "bg-red-400", "bg-amber-400", "bg-lime-500", "bg-green-500"];

export default function PasswordStrengthMeter({ password = "" }) {
  const metCount = REQUIREMENTS.filter((req) => req.test(password)).length;
  const strengthIndex = password ? Math.max(metCount - 1, 0) : -1;

  if (!password) return null;

  return (
    <div className="mb-4 -mt-2 animate-fade-in">
      <div className="flex gap-1">
        {REQUIREMENTS.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= strengthIndex ? STRENGTH_COLORS[strengthIndex] : "bg-ink-100"
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs font-medium text-ink-500">
        {strengthIndex >= 0 && STRENGTH_LABELS[strengthIndex]}
      </p>

      <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {REQUIREMENTS.map((req) => {
          const met = req.test(password);
          return (
            <li key={req.label} className={`flex items-center gap-1.5 text-xs ${met ? "text-green-600" : "text-ink-400"}`}>
              <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${met ? "bg-green-100" : "bg-ink-100"}`}>
                {met && (
                  <svg viewBox="0 0 12 12" className="h-2 w-2" fill="none">
                    <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
