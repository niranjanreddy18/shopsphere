/**
 * AddressSelector — radio-list picker for choosing a shipping or billing
 * address at checkout, reusing the same Address shape the profile's
 * AddressesPage already manages. Includes an inline "Add new address"
 * link rather than duplicating the address form here.
 */

import { Link } from "react-router-dom";

export default function AddressSelector({ title, addresses, selectedId, onSelect }) {
  if (addresses.length === 0) {
    return (
      <div className="card">
        <h2 className="mb-2 font-semibold text-gray-900">{title}</h2>
        <p className="mb-3 text-sm text-gray-600">You don't have any saved addresses yet.</p>
        <Link to="/profile/addresses" className="btn-primary inline-block text-sm">
          Add an address
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="mb-3 font-semibold text-gray-900">{title}</h2>
      <div className="space-y-2">
        {addresses.map((address) => (
          <label
            key={address.id}
            className={`block cursor-pointer rounded-md border p-3 text-sm ${
              selectedId === address.id ? "border-brand-600 bg-brand-50" : "border-gray-200"
            }`}
          >
            <input
              type="radio"
              className="mr-2"
              checked={selectedId === address.id}
              onChange={() => onSelect(address.id)}
            />
            <span className="font-medium text-gray-900">{address.full_name}</span>
            <span className="block pl-5 text-gray-600">
              {address.line1}, {address.city}, {address.state} {address.postal_code}, {address.country}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
