"""URL configuration for the products app — mounted at /api/v1/products/."""

from django.urls import path

from . import views

app_name = "products"

urlpatterns = [
    # --- Curated collections (must be registered before the slug detail
    # route so "featured"/"new-arrivals"/etc. aren't swallowed by <slug>) --
    path("featured/", views.FeaturedProductsView.as_view(), name="featured"),
    path("new-arrivals/", views.NewArrivalsView.as_view(), name="new-arrivals"),
    path("best-sellers/", views.BestSellersView.as_view(), name="best-sellers"),

    # --- Categories & brands ------------------------------------------------
    path("categories/", views.CategoryListCreateView.as_view(), name="category-list-create"),
    path("categories/<slug:slug>/", views.CategoryDetailView.as_view(), name="category-detail"),
    path("brands/", views.BrandListCreateView.as_view(), name="brand-list-create"),
    path("brands/<slug:slug>/", views.BrandDetailView.as_view(), name="brand-detail"),

    # --- Product images (admin management) -----------------------------------
    path("images/<uuid:pk>/set-primary/", views.SetPrimaryImageView.as_view(), name="image-set-primary"),
    path("images/<uuid:pk>/", views.ProductImageDetailView.as_view(), name="image-detail"),

    # --- Core product catalog -------------------------------------------------
    path("", views.ProductListCreateView.as_view(), name="product-list-create"),
    path("<slug:slug>/", views.ProductDetailView.as_view(), name="product-detail"),
    path("<slug:slug>/related/", views.RelatedProductsView.as_view(), name="product-related"),
    path("<slug:slug>/images/", views.ProductImageListCreateView.as_view(), name="product-images"),

    # --- Inventory / stock management (admin) ---------------------------------
    path("<slug:slug>/inventory/adjust/", views.InventoryAdjustView.as_view(), name="inventory-adjust"),
    path("<slug:slug>/inventory/movements/", views.StockMovementListView.as_view(), name="inventory-movements"),
]
