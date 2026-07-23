"""URL configuration for the analytics app. Mounted at /api/v1/analytics/."""

from django.urls import path

from . import views

app_name = "analytics"

urlpatterns = [
    path("dashboard/", views.DashboardStatsView.as_view(), name="dashboard-stats"),
    path("revenue/", views.RevenueAnalyticsView.as_view(), name="revenue-analytics"),
    path("order-trends/", views.OrderTrendsView.as_view(), name="order-trends"),
    path("top-products/", views.TopProductsView.as_view(), name="top-products"),
    path("recent-orders/", views.RecentOrdersView.as_view(), name="recent-orders"),
]
