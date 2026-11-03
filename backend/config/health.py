"""
Health check endpoint for liveness and readiness probes.

Used by container orchestrators (Docker, Kubernetes, Render, AWS ECS)
to determine if the application is healthy and able to serve traffic.
"""

import logging
from django.db import connection
from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger("apps")


def health_check(request):
    """
    Checks database and cache connectivity.
    Returns 200 OK if critical services are responsive, 503 Service Unavailable otherwise.
    """
    services = {
        "database": "unknown",
        "cache": "unknown",
    }
    healthy = True

    # Check Database
    try:
        connection.ensure_connection()
        services["database"] = "healthy"
    except Exception as exc:
        logger.error("Health check: database connection failed: %s", exc)
        services["database"] = "unhealthy"
        healthy = False

    # Check Cache (degraded if unavailable, but app may still serve traffic)
    try:
        cache.set("__health_check__", "ok", 5)
        if cache.get("__health_check__") == "ok":
            services["cache"] = "healthy"
        else:
            services["cache"] = "degraded"
    except Exception as exc:
        logger.warning("Health check: cache connection degraded: %s", exc)
        services["cache"] = "degraded"

    http_status = 200 if healthy else 503
    return JsonResponse(
        {
            "status": "healthy" if healthy else "unhealthy",
            "services": services,
        },
        status=http_status,
    )
