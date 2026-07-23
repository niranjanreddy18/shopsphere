/**
 * DeliveryReturnInfo — delivery estimate + return policy summary shown on
 * the product detail page. The return-window text mirrors
 * OrderService/apps.orders' actual cancellation rules (see the Returns &
 * Refunds static page for the full policy) rather than an invented number.
 */

import { Link } from "react-router-dom";
import { RotateCcw, ShieldCheck, Truck } from "lucide-react";

import DeliveryEstimate from "../../../components/ui/DeliveryEstimate";

export default function DeliveryReturnInfo({ price }) {
  return (
    <div className="space-y-3 rounded-xl border border-ink-100 p-4">
      <div className="flex items-start gap-3">
        <Truck className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
        <div>
          <DeliveryEstimate price={price} />
        </div>
      </div>
      <div className="flex items-start gap-3">
        <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
        <p className="text-sm text-ink-600">
          Free 30-day returns.{" "}
          <Link to="/returns" className="link-underline font-medium text-brand-600">
            Return policy
          </Link>
        </p>
      </div>
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
        <p className="text-sm text-ink-600">Secure checkout with buyer protection on every order.</p>
      </div>
    </div>
  );
}
