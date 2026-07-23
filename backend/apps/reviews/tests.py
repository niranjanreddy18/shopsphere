"""Tests for the reviews app: models, services, and API endpoints."""

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.products.models import Category, Product
from core.exceptions import ApplicationError

from .models import Review
from .services import ReviewService


def _make_user(email="user@example.com"):
    return User.objects.create_user(email=email, password="StrongPass1!", first_name="A", last_name="B")


def _make_product():
    category = Category.objects.create(name="Cat")
    return Product.objects.create(name="Widget", category=category, sku="SKU-REV", price="10.00")


class ReviewServiceTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.product = _make_product()

    def test_create_review(self):
        review = ReviewService.create_review(user=self.user, product=self.product, rating=5, comment="Great!")
        self.assertEqual(review.rating, 5)

    def test_duplicate_review_raises(self):
        ReviewService.create_review(user=self.user, product=self.product, rating=5)
        with self.assertRaises(ApplicationError):
            ReviewService.create_review(user=self.user, product=self.product, rating=3)

    def test_set_approval(self):
        review = ReviewService.create_review(user=self.user, product=self.product, rating=4)
        ReviewService.set_approval(review=review, is_approved=False)
        review.refresh_from_db()
        self.assertFalse(review.is_approved)


class ReviewAPITests(APITestCase):
    def setUp(self):
        self.user = _make_user()
        self.admin = User.objects.create_superuser(email="admin@example.com", password="StrongPass1!", first_name="A", last_name="D")
        self.product = _make_product()
        self.client.force_authenticate(user=self.user)

    def test_create_review_via_api(self):
        response = self.client.post(reverse("reviews:review-create"), {"product_id": str(self.product.id), "rating": 5, "comment": "Nice"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_product_review_list_only_shows_approved(self):
        approved = Review.objects.create(product=self.product, user=self.user, rating=5, is_approved=True)
        other_user = _make_user(email="hidden@example.com")
        Review.objects.create(product=self.product, user=other_user, rating=1, is_approved=False)

        response = self.client.get(reverse("reviews:product-review-list", args=[self.product.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_non_admin_cannot_access_admin_review_list(self):
        response = self.client.get(reverse("reviews:admin-review-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_moderate_review(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=1, comment="spam")
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(reverse("reviews:admin-review-approval", args=[review.id]), {"is_approved": False})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_approved"])

    def test_owner_can_delete_own_review(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=3)
        response = self.client.delete(reverse("reviews:review-delete", args=[review.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_other_user_cannot_delete_review(self):
        other_user = _make_user(email="notmine@example.com")
        review = Review.objects.create(product=self.product, user=other_user, rating=3)
        response = self.client.delete(reverse("reviews:review-delete", args=[review.id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_testimonials_only_includes_high_rated_reviews_with_comments(self):
        Review.objects.create(product=self.product, user=self.user, rating=5, comment="Excellent!")
        low_rated_user = _make_user(email="lowrated@example.com")
        Review.objects.create(product=self.product, user=low_rated_user, rating=2, comment="Not great.")
        no_comment_user = _make_user(email="nocomment@example.com")
        Review.objects.create(product=self.product, user=no_comment_user, rating=5, comment="")

        response = self.client.get(reverse("reviews:testimonials"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["comment"], "Excellent!")

    def test_testimonials_excludes_unapproved_reviews(self):
        Review.objects.create(product=self.product, user=self.user, rating=5, comment="Great!", is_approved=False)

        response = self.client.get(reverse("reviews:testimonials"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_testimonials_is_public(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("reviews:testimonials"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
