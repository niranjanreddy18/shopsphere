"""
Validators for the payments domain.

Amount/currency validation is delegated to Stripe itself (it will reject a
PaymentIntent creation call with an invalid amount) rather than duplicated
here — see PaymentService.create_payment_intent's error handling.
"""
