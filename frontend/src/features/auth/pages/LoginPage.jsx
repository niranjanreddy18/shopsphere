/**
 * LoginPage — email/password sign-in form.
 *
 * After a successful login, redirects back to wherever ProtectedRoute
 * originally sent the user from (location.state.from), falling back to the
 * profile page for a direct /login visit.
 */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";

import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
import { useAppDispatch } from "../../../app/store/hooks";
import { clearAuthError, loginUser } from "../authSlice";
import { ROUTES } from "../../../constants/routes";

const LOGIN_FIELDS = new Set(["email", "password"]);

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { rememberMe: true } });

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  const redirectTo = location.state?.from?.pathname || ROUTES.PROFILE;

  const onSubmit = async (formData) => {
    setServerError(null);
    const result = await dispatch(loginUser(formData));
    if (loginUser.fulfilled.match(result)) {
      navigate(redirectTo, { replace: true });
      return;
    }

    if (loginUser.rejected.match(result)) {
      const payload = result.payload;
      const message = typeof payload === "string" ? payload : payload?.message;
      const fieldErrors = (typeof payload === "object" && payload?.fieldErrors) || {};

      let hasFieldError = false;
      for (const [field, errorMsg] of Object.entries(fieldErrors)) {
        if (LOGIN_FIELDS.has(field)) {
          setError(field, { type: "server", message: errorMsg }, { shouldFocus: !hasFieldError });
          hasFieldError = true;
        }
      }

      if (!hasFieldError && message) {
        setServerError(message);
      }
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink-950">Welcome back</h1>
      <p className="mt-1 mb-8 text-sm text-ink-500">Sign in to continue to your account.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextInput
          id="email"
          type="email"
          label="Email address"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email", {
            required: "Email is required.",
            pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address." },
            onChange: () => setServerError(null),
          })}
        />

        <TextInput
          id="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password", {
            required: "Password is required.",
            onChange: () => setServerError(null),
          })}
        />

        <div className="mb-6 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              {...register("rememberMe")}
              className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            Remember me
          </label>
          <Link to={ROUTES.FORGOT_PASSWORD} className="link-underline text-sm font-medium text-brand-600">
            Forgot password?
          </Link>
        </div>

        {serverError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {serverError}
          </div>
        )}

        <Button type="submit" isLoading={isSubmitting} className="w-full py-3">
          Sign in
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-500">
        Don't have an account?{" "}
        <Link to={ROUTES.REGISTER} className="link-underline font-semibold text-brand-600">
          Create one
        </Link>
      </p>
    </div>
  );
}
