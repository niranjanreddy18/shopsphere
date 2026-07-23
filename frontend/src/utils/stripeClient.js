/**
 * Stripe.js loader.
 *
 * `loadStripe` fetches Stripe's own JS from their CDN and should only ever
 * be called once — `stripePromise` memoises that single call so mounting
 * the payment page repeatedly doesn't re-download/re-initialise Stripe.js
 * each time.
 */

import { loadStripe } from "@stripe/stripe-js";

let stripePromise;

export function getStripe(publishableKey) {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}
