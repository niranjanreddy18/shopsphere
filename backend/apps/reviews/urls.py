"""URL configuration for the reviews app. Mounted at /api/v1/reviews/."""

from django.urls import path

from . import views

app_name = "reviews"

urlpatterns = [
    path("", views.CreateReviewView.as_view(), name="review-create"),
    path("testimonials/", views.TestimonialReviewListView.as_view(), name="testimonials"),
    path("product/<uuid:product_id>/", views.ProductReviewListView.as_view(), name="product-review-list"),
    path("<uuid:pk>/", views.ReviewDeleteView.as_view(), name="review-delete"),
    path("admin/", views.AdminReviewListView.as_view(), name="admin-review-list"),
    path("admin/<uuid:pk>/approval/", views.AdminReviewApprovalView.as_view(), name="admin-review-approval"),
]
