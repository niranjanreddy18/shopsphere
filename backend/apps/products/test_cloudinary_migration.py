"""
Tests for Cloudinary media migration and safe storage URL resolution.

Covers:
- Special character handling for Bags & Travel.jpg, Beauty & Personal Care.jpg, Home & Kitchen.jpg
- Normal category filename handling (Laptops.jpg, Audio Devices.jpg, Men's Fashion.jpg)
- Product image handling
- Site banner handling
- Collision prevention and validation
- Test artifact exclusion (categories/2026/07/, categories/2026/09/)
- Idempotency and repeated migration behavior (with mocked Cloudinary calls)
"""

from unittest.mock import MagicMock, patch
from pathlib import Path
import os
import shutil

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.conf import settings

from apps.products.models import Category, Product, ProductImage, SiteConfiguration
from core.storage import (
    clean_media_path,
    to_cloudinary_public_id,
    verify_no_collisions,
    MediaCollisionError,
    SafeMediaCloudinaryStorage,
)
from apps.products.management.commands.migrate_media_to_cloudinary import is_test_artifact


@override_settings(
    CLOUDINARY_STORAGE={
        "CLOUD_NAME": "test-cloud",
        "API_KEY": "test-key",
        "API_SECRET": "test-secret",
        "SECURE": True,
        "PREFIX": "media",
    }
)
class CloudinaryMediaStorageTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        import cloudinary
        cloudinary.config(
            cloud_name="test-cloud",
            api_key="test-key",
            api_secret="test-secret",
            secure=True,
        )
        cls.storage = SafeMediaCloudinaryStorage()

    def test_bags_and_travel_mapping_and_url(self):
        rel_path = "categories/Bags & Travel.jpg"
        public_id = to_cloudinary_public_id(rel_path, prefix="media")
        self.assertEqual(public_id, "media/categories/Bags and Travel")

        url = self.storage.url(rel_path)
        self.assertIn("media/categories/Bags%20and%20Travel.jpg", url)
        self.assertNotIn("%26", url)

    def test_beauty_personal_care_mapping_and_url(self):
        rel_path = "categories/Beauty & Personal Care.jpg"
        public_id = to_cloudinary_public_id(rel_path, prefix="media")
        self.assertEqual(public_id, "media/categories/Beauty and Personal Care")

        url = self.storage.url(rel_path)
        self.assertIn("media/categories/Beauty%20and%20Personal%20Care.jpg", url)
        self.assertNotIn("%26", url)

    def test_home_and_kitchen_mapping_and_url(self):
        rel_path = "categories/Home & Kitchen.jpg"
        public_id = to_cloudinary_public_id(rel_path, prefix="media")
        self.assertEqual(public_id, "media/categories/Home and Kitchen")

        url = self.storage.url(rel_path)
        self.assertIn("media/categories/Home%20and%20Kitchen.jpg", url)
        self.assertNotIn("%26", url)

    def test_normal_category_filename(self):
        rel_path = "categories/Laptops.jpg"
        public_id = to_cloudinary_public_id(rel_path, prefix="media")
        self.assertEqual(public_id, "media/categories/Laptops")

        url = self.storage.url(rel_path)
        self.assertIn("media/categories/Laptops.jpg", url)

    def test_category_with_spaces_and_apostrophes(self):
        # Audio Devices.jpg (spaces)
        audio_pid = to_cloudinary_public_id("categories/Audio Devices.jpg", prefix="media")
        self.assertEqual(audio_pid, "media/categories/Audio Devices")
        audio_url = self.storage.url("categories/Audio Devices.jpg")
        self.assertIn("media/categories/Audio%20Devices.jpg", audio_url)

        # Men's Fashion.jpg (spaces and apostrophe)
        mens_pid = to_cloudinary_public_id("categories/Men's Fashion.jpg", prefix="media")
        self.assertEqual(mens_pid, "media/categories/Men's Fashion")
        mens_url = self.storage.url("categories/Men's Fashion.jpg")
        self.assertTrue("media/categories/Men%27s%20Fashion.jpg" in mens_url or "media/categories/Men's%20Fashion.jpg" in mens_url)

    def test_product_image_mapping_and_url(self):
        rel_path = "products/smartphones/apple_iphone_16_pro/front.jpg"
        public_id = to_cloudinary_public_id(rel_path, prefix="media")
        self.assertEqual(public_id, "media/products/smartphones/apple_iphone_16_pro/front")

        url = self.storage.url(rel_path)
        self.assertIn("media/products/smartphones/apple_iphone_16_pro/front.jpg", url)

    def test_banner_mapping_and_url(self):
        rel_path = "site/banner/banner.webp"
        public_id = to_cloudinary_public_id(rel_path, prefix="media")
        self.assertEqual(public_id, "media/site/banner/banner")

        url = self.storage.url(rel_path)
        self.assertIn("media/site/banner/banner.webp", url)

    def test_category_database_record_preservation(self):
        # Create a category with literal DB path containing spaces and '&'
        cat = Category.objects.create(
            name="Bags & Travel",
            slug="bags-travel",
            image="categories/Bags & Travel.jpg"
        )
        cat.refresh_from_db()
        # Verify logical DB path is strictly preserved
        self.assertEqual(cat.image.name, "categories/Bags & Travel.jpg")
        # Verify URL resolution resolves safely without changing the DB record
        url = self.storage.url(cat.image.name)
        self.assertIn("media/categories/Bags%20and%20Travel.jpg", url)
        self.assertEqual(cat.image.name, "categories/Bags & Travel.jpg")


