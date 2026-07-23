from django.apps import AppConfig


class ReviewsConfig(AppConfig):
    """
    App configuration for the reviews domain.

    Deliberately minimal in scope for this prompt: a customer can leave one
    review per product they've purchased, and an admin can moderate
    (approve/delete) reviews via the Admin Dashboard's "Manage Reviews"
    screen. A fuller reviews feature (helpful-votes, seller responses,
    photo attachments) is out of scope here.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.reviews"
    verbose_name = "Reviews"
