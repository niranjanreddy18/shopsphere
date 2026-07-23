"""Service layer for the reviews domain."""

from django.db import transaction

from core.exceptions import ApplicationError

from .models import Review


class ReviewService:
    """Business logic for creating and moderating reviews."""

    @staticmethod
    @transaction.atomic
    def create_review(*, user, product, rating: int, comment: str = "") -> Review:
        if Review.objects.filter(product=product, user=user).exists():
            raise ApplicationError("You've already reviewed this product.", code="duplicate_review")

        review = Review(product=product, user=user, rating=rating, comment=comment)
        review.full_clean()
        review.save()
        return review

    @staticmethod
    def set_approval(*, review: Review, is_approved: bool) -> Review:
        """Admin moderation action — approve or hide a review without deleting it outright."""
        review.is_approved = is_approved
        review.save(update_fields=["is_approved", "updated_at"])
        return review
