"""
API views for the analytics domain.

Every view here is a thin GET wrapper around AnalyticsService — no
business logic lives in this module, matching the pattern used everywhere
else in the project.
"""

from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.serializers import OrderListSerializer
from core.permissions import IsAdmin

from .serializers import (
    DashboardStatsSerializer,
    OrderTrendPointSerializer,
    RevenueAnalyticsPointSerializer,
    TopProductSerializer,
)
from .services import AnalyticsService


class DashboardStatsView(APIView):
    """GET /api/v1/analytics/dashboard/ — top-line KPI tiles (admin only)."""

    permission_classes = [IsAdmin]

    # These aggregate queries (Sum/Count across the whole orders table) are
    # the most expensive reads in the app; a short cache dramatically cuts
    # database load on a dashboard that admins tend to leave open and
    # revisit/refresh often, at the cost of up to CACHE_TTL staleness — an
    # acceptable trade-off for a KPI tile, not for placing an order.
    @method_decorator(cache_page(60))
    @extend_schema(responses=DashboardStatsSerializer)
    def get(self, request):
        return Response(AnalyticsService.get_dashboard_stats())


class RevenueAnalyticsView(APIView):
    """GET /api/v1/analytics/revenue/?months=6 — monthly revenue series (admin only)."""

    permission_classes = [IsAdmin]

    @extend_schema(
        parameters=[OpenApiParameter("months", int, description="Number of trailing months to include (default 6).")],
        responses=RevenueAnalyticsPointSerializer(many=True),
    )
    @method_decorator(cache_page(60))
    def get(self, request):
        months = int(request.query_params.get("months", 6))
        return Response(AnalyticsService.get_revenue_analytics(months=months))


class OrderTrendsView(APIView):
    """GET /api/v1/analytics/order-trends/?days=30 — daily order volume series (admin only)."""

    permission_classes = [IsAdmin]

    @extend_schema(
        parameters=[OpenApiParameter("days", int, description="Number of trailing days to include (default 30).")],
        responses=OrderTrendPointSerializer(many=True),
    )
    @method_decorator(cache_page(60))
    def get(self, request):
        days = int(request.query_params.get("days", 30))
        return Response(AnalyticsService.get_order_trends(days=days))


class TopProductsView(APIView):
    """GET /api/v1/analytics/top-products/?limit=10&days=30 — best sellers by units/revenue (admin only)."""

    permission_classes = [IsAdmin]

    @extend_schema(
        parameters=[
            OpenApiParameter("limit", int, description="Max products to return (default 10)."),
            OpenApiParameter("days", int, description="Restrict to the last N days (omit for all-time)."),
        ],
        responses=TopProductSerializer(many=True),
    )
    @method_decorator(cache_page(60))
    def get(self, request):
        limit = int(request.query_params.get("limit", 10))
        days = request.query_params.get("days")
        return Response(AnalyticsService.get_top_products(limit=limit, days=int(days) if days else None))


class RecentOrdersView(APIView):
    """GET /api/v1/analytics/recent-orders/?limit=10 — latest orders across all customers (admin only)."""

    permission_classes = [IsAdmin]

    @extend_schema(
        parameters=[OpenApiParameter("limit", int, description="Max orders to return (default 10).")],
        responses=OrderListSerializer(many=True),
    )
    def get(self, request):
        limit = int(request.query_params.get("limit", 10))
        orders = AnalyticsService.get_recent_orders(limit=limit)
        return Response(OrderListSerializer(orders, many=True).data)
