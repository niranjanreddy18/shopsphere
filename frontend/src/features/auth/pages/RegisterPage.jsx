/**
 * RegisterPage — new account creation form.
 *
 * Uses react-hook-form in `onChange` mode so validation errors (and the
 * password strength meter / confirm-password match indicator) update as
 * the person types rather than only on submit — the "real-time
 * validation" this page was specifically redesigned to add. Validation
 * rules here are a fast client-side check only — the backend's
 * serializers remain the source of truth and are validated again
 * server-side regardless (see registerUser's error handling for how
 * server-side messages, e.g. "email already registered," still surface).
 */

import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";

import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
import PasswordStrengthMeter from "../../../components/ui/PasswordStrengthMeter";
import { useAppDispatch } from "../../../app/store/hooks";
import { registerUser } from "../authSlice";
import { ROUTES } from "../../../constants/routes";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=]).{8,}$/;

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm({ mode: "onChange" });

  const password = watch("password") || "";
  const passwordConfirm = watch("password_confirm") || "";
  const showMatchIndicator = touchedFields.password_confirm && passwordConfirm.length > 0;
  const passwordsMatch = password === passwordConfirm;

  const onSubmit = async (formData) => {
    const result = await dispatch(registerUser(formData));
    if (registerUser.fulfilled.match(result)) {
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink-950">Create your account</h1>
      <p className="mt-1 mb-8 text-sm text-ink-500">Join ShopSphere for faster checkout and order tracking.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            id="first_name"
            label="First name"
            autoComplete="given-name"
            error={errors.first_name?.message}
            {...register("first_name", { required: "First name is required." })}
          />
          <TextInput
            id="last_name"
            label="Last name"
            autoComplete="family-name"
            error={errors.last_name?.message}
            {...register("last_name", { required: "Last name is required." })}
          />
        </div>

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
          id="phone_number"
          type="tel"
          label="Phone number (optional)"
          placeholder="+919876543210"
          error={errors.phone_number?.message}
          {...register("phone_number", {
            pattern: { value: /^\+?[1-9]\d{6,14}$/, message: "Enter a valid phone number, e.g. +919876543210." },
          })}
        />

        <TextInput
          id="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password", {
            required: "Password is required.",
            pattern: {
              value: PASSWORD_PATTERN,
              message: "Min 8 chars, with uppercase, lowercase, a number, and a symbol.",
            },
          })}
        />
        <PasswordStrengthMeter password={password} />

        <TextInput
          id="password_confirm"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          error={errors.password_confirm?.message}
          hint={
            showMatchIndicator
              ? undefined
              : "Re-enter your password to confirm."
          }
          {...register("password_confirm", {
            required: "Please confirm your password.",
            validate: (value) => value === password || "Passwords do not match.",
          })}
        />
        {showMatchIndicator && (
          <p className={`-mt-3 mb-4 flex items-center gap-1.5 text-xs font-medium ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
            {passwordsMatch ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {passwordsMatch ? "Passwords match" : "Passwords do not match"}
          </p>
        )}

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full py-3">
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link to={ROUTES.LOGIN} className="link-underline font-semibold text-brand-600">
          Sign in
        </Link>
      </p>
    </div>
  );
}
