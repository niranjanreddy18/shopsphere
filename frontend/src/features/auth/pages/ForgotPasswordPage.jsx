/**
 * ForgotPasswordPage — collects an email and triggers the reset-link email.
 * Always shows a generic success state, mirroring the backend's
 * enumeration-safe response (see accounts/services.py::request_password_reset).
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
import { useAppDispatch } from "../../../app/store/hooks";
import { forgotPassword } from "../authSlice";
import { ROUTES } from "../../../constants/routes";

export default function ForgotPasswordPage() {
  const dispatch = useAppDispatch();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ email }) => {
    await dispatch(forgotPassword(email));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Check your email</h1>
        <p className="text-sm text-gray-600">
          If an account with that email exists, we've sent a password reset link.
        </p>
        <Link to={ROUTES.LOGIN} className="mt-6 inline-block text-sm font-medium text-brand-600">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-gray-900">Forgot your password?</h1>
      <p className="mb-6 text-sm text-gray-600">
        Enter your email address and we'll send you a link to reset it.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextInput
          id="email"
          type="email"
          label="Email address"
          error={errors.email?.message}
          {...register("email", { required: "Email is required." })}
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        <Link to={ROUTES.LOGIN} className="font-medium text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
