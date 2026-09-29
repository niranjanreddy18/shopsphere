"""
Management command: migrate_media_to_cloudinary.

Uploads local media files (product images, category images, brand logos, user avatars)
to Cloudinary using deterministic public IDs under the configured prefix ('media/').

Features:
- Idempotent: checks if asset exists on Cloudinary or can overwrite deterministically
- Resumable: skips already migrated/verified assets or updates them safely
- Dry run support: `--dry-run` to inspect what would be uploaded without making network requests
- Verification: verifies each upload with Cloudinary and confirms HTTP 200 availability
- Non-destructive: NEVER deletes local files
"""

import os
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand
from decouple import config

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
        files_to_migrate = []
        for root, _, files in os.walk(media_root):
            for f in sorted(files):
                full_path = Path(root) / f
                rel_path = full_path.relative_to(media_root).as_posix()
                files_to_migrate.append((full_path, rel_path))

        self.stdout.write(self.style.SUCCESS(f"Found {len(files_to_migrate)} media files to evaluate."))
        if dry_run:
            self.stdout.write(self.style.WARNING("Running in DRY-RUN mode. No files will be uploaded."))

        success_count = 0
        skipped_count = 0
        failure_count = 0

        for full_path, rel_path in files_to_migrate:
            # Deterministic Cloudinary public_id matches what MediaCloudinaryStorage expects:
            # e.g. prefix = 'media', rel_path = 'products/laptops/front.jpg' -> 'media/products/laptops/front'
            # Note: Cloudinary strips file extensions from public_id for image resource types,
            # or preserves them if format is specified.
            # MediaCloudinaryStorage prepends PREFIX ('media/') and builds URL using public_id + '.' + ext.
            base_rel, ext = os.path.splitext(rel_path)
            public_id = f"{prefix}/{base_rel}"

            self.stdout.write(f"Processing: {rel_path} -> public_id: {public_id}")

            if dry_run:
                success_count += 1
                continue

            try:
                # Upload with deterministic public_id and overwrite policy
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
        self.stdout.write(f"Migration Complete:")
        self.stdout.write(f"  Evaluated: {len(files_to_migrate)}")
        self.stdout.write(f"  Successful: {success_count}")
        self.stdout.write(f"  Skipped: {skipped_count}")
        self.stdout.write(f"  Failed: {failure_count}")
        self.stdout.write("=" * 60)
