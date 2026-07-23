/**
 * DeliveryEstimate — "Get it by <date>" / free-shipping messaging shown on
 * product cards and the product detail page.
 *
 * The backend doesn't model carrier transit times (that's a real
 * integration — see the README's Future Improvements on cloud/logistics
 * services), so this computes a generic estimate client-side: 3–5 business
 * days out from today, which is a standard, honestly-labeled placeholder
 * rather than a fabricated-looking exact date. It's deliberately a small,
 * self-contained function (not a slice/API call) since it has no server
 * state to synchronize.
 */

import { Truck } from "lucide-react";

import { getEstimatedDeliveryRange } from "../../utils/deliveryEstimate";

export default function DeliveryEstimate({ freeThreshold = 50, price, compact = false }) {
  const qualifiesForFreeShipping = price === undefined || Number(price) >= freeThreshold;

  return (
    <div className={`flex items-center gap-1.5 text-ink-500 ${compact ? "text-xs" : "text-sm"}`}>
      <Truck className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      <span>
        {qualifiesForFreeShipping ? "Free delivery" : "Delivery"} by{" "}
        <span className="font-medium text-ink-700">{getEstimatedDeliveryRange()}</span>
      </span>
    </div>
  );
}
