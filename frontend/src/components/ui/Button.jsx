/**
 * Button — reusable button with a built-in loading spinner state so every
 * form submit button in the app looks and behaves consistently instead of
 * each page re-implementing its own "disable + spinner while submitting"
 * logic.
 */

const VARIANT_CLASS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
};

export default function Button({
  children,
  variant = "primary",
  isLoading = false,
  className = "",
  disabled,
  ...rest
}) {
  return (
    <button
      className={`${VARIANT_CLASS[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
