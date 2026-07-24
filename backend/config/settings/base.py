"""
Base settings shared by every environment (development, production, testing).

Design decision:
    We split settings into base/development/production instead of a single
    settings.py. This is a standard pattern in production Django projects
    because it keeps environment-specific configuration (DEBUG, ALLOWED_HOSTS,
    database credentials, security flags) cleanly separated and prevents
    accidentally shipping development settings to production.
"""

from datetime import timedelta
from pathlib import Path
from corsheaders.defaults import default_headers
from decouple import Csv, config
import dj_database_url 
# ------------------------------------------------------------------------------
# Base paths
# ------------------------------------------------------------------------------
# BASE_DIR points to /backend (two levels up from this file: settings/ -> config/ -> backend/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ------------------------------------------------------------------------------
# Core security settings
# ------------------------------------------------------------------------------
SECRET_KEY = config("DJANGO_SECRET_KEY", default="dev-secret-key-change-in-production")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# ------------------------------------------------------------------------------
# Application definition
# ------------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "django_filters",
]

# Every domain app is registered with its full dotted path (apps.<name>).
# AppConfig.name in each app's apps.py matches this same dotted path so that
# Django's app registry and our internal imports never disagree.
LOCAL_APPS = [
    "apps.accounts",
    "apps.products",
    "apps.cart",
    "apps.orders",
    "apps.wishlist",
    "apps.reviews",
    "apps.payments",
    "apps.analytics",
    "apps.coupons",
    "apps.notifications",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ------------------------------------------------------------------------------
# Middleware
# ------------------------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # Must sit high, before CommonMiddleware
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ------------------------------------------------------------------------------
# Database
# ------------------------------------------------------------------------------
# PostgreSQL is used in every environment (including local dev) to avoid
# "works on SQLite, breaks on Postgres" bugs (e.g. case sensitivity, JSONField
# behaviour, constraint enforcement).
DATABASE_URL = config("DATABASE_URL", default=None)

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=True,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("DB_NAME", default="ecommerce_db"),
            "USER": config("DB_USER", default="postgres"),
            "PASSWORD": config("DB_PASSWORD", default="postgres"),
            "HOST": config("DB_HOST", default="localhost"),
            "PORT": config("DB_PORT", default="5432"),
            "CONN_MAX_AGE": 60,
        }
    }

# ------------------------------------------------------------------------------
# Custom user model
# ------------------------------------------------------------------------------
# We use a custom user model from day one (email-based login instead of
# Django's default username field). Switching user models later requires a
# full database rebuild, so this is a foundational decision.
AUTH_USER_MODEL = "accounts.User"

# ------------------------------------------------------------------------------
# Password validation
# ------------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ------------------------------------------------------------------------------
# Internationalisation
# ------------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ------------------------------------------------------------------------------
# Static & media files
# ------------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ------------------------------------------------------------------------------
# Django REST Framework
# ------------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 12,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        # Tight throttle scopes on sensitive auth endpoints to slow down
        # brute-force / credential-stuffing attempts.
        "login": "10/min",
        "register": "10/hour",
        "password_reset": "5/hour",
    },
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
}

# ------------------------------------------------------------------------------
# Simple JWT
# ------------------------------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

# ------------------------------------------------------------------------------
# CORS (React dev server / frontend origin)
# ------------------------------------------------------------------------------
#CORS_ALLOWED_ORIGINS = [
 #   "http://localhost:5173",
 #   "http://127.0.0.1:5173",
  #  "http://localhost:5174",
 #   "http://127.0.0.1:5174",
#]
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# The guest-cart flow (see apps/cart) mints a token and returns it via a
# custom response header. Browsers hide non-standard response headers from
# JS on cross-origin requests unless the server explicitly whitelists them
# here — without this, axios would never be able to read X-Cart-Token.
CORS_EXPOSE_HEADERS = ["X-Cart-Token"]
CORS_ALLOW_HEADERS = list(default_headers) + [
    "x-cart-token",
]
# ------------------------------------------------------------------------------
# drf-spectacular (Swagger / OpenAPI documentation)
# ------------------------------------------------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "E-Commerce Platform API",
    "DESCRIPTION": "Production-grade REST API for a full-stack e-commerce platform.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    # Note: Order.Status and Payment.Status both have a field literally
    # named "status", which drf-spectacular auto-names "StatusEnum" for
    # both, producing a harmless cosmetic naming collision warning
    # ("StatusCc0Enum") during schema generation — the generated schema
    # itself is fully correct either way, and resolving it via
    # ENUM_NAME_OVERRIDES requires a statically-importable choices
    # constant, which would mean importing app models at settings-module
    # load time (before the app registry is ready) — not worth that
    # fragility for a purely cosmetic component name.
}

# ------------------------------------------------------------------------------
# Email (mock backend by default — prints to console instead of sending)
# ------------------------------------------------------------------------------
EMAIL_BACKEND = config(
    "EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend"
)
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@ecommerce-platform.com")

# ------------------------------------------------------------------------------
# Frontend URL (used to build password-reset / email-verification links)
# ------------------------------------------------------------------------------
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:5173")

# ------------------------------------------------------------------------------
# Stripe (test mode)
# ------------------------------------------------------------------------------
# All three keys are Stripe *test-mode* keys (sk_test_/pk_test_/whsec_test_
# prefixes) — see the Payments module README section for how to obtain
# them from the Stripe dashboard and wire up the CLI for local webhook
# forwarding. Never put live keys in this project.
STRIPE_SECRET_KEY = config("STRIPE_SECRET_KEY", default="sk_test_placeholder")
STRIPE_PUBLISHABLE_KEY = config("STRIPE_PUBLISHABLE_KEY", default="pk_test_placeholder")
STRIPE_WEBHOOK_SECRET = config("STRIPE_WEBHOOK_SECRET", default="whsec_test_placeholder")
STRIPE_CURRENCY = config("STRIPE_CURRENCY", default="usd")

# ------------------------------------------------------------------------------
# Caching (Redis)
# ------------------------------------------------------------------------------
# Falls back to Django's in-process LocMemCache when REDIS_URL is unset, so
# `python manage.py runserver` works out of the box with zero external
# dependencies — Redis only becomes required once REDIS_URL is configured
# (as docker-compose.yml does for the containerised stack). See the
# README's "Caching Strategy" section for what's cached and why.
REDIS_URL = config("REDIS_URL", default="")

if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                # A Redis outage should degrade the app to "slower", not
                # "broken" — cache reads/writes fail silently rather than
                # raising 500s when Redis is unreachable.
                "IGNORE_EXCEPTIONS": True,
            },
            "TIMEOUT": 300,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "shopsphere-local-cache",
        }
    }

# ------------------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} — {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "apps": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
    },
}
