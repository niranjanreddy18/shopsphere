/**
 * AddressForm — create/edit form for a single address.
 * Shared between the "add new address" and "edit existing address" flows —
 * the difference is only whether `defaultValues`/`onSubmit` reflect a
 * create or an update, decided by the parent (AddressesPage).
 */

import { useForm } from "react-hook-form";

import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";

export default function AddressForm({ defaultValues, onSubmit, onCancel, isSubmitting }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="border-t border-gray-100 pt-4">
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          id="full_name"
          label="Full name"
          error={errors.full_name?.message}
          {...register("full_name", { required: "Required." })}
        />
        <TextInput
          id="phone_number"
          label="Phone number"
          placeholder="+919876543210"
          error={errors.phone_number?.message}
          {...register("phone_number", { required: "Required." })}
        />
      </div>

      <TextInput
        id="line1"
        label="Address line 1"
        error={errors.line1?.message}
        {...register("line1", { required: "Required." })}
      />
      <TextInput id="line2" label="Address line 2 (optional)" {...register("line2")} />

      <div className="grid grid-cols-2 gap-3">
        <TextInput
          id="city"
          label="City"
          error={errors.city?.message}
          {...register("city", { required: "Required." })}
        />
        <TextInput
          id="state"
          label="State"
          error={errors.state?.message}
          {...register("state", { required: "Required." })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextInput
          id="postal_code"
          label="Postal code"
          error={errors.postal_code?.message}
          {...register("postal_code", { required: "Required." })}
        />
        <TextInput
          id="country"
          label="Country"
          error={errors.country?.message}
          {...register("country", { required: "Required." })}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="address_type" className="mb-1 block text-sm font-medium text-gray-700">
          Address type
        </label>
        <select id="address_type" className="input-field" {...register("address_type")}>
          <option value="SHIPPING">Shipping</option>
          <option value="BILLING">Billing</option>
        </select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" isLoading={isSubmitting}>
          Save address
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