class CollisionPreventionTests(TestCase):
    def test_collision_detected_and_raises(self):
        # Two distinct filenames that would map to the same Cloudinary public ID
        colliding_files = [
            "categories/Bags & Travel.jpg",
            "categories/Bags and Travel.jpg",
        ]
        with self.assertRaises(MediaCollisionError) as ctx:
            verify_no_collisions(colliding_files, prefix="media")

        self.assertIn("collision detected", str(ctx.exception).lower())

    def test_production_media_has_zero_collisions(self):
        media_root = Path(settings.MEDIA_ROOT)
        production_files = []
        if media_root.exists():
            for root, _, files in os.walk(media_root):
                for f in sorted(files):
                    rel = (Path(root) / f).relative_to(media_root).as_posix()
                    if not is_test_artifact(rel):
                        production_files.append(rel)

        # Must verify without raising any MediaCollisionError
        mapping = verify_no_collisions(production_files, prefix="media")
        self.assertEqual(len(mapping), len(production_files))


class TestArtifactExclusionTests(TestCase):
    def test_unreferenced_test_artifact_excluded(self):
        self.assertTrue(is_test_artifact("categories/2026/07/electronics.png"))
        self.assertTrue(is_test_artifact("categories/2026/09/electronics.png"))
        self.assertTrue(is_test_artifact("categories/2026/09/electronics_4L7gMce.png"))

    def test_referenced_category_not_excluded(self):
        Category.objects.create(
            name="Referenced Cat",
            slug="referenced-cat",
            image="categories/2026/09/real_image.png"
        )
        self.assertFalse(is_test_artifact("categories/2026/09/real_image.png"))

    def test_regular_category_not_excluded(self):
        self.assertFalse(is_test_artifact("categories/Bags & Travel.jpg"))
        self.assertFalse(is_test_artifact("categories/Laptops.jpg"))
        self.assertFalse(is_test_artifact("products/laptops/front.jpg"))
        self.assertFalse(is_test_artifact("site/banner/banner.webp"))


class MigrationCommandIdempotencyTests(TestCase):
    @override_settings(
        CLOUDINARY_STORAGE={
            "CLOUD_NAME": "test-cloud",
            "API_KEY": "test-key",
            "API_SECRET": "test-secret",
        }
    )
    @patch.dict(os.environ, {
        "CLOUDINARY_CLOUD_NAME": "test-cloud",
        "CLOUDINARY_API_KEY": "test-key",
        "CLOUDINARY_API_SECRET": "test-secret",
    })
    @patch("cloudinary.uploader.upload")
    @patch("cloudinary.api.resource")
    def test_migration_and_idempotent_re_run(self, mock_api_resource, mock_upload):
        import cloudinary.exceptions
        mock_upload.return_value = {
            "public_id": "media/categories/Bags and Travel",
            "secure_url": "https://res.cloudinary.com/test-cloud/image/upload/v1/media/categories/Bags%20and%20Travel.jpg",
        }

        # First run: resource() raises NotFound for assets, so they get uploaded
        mock_api_resource.side_effect = cloudinary.exceptions.NotFound("Not found")

        call_command("migrate_media_to_cloudinary")
        self.assertTrue(mock_upload.called)

        # Inspect upload calls to confirm safe public_id was used for special characters
        uploaded_public_ids = [call.kwargs.get("public_id") for call in mock_upload.call_args_list]
        self.assertIn("media/categories/Bags and Travel", uploaded_public_ids)
        self.assertIn("media/categories/Beauty and Personal Care", uploaded_public_ids)
        self.assertIn("media/categories/Home and Kitchen", uploaded_public_ids)
        self.assertIn("media/categories/Laptops", uploaded_public_ids)
        self.assertIn("media/site/banner/banner", uploaded_public_ids)

        # Confirm that no public_id contains forbidden '&'
        for pid in uploaded_public_ids:
            self.assertNotIn("&", pid)

        # Second run (repeated migration without --overwrite):
        # Now mock_api_resource succeeds (assets already exist on Cloudinary)
        mock_upload.reset_mock()
        mock_api_resource.side_effect = None
        mock_api_resource.return_value = {"public_id": "media/categories/Bags and Travel"}

        call_command("migrate_media_to_cloudinary")
        # Idempotent: should NOT call upload because all assets already exist!
        mock_upload.assert_not_called()
