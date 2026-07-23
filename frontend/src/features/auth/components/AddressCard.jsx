/**
 * AddressCard — displays a single saved address with action buttons.
 * Pure presentational component — all mutation logic lives in the parent
 * (AddressesPage) via Redux thunks, keeping this component easy to reuse
 * elsewhere (e.g. an address picker at checkout, once orders are built).
 */

export default function AddressCard({ address, onEdit, onDelete, onSetDefault }) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-gray-600">
          {address.address_type}
        </span>
        {address.is_default && (
          <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">Default</span>
        )}
      </div>

      <p className="font-medium text-gray-900">{address.full_name}</p>
      <p className="text-sm text-gray-600">{address.phone_number}</p>
      <p className="text-sm text-gray-600">
        {address.line1}
        {address.line2 && `, ${address.line2}`}
      </p>
      <p className="text-sm text-gray-600">
        {address.city}, {address.state} {address.postal_code}
      </p>
      <p className="text-sm text-gray-600">{address.country}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => onEdit(address)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          Edit
        </button>
        <button onClick={() => onDelete(address.id)} className="text-sm font-medium text-red-600 hover:text-red-700">
          Delete
        </button>
        {!address.is_default && (
          <button
            onClick={() => onSetDefault(address.id)}
            className="text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Set as default
          </button>
        )}
      </div>
    </div>
  );
}
