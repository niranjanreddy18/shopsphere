/**
 * ChangePasswordPage — lets an already-authenticated user change their
 * password by confirming their current one first (see
 * AuthService.change_password on the backend).
 */

import { useForm } from "react-hook-form";

import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
import { useAppDispatch } from "../../../app/store/hooks";
import { changePassword } from "../authSlice";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=]).{8,}$/;

export default function ChangePasswordPage() {
  const dispatch = useAppDispatch();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const newPassword = watch("new_password");

  const onSubmit = async (formData) => {
    const result = await dispatch(changePassword(formData));
    if (changePassword.fulfilled.match(result)) {
      reset();
    }
  };

  return (
    <div className="card">
      <h1 className="mb-6 text-lg font-semibold text-gray-900">Change Password</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-sm">
        <TextInput
          id="old_password"
          type="password"
          label="Current password"
          error={errors.old_password?.message}
          {...register("old_password", { required: "Current password is required." })}
        />

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

        <Button type="submit" isLoading={isSubmitting}>
          Update password
        </Button>
      </form>
    </div>
  );
}
