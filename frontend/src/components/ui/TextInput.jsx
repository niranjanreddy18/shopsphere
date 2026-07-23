/**
 * TextInput — a reusable, forwardRef-compatible input field.
 *
 * forwardRef is required so react-hook-form's `register()` can attach its
 * own ref to the underlying <input> for uncontrolled-input performance
 * (see docs.react-hook-form.com — register-based fields avoid a re-render
 * on every keystroke, unlike a fully controlled component).
 *
 * `type="password"` fields automatically get a show/hide toggle (an eye
 * icon that flips the rendered input type between "password" and "text")
 * — every password field in the app (login, register, reset password,
 * change password) picks this up for free rather than each page
 * reimplementing its own toggle button.
 */

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const TextInput = forwardRef(({ label, error, hint, id, type = "text", className = "", ...rest }, ref) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = type === "password";
  const resolvedType = isPasswordField && isPasswordVisible ? "text" : type;

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          ref={ref}
          type={resolvedType}
          className={`input-field ${isPasswordField ? "pr-10" : ""} ${
            error ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""
          }`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...rest}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((v) => !v)}
            tabIndex={-1}
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
          >
            {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});

TextInput.displayName = "TextInput";

export default TextInput;
