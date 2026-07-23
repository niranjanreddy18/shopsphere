/**
 * ProfilePage — view and edit the authenticated user's own profile fields.
 * Email/role are intentionally read-only here (see UserSerializer on the
 * backend) — this module's scope doesn't include email-change or
 * role-elevation flows.
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";

import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
import { useAppDispatch } from "../../../app/store/hooks";
import { useAuth } from "../../../hooks/useAuth";
import { updateProfile } from "../authSlice";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    defaultValues: { first_name: "", last_name: "", phone_number: "" },
  });

  // Populate the form once the user profile is available/updated, e.g.
  // after the initial fetchProfile() resolves on app load.
  useEffect(() => {
    if (user) {
      reset({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone_number: user.phone_number || "",
      });
    }
  }, [user, reset]);

  const onSubmit = (formData) => {
    dispatch(updateProfile(formData));
  };

  return (
    <div className="card">
      <h1 className="mb-1 text-lg font-semibold text-gray-900">Profile Details</h1>
      <p className="mb-6 text-sm text-gray-500">
        {user?.email} {user?.is_email_verified ? "✓ verified" : "· email not verified"}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            id="first_name"
            label="First name"
            error={errors.first_name?.message}
            {...register("first_name", { required: "First name is required." })}
          />
          <TextInput
            id="last_name"
            label="Last name"
            error={errors.last_name?.message}
            {...register("last_name", { required: "Last name is required." })}
          />
        </div>

        <TextInput
          id="phone_number"
          type="tel"
          label="Phone number"
          placeholder="+919876543210"
          error={errors.phone_number?.message}
          {...register("phone_number")}
        />

        <Button type="submit" isLoading={isSubmitting} disabled={!isDirty}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
