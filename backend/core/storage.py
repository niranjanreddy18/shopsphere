"""
Custom media storage implementation for safe Cloudinary integration.

Ensures deterministic, collision-free Cloudinary public IDs and URL resolution
for filenames containing spaces, '&', apostrophes, and other special characters,
while preserving original database values and backwards compatibility with
existing migrated assets.
"""

from __future__ import annotations

import os
import re
from typing import Dict, Iterable, List

from django.conf import settings
from django.core.files.storage import Storage

# Ensure cloudinary_storage can be safely loaded even in dev/test without crash
if not hasattr(settings, "CLOUDINARY_STORAGE"):
    setattr(
        settings,
        "CLOUDINARY_STORAGE",
        {
            "CLOUD_NAME": os.environ.get("CLOUDINARY_CLOUD_NAME", "placeholder"),
            "API_KEY": os.environ.get("CLOUDINARY_API_KEY", "placeholder"),
            "API_SECRET": os.environ.get("CLOUDINARY_API_SECRET", "placeholder"),
        },
    )

from cloudinary_storage.storage import MediaCloudinaryStorage


def clean_media_path(path: str) -> str:
    """
    Safely normalizes media path so that invalid Cloudinary characters (such as '&')
    are deterministically converted while preserving valid characters and directory structure.

    Specifically:
    - ' & ' -> ' and '
    - Isolated '&' -> 'and'
    - Forbidden Cloudinary characters (?, #, %, <, >, +, \\) are removed.
    - Multiple consecutive spaces are normalized to a single space.
    - Path components have leading/trailing whitespace stripped.
    """
    if not path:
        return path

    normalized = str(path).replace("\\", "/")
    dirname, filename = os.path.split(normalized)
    root, ext = os.path.splitext(filename)

    clean_root = root.replace(" & ", " and ").replace("&", "and")
    for ch in ["?", "#", "%", "<", ">", "+", "\\"]:
        clean_root = clean_root.replace(ch, "")
    clean_root = " ".join(clean_root.split())

    clean_filename = f"{clean_root}{ext}" if ext else clean_root
    if dirname:
        parts = [p.strip() for p in dirname.split("/") if p.strip()]
        clean_parts = []
        for part in parts:
            p = part.replace(" & ", " and ").replace("&", "and")
            for ch in ["?", "#", "%", "<", ">", "+", "\\"]:
                p = p.replace(ch, "")
            clean_parts.append(" ".join(p.split()))
        return f"{'/'.join(clean_parts)}/{clean_filename}"
    return clean_filename


def to_cloudinary_public_id(rel_path: str, prefix: str = "media") -> str:
    """
    Determines the deterministic Cloudinary public_id for a relative media path.
    Strips file extension (Cloudinary standard for image resources) and prepends prefix.
    """
    clean_path = clean_media_path(rel_path)
    base_rel, _ = os.path.splitext(clean_path)
    prefix_clean = prefix.strip("/")
    if prefix_clean:
        return f"{prefix_clean}/{base_rel.lstrip('/')}"
    return base_rel.lstrip("/")


class MediaCollisionError(ValueError):
    """Raised when two distinct source media files map to the same Cloudinary public ID."""
    pass


def verify_no_collisions(rel_paths: Iterable[str], prefix: str = "media") -> Dict[str, str]:
    """
    Verifies that no two distinct file paths map to the same Cloudinary public ID.
    Returns mapping of {public_id: source_path}.
    Raises MediaCollisionError if a collision is detected.
    """
    seen: Dict[str, str] = {}
    for path in rel_paths:
        pid = to_cloudinary_public_id(path, prefix=prefix)
        if pid in seen and seen[pid] != path:
            raise MediaCollisionError(
                f"Cloudinary public_id collision detected: '{path}' and '{seen[pid]}' "
                f"both map to public_id '{pid}'."
            )
        seen[pid] = path
    return seen


class SafeMediaCloudinaryStorage(MediaCloudinaryStorage):
    """
    Production media storage for Cloudinary.
    Normalizes filenames containing unsupported characters like '&' into safe,
    deterministic Cloudinary public IDs while leaving existing database records unchanged.
    """

    def _get_url(self, name: str) -> str:
        clean_name = clean_media_path(name)
        return super()._get_url(clean_name)

    def url(self, name: str) -> str:
        clean_name = clean_media_path(name)
        return super().url(clean_name)

    def delete(self, name: str) -> bool:
        clean_name = clean_media_path(name)
        return super().delete(clean_name)

    def _upload(self, name: str, content):
        clean_name = clean_media_path(name)
        return super()._upload(clean_name, content)
