/**
 * LoginPage — email/password sign-in form.
 *
 * After a successful login, redirects back to wherever ProtectedRoute
 * originally sent the user from (location.state.from), falling back to the
 * profile page for a direct /login visit.
 */

import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";

import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
import { useAppDispatch } from "../../../app/store/hooks";
import { loginUser } from "../authSlice";
import { ROUTES } from "../../../constants/routes";

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { rememberMe: true } });

  const redirectTo = location.state?.from?.pathname || ROUTES.PROFILE;

  const onSubmit = async (formData) => {
    const result = await dispatch(loginUser(formData));
    if (loginUser.fulfilled.match(result)) {
      navigate(redirectTo, { replace: true });
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
          })}
        />

        <TextInput
          id="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password", { required: "Password is required." })}
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
