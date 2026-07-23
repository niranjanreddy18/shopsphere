"""
Service layer for the analytics domain.

Design decision — live aggregation, not a pre-computed reporting table:
    Every method here runs a fresh Django ORM aggregate query against
    Order/OrderItem/Product/User on each request. For this project's scale,
    that's simpler and always-accurate (no cache-invalidation problem to
    solve). At a larger scale, a nightly-materialised summary table (or a
    proper OLAP/warehouse) would replace the heavier queries here (revenue-
    by-month, top-products) — this module is the seam where that swap would
    happen, since every call site goes through AnalyticsService rather than
    querying Order directly from a view.

"Revenue" is defined consistently across every method in this module as
the sum of `total_amount` for orders in a *paid* status — PENDING orders
(awaiting payment) and CANCELLED/REFUNDED orders are excluded, since
counting them would overstate actual money received.
"""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, F, Q, Sum
from django.db.models.functions import Coalesce, TruncDate, TruncMonth
from django.utils import timezone

from apps.accounts.models import User
from apps.orders.models import Order, OrderItem
from apps.products.models import Product

# Orders in these statuses represent money that has actually been
# collected — see module docstring.
PAID_STATUSES = [Order.Status.CONFIRMED, Order.Status.PROCESSING, Order.Status.SHIPPED, Order.Status.DELIVERED]


class AnalyticsService:
    """Read-only aggregation queries powering the Admin Dashboard and Analytics Dashboard."""

    @staticmethod
    def get_dashboard_stats() -> dict:
        """High-level KPI tiles shown at the top of the Admin Dashboard."""
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        paid_orders = Order.objects.filter(status__in=PAID_STATUSES)

        total_revenue = paid_orders.aggregate(total=Coalesce(Sum("total_amount"), Decimal("0")))["total"]
        revenue_this_month = paid_orders.filter(created_at__gte=month_start).aggregate(
            total=Coalesce(Sum("total_amount"), Decimal("0"))
        )["total"]

        return {
            "total_revenue": total_revenue,
            "revenue_this_month": revenue_this_month,
            "total_orders": Order.objects.count(),
            "orders_this_month": Order.objects.filter(created_at__gte=month_start).count(),
            "pending_orders_count": Order.objects.filter(status=Order.Status.PENDING).count(),
            "total_customers": User.objects.filter(role=User.Role.CUSTOMER).count(),
            "new_customers_this_month": User.objects.filter(role=User.Role.CUSTOMER, created_at__gte=month_start).count(),
            "total_products": Product.objects.filter(is_active=True).count(),
            "low_stock_count": Product.objects.filter(
                is_active=True, inventory__track_inventory=True,
                inventory__quantity__lte=F("inventory__low_stock_threshold"),
            ).count(),
        }

    @staticmethod
    def get_revenue_analytics(*, months: int = 6) -> list[dict]:
        """
        Monthly revenue + order count for the last `months` calendar
        months (oldest first) — the data series behind the "Monthly Sales"
        chart.
        """
        now = timezone.now()
        # First day of the month `months - 1` months ago, so the range is
        # inclusive of the current month.
        start_month = (now.replace(day=1) - timedelta(days=30 * (months - 1))).replace(day=1)

        rows = (
            Order.objects.filter(status__in=PAID_STATUSES, created_at__gte=start_month)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(revenue=Sum("total_amount"), order_count=Count("id"))
            .order_by("month")
        )
        return [
            {"month": row["month"].strftime("%Y-%m"), "revenue": row["revenue"], "order_count": row["order_count"]}
            for row in rows
        ]

    @staticmethod
    def get_order_trends(*, days: int = 30) -> list[dict]:
        """Daily order volume + status breakdown for the last `days` days — powers the "Order Trends" chart."""
        start_date = timezone.now() - timedelta(days=days)

        rows = (
            Order.objects.filter(created_at__gte=start_date)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(
                order_count=Count("id"),
                cancelled_count=Count("id", filter=Q(status=Order.Status.CANCELLED)),
            )
            .order_by("day")
        )
        return [
            {"date": row["day"].isoformat(), "order_count": row["order_count"], "cancelled_count": row["cancelled_count"]}
            for row in rows
        ]

    @staticmethod
    def get_top_products(*, limit: int = 10, days: int | None = None) -> list[dict]:
        """
        Best-selling products by quantity sold and revenue generated,
        optionally restricted to the last `days` days (omit for
        all-time). Aggregated from OrderItem (the frozen sale-price
        snapshot — see orders/models.py) rather than Product.sold_count, so
        this can be scoped to a time window; `sold_count` alone can't be,
        since it's a running total with no date breakdown.
        """
        queryset = OrderItem.objects.filter(order__status__in=PAID_STATUSES)
        if days is not None:
            queryset = queryset.filter(order__created_at__gte=timezone.now() - timedelta(days=days))

        rows = (
            queryset.values("product_id", "product_name", "product_sku")
            .annotate(
                units_sold=Sum("quantity"),
                revenue=Sum(F("quantity") * F("unit_price"), output_field=DecimalField(max_digits=12, decimal_places=2)),
            )
            .order_by("-units_sold")[:limit]
        )
        return list(rows)

    @staticmethod
    def get_recent_orders(*, limit: int = 10):
        """The most recently placed orders, for the Admin Dashboard's "Recent Orders" panel."""
        return Order.objects.select_related("user").order_by("-created_at")[:limit]
