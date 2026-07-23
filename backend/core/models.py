"""
Shared abstract base models.

Every domain model in the platform inherits from BaseModel so that UUID
primary keys and created_at/updated_at timestamps are consistent everywhere
without repeating boilerplate in every app.
"""

import uuid

from django.db import models


class BaseModel(models.Model):
    """
    Abstract base model providing:
      - UUID primary key (instead of sequential integers) so resource IDs
        are non-guessable and safe to expose in public API responses/URLs.
      - created_at / updated_at audit timestamps.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]
