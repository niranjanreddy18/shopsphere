"""
Testing settings — SQLite in-memory DB for fast, isolated CI/local test runs.

Kept separate from development.py (which intentionally always targets
PostgreSQL) so that "does the code work" tests run instantly without
requiring a running Postgres instance, while development/production still
catch Postgres-specific issues.
"""

from .base import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # faster hashing in tests

# Tests must never depend on (or be polluted by) a real Redis instance —
# every test run gets a fresh, isolated in-process cache regardless of
# whether REDIS_URL happens to be set in the environment.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "shopsphere-test-cache",
    }
}
