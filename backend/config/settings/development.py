"""
Development settings.

Activated via: DJANGO_SETTINGS_MODULE=config.settings.development
"""

from .base import *  # noqa: F401,F403

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Verbose SQL logging is useful during development but far too noisy (and a
# security concern) in production, so it lives only in this file.
LOGGING["loggers"]["django.db.backends"] = {  # noqa: F405
    "handlers": ["console"],
    "level": "INFO",
    "propagate": False,
}
