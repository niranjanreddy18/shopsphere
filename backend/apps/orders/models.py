"""
Models for the orders domain.

Contains:
    - Order: the placed order itself, with a full shipping/billing address
      *snapshot* (not a live FK to accounts.Address) and a monetary snapshot
      (subtotal/discount/shipping/tax/total) frozen at the moment of
      placement.
    - OrderItem: line items, each snapshotting the product's name/SKU/price
      at time of purchase.
    - OrderStatusHistory: an append-only audit trail of every status change.

Design decision — snapshotting over live FKs:
    An Order must remain accurate forever, even if the customer later edits
    or deletes the address they shipped to, or if a product's name/price/
    category changes after purchase. Snapshotting the relevant fields onto
    the Order/OrderItem at creation time (rather than joining live to
    Address/Product) is what makes "view my order from six months ago"
    permanently correct regardless of what happens to the underlying
    records afterward. `OrderItem.product` is kept as a nullable FK purely
    for convenience navigation (e.g. "view this product again") — it is
    never relied upon for display of historical order data.
"""

import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import BaseModel


def generate_order_number() -> str:
    """
    Human-readable, sortable order number: ORD-YYYYMMDD-XXXXXXXX.
    The date prefix makes orders roughly chronologically sortable by eye
    (useful in the admin/support context) while the random suffix keeps it
    non-guessable/non-enumerable, unlike a sequential integer.
    """
    return f"ORD-{timezone.now():%Y%m%d}-{uuid.uuid4().hex[:8].upper()}"


class Order(BaseModel):
    """A placed order: frozen pricing, frozen addresses, and a status lifecycle."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Payment"
        CONFIRMED = "CONFIRMED", "Confirmed"
        PROCESSING = "PROCESSING", "Processing"
        SHIPPED = "SHIPPED", "Shipped"
        DELIVERED = "DELIVERED", "Delivered"
        CANCELLED = "CANCELLED", "Cancelled"
        REFUNDED = "REFUNDED", "Refunded"

    # Statuses from which a customer is still allowed to self-serve cancel.
    # (Admins may cancel from any non-terminal status via OrderService.)
    CUSTOMER_CANCELLABLE_STATUSES = {Status.PENDING, Status.CONFIRMED, Status.PROCESSING}
    TERMINAL_STATUSES = {Status.DELIVERED, Status.CANCELLED, Status.REFUNDED}

    order_number = models.CharField(max_length=32, unique=True, default=generate_order_number, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)

    # --- Shipping address snapshot ------------------------------------
    shipping_full_name = models.CharField(max_length=255)
    shipping_phone_number = models.CharField(max_length=20)
    shipping_line1 = models.CharField(max_length=255)
    shipping_line2 = models.CharField(max_length=255, blank=True)
    shipping_city = models.CharField(max_length=100)
    shipping_state = models.CharField(max_length=100)
    shipping_postal_code = models.CharField(max_length=20)
    shipping_country = models.CharField(max_length=100)

    # --- Billing address snapshot ---------------------------------------
    billing_full_name = models.CharField(max_length=255)
    billing_phone_number = models.CharField(max_length=20)
    billing_line1 = models.CharField(max_length=255)
    billing_line2 = models.CharField(max_length=255, blank=True)
    billing_city = models.CharField(max_length=100)
    billing_state = models.CharField(max_length=100)
    billing_postal_code = models.CharField(max_length=20)
    billing_country = models.CharField(max_length=100)

    # --- Monetary snapshot (frozen at placement; never recomputed) ------
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    shipping_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])

    coupon = models.ForeignKey(
        "coupons.Coupon", on_delete=models.SET_NULL, null=True, blank=True, related_name="orders"
    )
    coupon_code = models.CharField(max_length=32, blank=True)

    # --- Fulfilment / tracking -------------------------------------------
    tracking_number = models.CharField(max_length=100, blank=True)
    carrier = models.CharField(max_length=100, blank=True)
    estimated_delivery_date = models.DateField(null=True, blank=True)

    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.CharField(max_length=500, blank=True)

    customer_note = models.CharField(max_length=500, blank=True)

    class Meta:
        db_table = "orders_order"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["order_number"]),
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return self.order_number

    @property
    def is_cancellable_by_customer(self) -> bool:
        return self.status in self.CUSTOMER_CANCELLABLE_STATUSES


class OrderItem(BaseModel):
    """
    A single line item within an order. Snapshots the product's name/SKU/
    unit price at purchase time — see the module docstring for why.
    """

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "products.Product", on_delete=models.SET_NULL, null=True, blank=True, related_name="order_items"
    )

    product_name = models.CharField(max_length=255)
    product_sku = models.CharField(max_length=64)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    line_total = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])

    class Meta:
        db_table = "orders_order_item"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.quantity} x {self.product_name} (order {self.order.order_number})"


class OrderStatusHistory(BaseModel):
    """
    Append-only audit trail of every status transition an order goes
    through — this is what powers the "Order Tracking" timeline in the UI,
    and (like StockMovement in the products app) exists so "when did this
    order ship, and who changed it?" always has a permanent answer.
    """

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_history")
    status = models.CharField(max_length=12, choices=Order.Status.choices)
    note = models.CharField(max_length=500, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        db_table = "orders_order_status_history"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.order.order_number}: {self.status}"
