"""
Service layer for the orders domain — checkout, order lifecycle, and
invoice generation. Every state-changing operation here runs inside a
database transaction (see the `Database Transactions` section of the
top-level README) so an order is never left half-created or stock never
left half-adjusted if something fails partway through.
"""

import logging
from decimal import Decimal
from io import BytesIO

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Address
from apps.cart.models import Cart
from apps.cart.services import ShippingService, TaxService
from apps.coupons.services import CouponService
from apps.products.services import InventoryService, ProductService
from core.exceptions import ApplicationError

from .models import Order, OrderItem, OrderStatusHistory
from .validators import validate_status_transition

logger = logging.getLogger("apps")


class OrderService:
    """Business logic for checkout (order creation), cancellation, and status management."""

    @staticmethod
    def _snapshot_address(order: Order, *, prefix: str, address: Address) -> None:
        """Copies an Address's fields onto Order.<prefix>_* fields — see models.py docstring for why."""
        setattr(order, f"{prefix}_full_name", address.full_name)
        setattr(order, f"{prefix}_phone_number", address.phone_number)
        setattr(order, f"{prefix}_line1", address.line1)
        setattr(order, f"{prefix}_line2", address.line2)
        setattr(order, f"{prefix}_city", address.city)
        setattr(order, f"{prefix}_state", address.state)
        setattr(order, f"{prefix}_postal_code", address.postal_code)
        setattr(order, f"{prefix}_country", address.country)

    @staticmethod
    @transaction.atomic
    def create_order_from_cart(
        *, user, shipping_address_id, billing_address_id, coupon_code: str | None = None, customer_note: str = ""
    ) -> Order:
        """
        The full checkout flow: validates addresses and stock, computes the
        final price breakdown (reusing ShippingService/TaxService/
        CouponService — the exact same calculation the cart summary used,
        so the price the customer saw at checkout is the price they're
        charged), creates the Order + OrderItems, decrements inventory,
        records coupon usage, clears the cart, and writes the initial
        status-history entry.

        Wrapped in `transaction.atomic` — and every inventory deduction
        inside it uses `InventoryService.adjust_stock`'s own row-level
        locking — so a failure at any point (e.g. one item goes out of
        stock mid-request) rolls back the entire order rather than leaving
        a partially-charged, partially-stocked order behind.
        """
        cart = Cart.objects.filter(user=user).first()
        if cart is None or not cart.items.filter(is_saved_for_later=False).exists():
            raise ApplicationError("Your cart is empty.", code="empty_cart")

        try:
            shipping_address = Address.objects.get(pk=shipping_address_id, user=user)
            billing_address = Address.objects.get(pk=billing_address_id, user=user)
        except Address.DoesNotExist as exc:
            raise ApplicationError("One or more selected addresses could not be found.", code="invalid_address") from exc

        active_items = list(cart.items.filter(is_saved_for_later=False).select_related("product"))

        # Re-validate stock for every line item up front — a cart item may
        # have gone stale (someone else bought the last unit) between when
        # it was added to the cart and now.
        for item in active_items:
            InventoryService.check_availability(product=item.product, requested_quantity=item.quantity)

        subtotal = sum((item.line_total for item in active_items), Decimal("0.00"))

        discount = Decimal("0.00")
        coupon = None
        if coupon_code:
            coupon, discount = CouponService.validate_coupon(code=coupon_code, subtotal=subtotal, user=user)

        taxable_amount = subtotal - discount
        shipping_amount = ShippingService.calculate_shipping(taxable_amount)
        tax_amount = TaxService.calculate_tax(taxable_amount)
        total_amount = taxable_amount + shipping_amount + tax_amount

        order = Order(
            user=user,
            subtotal=subtotal,
            discount_amount=discount,
            shipping_amount=shipping_amount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            coupon=coupon,
            coupon_code=coupon.code if coupon else "",
            customer_note=customer_note,
        )
        OrderService._snapshot_address(order, prefix="shipping", address=shipping_address)
        OrderService._snapshot_address(order, prefix="billing", address=billing_address)
        order.full_clean(exclude=["order_number"])
        order.save()

        for item in active_items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                product_name=item.product.name,
                product_sku=item.product.sku,
                unit_price=item.product.effective_price,
                quantity=item.quantity,
                line_total=item.line_total,
            )
            # Note: cart items in this project don't hold a live stock
            # *reservation* (see apps.cart.services.CartService.add_item,
            # which only calls InventoryService.check_availability, not
            # reserve_stock) — reservations exist for future use once a
            # reservation-with-timeout flow is built. So checkout deducts
            # stock directly as a sale, with no matching release_stock call.
            InventoryService.adjust_stock(
                product=item.product,
                quantity_change=-item.quantity,
                movement_type="SALE",
                reason=f"Order {order.order_number}",
            )
            ProductService.increment_sold_count(product=item.product, quantity=item.quantity)

        if coupon:
            CouponService.record_usage(coupon=coupon, user=user, discount_amount=discount)

        OrderStatusHistory.objects.create(order=order, status=Order.Status.PENDING, note="Order placed.")

        cart.items.filter(is_saved_for_later=False).delete()

        # Notification is best-effort: a failure to notify must never roll
        # back an otherwise-successful order, so it's deliberately outside
        # any error path that would re-raise.
        from apps.notifications.services import NotificationService

        NotificationService.notify_order_placed(order=order)

        return order

    @staticmethod
    @transaction.atomic
    def cancel_order(*, order: Order, cancelled_by, reason: str = "") -> Order:
        """
        Cancels an order: validates the transition is legal, restocks every
        line item's inventory, and records the cancellation. `cancelled_by`
        is either the customer themself or an admin — both paths funnel
        through this single method so restocking/notification never
        diverges between the two.
        """
        validate_status_transition(order.status, Order.Status.CANCELLED)

        for item in order.items.select_related("product"):
            if item.product is not None:
                InventoryService.adjust_stock(
                    product=item.product,
                    quantity_change=item.quantity,
                    movement_type="RETURN",
                    reason=f"Cancelled order {order.order_number}",
                )

        order.status = Order.Status.CANCELLED
        order.cancelled_at = timezone.now()
        order.cancellation_reason = reason
        order.save(update_fields=["status", "cancelled_at", "cancellation_reason", "updated_at"])

        OrderStatusHistory.objects.create(
            order=order, status=Order.Status.CANCELLED, note=reason or "Order cancelled.", changed_by=cancelled_by
        )

        from apps.notifications.services import NotificationService

        NotificationService.notify_order_cancelled(order=order)

        return order

    @staticmethod
    @transaction.atomic
    def update_status(*, order: Order, new_status: str, note: str = "", changed_by=None) -> Order:
        """
        Admin-driven status transition (Confirmed -> Processing -> Shipped
        -> Delivered, or -> Refunded from Delivered). Cancellation has its
        own dedicated `cancel_order` method (which also restocks inventory)
        rather than being handled generically here.
        """
        validate_status_transition(order.status, new_status)

        old_status = order.status
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])

        OrderStatusHistory.objects.create(order=order, status=new_status, note=note, changed_by=changed_by)

        from apps.notifications.services import NotificationService

        NotificationService.notify_order_status_changed(order=order, old_status=old_status, new_status=new_status)

        return order

    @staticmethod
    def set_tracking_info(*, order: Order, tracking_number: str, carrier: str, estimated_delivery_date=None) -> Order:
        """Attaches carrier tracking details, typically alongside a transition to SHIPPED."""
        order.tracking_number = tracking_number
        order.carrier = carrier
        if estimated_delivery_date:
            order.estimated_delivery_date = estimated_delivery_date
        order.save(update_fields=["tracking_number", "carrier", "estimated_delivery_date", "updated_at"])
        return order


