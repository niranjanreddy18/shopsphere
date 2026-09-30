"""
Management command: migrate_media_to_cloudinary.

Uploads local media files (product images, category images, brand logos, site banners)
to Cloudinary using deterministic public IDs under the configured prefix ('media/').

Features:
- Idempotent: checks if asset exists on Cloudinary or can overwrite deterministically
- Resumable: skips already migrated/verified assets or updates them safely
- Dry run support: `--dry-run` to inspect what would be uploaded without making network requests
- Safe character normalization: converts '&' and special characters to valid Cloudinary public IDs
- Collision prevention: validates that distinct source paths do not collide on the same public ID
- Test artifact exclusion: excludes non-database-referenced test artifacts (e.g. categories/2026/07/, categories/2026/09/)
- Non-destructive: NEVER deletes local files
"""

import os
import re
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from decouple import config

from core.storage import (
    to_cloudinary_public_id,
    verify_no_collisions,
    MediaCollisionError,
)


def is_test_artifact(rel_path: str) -> bool:
    """
    Identifies test-generated artifacts that should not be migrated to production Cloudinary.
    Specifically checks for dated test upload paths (categories/%Y/%m/) and verifies
    that no database record actually references them before excluding.
    """
    if re.match(r"^categories/\d{4}/\d{2}/", rel_path):
        from apps.products.models import Category
        # If not referenced in database, it's a test artifact
        if not Category.objects.filter(image=rel_path).exists():
            return True
    return False


class Command(BaseCommand):
    help = "Migrates local media assets to Cloudinary idempotently."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate the migration without uploading files to Cloudinary.",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Overwrite existing Cloudinary assets with the same public ID.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        overwrite = options["overwrite"]

        cloud_name = config("CLOUDINARY_CLOUD_NAME", default=getattr(settings, "CLOUDINARY_CLOUD_NAME", ""))
        api_key = config("CLOUDINARY_API_KEY", default=getattr(settings, "CLOUDINARY_API_KEY", ""))
        api_secret = config("CLOUDINARY_API_SECRET", default=getattr(settings, "CLOUDINARY_API_SECRET", ""))

        if not (cloud_name and api_key and api_secret):
            self.stderr.write(
                self.style.ERROR(
                    "Cloudinary credentials missing! Please configure CLOUDINARY_CLOUD_NAME, "
                    "CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment or settings."
                )
            )
            return

        import cloudinary
        import cloudinary.uploader
        import cloudinary.api
        import cloudinary.exceptions

        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True,
        )

        media_root = Path(settings.MEDIA_ROOT)
        if not media_root.exists():
            self.stdout.write(self.style.WARNING(f"MEDIA_ROOT does not exist at {media_root}"))
            return

        prefix = "media"
        all_found = []
        for root, _, files in os.walk(media_root):
            for f in sorted(files):
                full_path = Path(root) / f
                rel_path = full_path.relative_to(media_root).as_posix()
                all_found.append((full_path, rel_path))

        self.stdout.write(self.style.SUCCESS(f"Found {len(all_found)} total media files on disk."))

        # Filter out confirmed test artifacts
        files_to_migrate = []
        test_artifacts_skipped = 0
        for full_path, rel_path in all_found:
            if is_test_artifact(rel_path):
                self.stdout.write(
                    self.style.WARNING(f"  [EXCLUDED TEST ARTIFACT] {rel_path} (not referenced in DB)")
                )
                test_artifacts_skipped += 1
                continue
            files_to_migrate.append((full_path, rel_path))

        self.stdout.write(
            self.style.SUCCESS(
                f"Production media files to evaluate: {len(files_to_migrate)} "
                f"({test_artifacts_skipped} test artifacts excluded)."
            )
        )

        # Collision verification across all files to be migrated
        try:
            verify_no_collisions([rel_path for _, rel_path in files_to_migrate], prefix=prefix)
        except MediaCollisionError as e:
            self.stderr.write(self.style.ERROR(f"Migration aborted due to collision: {e}"))
            raise CommandError(str(e))

        if dry_run:
            self.stdout.write(self.style.WARNING("Running in DRY-RUN mode. No files will be uploaded."))

        success_count = 0
        skipped_count = 0
        failure_count = 0

        for full_path, rel_path in files_to_migrate:
            public_id = to_cloudinary_public_id(rel_path, prefix=prefix)
            self.stdout.write(f"Processing: {rel_path} -> public_id: {public_id}")

            if dry_run:
                success_count += 1
                continue

            # Idempotency: skip if already exists on Cloudinary and overwrite is not requested
            if not overwrite:
                try:
                    cloudinary.api.resource(public_id)
                    self.stdout.write(
                        self.style.SUCCESS(f"  [SKIPPED] Already exists on Cloudinary: {public_id}")
                    )
                    skipped_count += 1
                    continue
                except cloudinary.exceptions.NotFound:
                    # Not yet on Cloudinary, proceed with upload
                    pass
                except Exception:
                    # If API query fails, proceed to attempt upload
                    pass

            try:
                upload_result = cloudinary.uploader.upload(
                    str(full_path),
                    public_id=public_id,
                    overwrite=overwrite,
                    resource_type="image",
                    unique_filename=False,
                    use_filename=True,
                )
                secure_url = upload_result.get("secure_url")
                self.stdout.write(
                    self.style.SUCCESS(f"  [OK] Uploaded: {secure_url}")
                )
                success_count += 1
            except Exception as e:
                self.stderr.write(
                    self.style.ERROR(f"  [FAILED] {rel_path}: {e}")
                )
                failure_count += 1

        self.stdout.write("=" * 60)
        self.stdout.write("Migration Complete:")
        self.stdout.write(f"  Total Found: {len(all_found)}")
        self.stdout.write(f"  Test Artifacts Excluded: {test_artifacts_skipped}")
        self.stdout.write(f"  Production Evaluated: {len(files_to_migrate)}")
        self.stdout.write(f"  Successful: {success_count}")
        self.stdout.write(f"  Skipped (Already Migrated): {skipped_count}")
        self.stdout.write(f"  Failed: {failure_count}")
        self.stdout.write("=" * 60)
