/**
 * PaymentPage — the payment step for a PENDING order. Creates a Stripe
 * PaymentIntent on mount, mounts Stripe Elements with the returned
 * `client_secret`, and on confirmed payment syncs the local Payment/Order
 * status before redirecting to the success page.
 *
 * The `sync` call after client-side confirmation is a dev-mode safety net
 * (see PaymentService.sync_payment_status's docstring on the backend) —
 * in production, the webhook alone would already have updated the order
 * by the time the customer lands on the success page, but localhost can't
 * receive Stripe webhooks without the Stripe CLI forwarding them, so the
 * frontend forces a fresh read here too.
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";

import { paymentsApi } from "../../../api/paymentsApi";
import { getStripe } from "../../../utils/stripeClient";
import PaymentForm from "../components/PaymentForm";
import { FullPageSpinner } from "../../../components/ui/Spinner";
import ErrorMessage from "../../../components/common/ErrorMessage";

export default function PaymentPage() {
  const { id: orderId } = useParams();
  const navigate = useNavigate();

  const [intentData, setIntentData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    paymentsApi
      .createIntent(orderId)
      .then((data) => {
        if (!cancelled) setIntentData(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || "Could not start payment for this order.");
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const handleSuccess = async () => {
    try {
      await paymentsApi.syncStatus(intentData.payment.id);
    } finally {
      navigate(`/orders/${orderId}/success`);
    }
  };

  if (error) return <ErrorMessage message={error} />;
  if (!intentData) return <FullPageSpinner />;

  const stripePromise = getStripe(intentData.publishable_key);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-xl font-semibold text-gray-900">Payment</h1>
      <p className="mb-6 text-sm text-gray-500">
        Amount due: <span className="font-medium text-gray-900">${Number(intentData.payment.amount).toFixed(2)}</span>
      </p>

      <div className="card">
        <Elements stripe={stripePromise} options={{ clientSecret: intentData.client_secret }}>
          <PaymentForm onSuccess={handleSuccess} />
        </Elements>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        Test mode — use card number 4242 4242 4242 4242, any future expiry, any CVC.
      </p>
    </div>
  );
}