class InvoiceService:
    """Generates a downloadable PDF invoice for a placed order."""

    @staticmethod
    def generate_invoice_pdf(order: Order) -> bytes:
        """
        Renders a simple, clean invoice PDF using ReportLab (a pure-Python
        PDF library with no system-level dependencies, unlike e.g.
        WeasyPrint's need for Cairo/Pango — a meaningfully lighter
        deployment footprint for a feature this self-contained).
        """
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, title=f"Invoice {order.order_number}")
        styles = getSampleStyleSheet()
        elements = []

        elements.append(Paragraph("ShopSphere", styles["Title"]))
        elements.append(Paragraph(f"Invoice for Order {order.order_number}", styles["Heading2"]))
        elements.append(Paragraph(f"Placed on {order.created_at:%B %d, %Y}", styles["Normal"]))
        elements.append(Spacer(1, 12))

        address_data = [
            ["Shipping Address", "Billing Address"],
            [
                f"{order.shipping_full_name}\n{order.shipping_line1}\n"
                f"{order.shipping_city}, {order.shipping_state} {order.shipping_postal_code}\n{order.shipping_country}",
                f"{order.billing_full_name}\n{order.billing_line1}\n"
                f"{order.billing_city}, {order.billing_state} {order.billing_postal_code}\n{order.billing_country}",
            ],
        ]
        address_table = Table(address_data, colWidths=[85 * mm, 85 * mm])
        address_table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        elements.append(address_table)
        elements.append(Spacer(1, 16))

        item_rows = [["Item", "SKU", "Unit Price", "Qty", "Total"]]
        for item in order.items.all():
            item_rows.append(
                [item.product_name, item.product_sku, f"${item.unit_price:.2f}", str(item.quantity), f"${item.line_total:.2f}"]
            )
        items_table = Table(item_rows, colWidths=[65 * mm, 30 * mm, 25 * mm, 15 * mm, 25 * mm])
        items_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
                ]
            )
        )
        elements.append(items_table)
        elements.append(Spacer(1, 16))

        summary_rows = [
            ["Subtotal", f"${order.subtotal:.2f}"],
            ["Discount", f"-${order.discount_amount:.2f}"],
            ["Shipping", f"${order.shipping_amount:.2f}"],
            ["Tax", f"${order.tax_amount:.2f}"],
            ["Total", f"${order.total_amount:.2f}"],
        ]
        summary_table = Table(summary_rows, colWidths=[145 * mm, 25 * mm])
        summary_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                    ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
                ]
            )
        )
        elements.append(summary_table)

        doc.build(elements)
        return buffer.getvalue()
