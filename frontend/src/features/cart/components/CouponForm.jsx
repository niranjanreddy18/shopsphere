/**
 * CouponForm — coupon code entry. Applying a coupon just sets the code in
 * cartSlice and re-fetches the cart with `?coupon_code=`, which is what
 * makes the backend compute (and validate) the discount — see
 * CartSummarySerializer's `coupon_error` field, surfaced below if the code
 * the backend received turns out to be invalid/expired/not met.
 */

import { useState } from "react";

import Button from "../../../components/ui/Button";

export default function CouponForm({ appliedCode, couponError, onApply, onRemove }) {
  const [code, setCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim()) onApply(code.trim().toUpperCase());
  };

  if (appliedCode && !couponError) {
    return (
      <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
        <span>
          Coupon <strong>{appliedCode}</strong> applied
        </span>
        <button onClick={onRemove} className="font-medium underline">
          Remove
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Coupon code"
          className="input-field !mb-0 flex-1 uppercase"
        />
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </div>
      {couponError && <p className="text-xs text-red-600">{couponError}</p>}
    </form>
  );
}
