/**
 * AddressesPage — orchestrates the address list + add/edit form, wiring
 * Redux state and thunks to the presentational AddressCard/AddressForm
 * components.
 */

import { useEffect, useState } from "react";

import Button from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";
import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from "../addressSlice";
import AddressCard from "../components/AddressCard";
import AddressForm from "../components/AddressForm";

const EMPTY_ADDRESS = {
  address_type: "SHIPPING",
  full_name: "",
  phone_number: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
};

export default function AddressesPage() {
  const dispatch = useAppDispatch();
  const { items, status } = useAppSelector((state) => state.address);
  const [formMode, setFormMode] = useState(null); // null | 'create' | address object being edited

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  const handleSubmit = async (formData) => {
    const result =
      formMode === "create"
        ? await dispatch(createAddress(formData))
        : await dispatch(updateAddress({ id: formMode.id, payload: formData }));

    if (createAddress.fulfilled.match(result) || updateAddress.fulfilled.match(result)) {
      setFormMode(null);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Remove this address?")) {
      dispatch(deleteAddress(id));
    }
  };

  return (
    <div className="card">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Saved Addresses</h1>
        {!formMode && <Button onClick={() => setFormMode("create")}>Add address</Button>}
      </div>

      {status === "loading" && !items.length && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {!formMode && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={setFormMode}
              onDelete={handleDelete}
              onSetDefault={(id) => dispatch(setDefaultAddress(id))}
            />
          ))}
        </div>
      )}

      {!formMode && status === "succeeded" && items.length === 0 && (
        <p className="text-sm text-gray-500">You haven't saved any addresses yet.</p>
      )}

      {formMode && (
        <AddressForm
          defaultValues={formMode === "create" ? EMPTY_ADDRESS : formMode}
          onSubmit={handleSubmit}
          onCancel={() => setFormMode(null)}
        />
      )}
    </div>
  );
}
