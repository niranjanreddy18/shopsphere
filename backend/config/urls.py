"""
Root URL configuration.

Each domain app owns its own urls.py and is mounted under /api/v1/<app>/.
Versioning the API from day one (v1) avoids painful breaking changes later.
"""
from django.urls import re_path
from django.views.static import serve
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

api_v1_patterns = [
    path("accounts/", include("apps.accounts.urls")),
    # The following apps are scaffolded (models/urls exist) but their business
    # logic is intentionally not implemented yet — see project README.
    path("products/", include("apps.products.urls")),
    path("cart/", include("apps.cart.urls")),
    path("orders/", include("apps.orders.urls")),
    path("wishlist/", include("apps.wishlist.urls")),
    path("reviews/", include("apps.reviews.urls")),
    path("payments/", include("apps.payments.urls")),
    path("analytics/", include("apps.analytics.urls")),
    path("coupons/", include("apps.coupons.urls")),
    path("notifications/", include("apps.notifications.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1_patterns)),
    # --- API documentation (Swagger / Redoc) ---------------------------
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]


import os

def serve_media(request, path, document_root=None, show_indexes=False):
    response = serve(request, path, document_root, show_indexes)
    if response.status_code == 200:
        response["Cache-Control"] = "public, max-age=2592000"
        # Sniff actual image magic bytes to ensure correct Content-Type even when
        # file extension is legacy .jpg (e.g. optimized WebP/PNG assets)
        if document_root:
            full_path = os.path.join(document_root, path)
            try:
                with open(full_path, "rb") as f:
                    header = f.read(16)
                if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
                    response["Content-Type"] = "image/webp"
                elif header.startswith(b"\x89PNG\r\n\x1a\n"):
                    response["Content-Type"] = "image/png"
                elif header[:3] == b"\xff\xd8\xff":
                    response["Content-Type"] = "image/jpeg"
                elif b"ftypavif" in header or b"ftypmif1" in header:
                    response["Content-Type"] = "image/avif"
            except (OSError, IOError):
                pass
    return response


urlpatterns += [
    re_path(
        r"^media/(?P<path>.*)$",
        serve_media,
        {"document_root": settings.MEDIA_ROOT},
    ),
]