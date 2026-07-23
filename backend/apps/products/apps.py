from django.apps import AppConfig


class ProductsConfig(AppConfig):
    """
    App configuration for the products domain: Category, Brand, Product,
    ProductImage, Inventory, and StockMovement.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.products"
    verbose_name = "Products & Catalog"
