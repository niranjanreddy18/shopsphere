/**
 * PaymentForm — the actual Stripe Elements form. Must be rendered as a
 * child of <Elements> (see PaymentPage), since useStripe/useElements read
 * from that context.
 *
 * `redirect: "if_required"` keeps card payments (the common case in test
 * mode) resolved entirely client-side without bouncing through a redirect
 * URL — Stripe only redirects when the chosen payment method genuinely
 * requires it (e.g. certain bank redirect methods).
 */

import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

import Button from "../../../components/ui/Button";

export default function PaymentForm({ onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${import.meta.env.VITE_FRONTEND_BASE_URL || window.location.origin}/payment-success`,
      },
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message || "Payment failed. Please check your card details and try again.");
      onError?.(error);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess?.(paymentIntent);
    } else {
      // requires_action / processing / etc. — Stripe test mode with 3DS
      // test cards can land here; treat as "not yet confirmed".
      setErrorMessage("Payment is still processing. Please wait a moment and check your order status.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}
      <Button type="submit" isLoading={isSubmitting} disabled={!stripe} className="mt-6 w-full">
        Pay now
      </Button>
    </form>
  );
}
