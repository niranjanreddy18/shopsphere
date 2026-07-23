"""
Production settings.

Activated via: DJANGO_SETTINGS_MODULE=config.settings.production

Design decision:
    Production hardens security flags that are unnecessary (or actively
    inconvenient) during local development: forced HTTPS, secure cookies,
    HSTS, and a strict ALLOWED_HOSTS list sourced from the environment.
"""

from decouple import Csv, config

from .base import *  # noqa: F401,F403

DEBUG = False

ALLOWED_HOSTS = config("ALLOWED_HOSTS", cast=Csv())

# --- HTTPS / transport security -----------------------------------------
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

# CORS must be an explicit allow-list in production — no wildcards.
CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", cast=Csv())

# ------------------------------------------------------------------------------
# Static files (WhiteNoise)
# ------------------------------------------------------------------------------
# WhiteNoise lets the Django/gunicorn process itself serve static files
# efficiently (compressed, cache-busted via hashed filenames) without
# needing a separate nginx/CDN static-file layer just to get started — a
# reverse proxy or CDN can still be layered in front later without any
# application code changes, since WhiteNoise is just middleware.
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    *MIDDLEWARE[1:],  # everything else from base.py, unchanged
]
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ------------------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------------------
# Production logs structured, single-line records to stdout (picked up by
# whatever the deployment platform's log aggregator is — Docker, ECS,
# Kubernetes, Heroku, etc. all expect stdout/stderr, not a log file on
# disk) rather than the verbose multi-line format used in development.
LOGGING["formatters"]["production"] = {
    "format": '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
}
LOGGING["handlers"]["console"]["formatter"] = "production"
LOGGING["root"]["level"] = "INFO"
