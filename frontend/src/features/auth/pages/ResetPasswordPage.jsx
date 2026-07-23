/**
 * ResetPasswordPage — completes the forgot-password flow.
 * Reads the reset `token` from the URL query string (?token=...), which is
 * exactly what EmailService.send_password_reset_email builds the link with
 * on the backend (see apps/accounts/services.py).
 */

import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
import { useAppDispatch } from "../../../app/store/hooks";
import { resetPassword } from "../authSlice";
import { ROUTES } from "../../../constants/routes";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=]).{8,}$/;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const newPassword = watch("new_password");

  const onSubmit = async (formData) => {
    const result = await dispatch(resetPassword({ token, ...formData }));
    if (resetPassword.fulfilled.match(result)) {
      navigate(ROUTES.LOGIN);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Invalid link</h1>
        <p className="text-sm text-gray-600">This password reset link is missing its token.</p>
        <Link to={ROUTES.FORGOT_PASSWORD} className="mt-6 inline-block text-sm font-medium text-brand-600">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Set a new password</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextInput
          id="new_password"
          type="password"
          label="New password"
          error={errors.new_password?.message}
          {...register("new_password", {
            required: "New password is required.",
            pattern: {
              value: PASSWORD_PATTERN,
              message: "Min 8 chars, with uppercase, lowercase, a number, and a symbol.",
            },
          })}
        />

        <TextInput
          id="new_password_confirm"
          type="password"
          label="Confirm new password"
          error={errors.new_password_confirm?.message}
          {...register("new_password_confirm", {
            required: "Please confirm your new password.",
            validate: (value) => value === newPassword || "Passwords do not match.",
          })}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Reset password
        </Button>
      </form>
    </div>
  );
}
