# =============================================================================
# Backend Dockerfile — multi-stage build for the Django API.
#
# Stage 1 (builder) installs Python dependencies into a virtualenv-like
# layer; Stage 2 (runtime) copies only that installed environment plus the
# application code into a slim final image, so build tools (gcc, headers
# needed to compile psycopg2/Pillow) never ship in the production image.
# =============================================================================

# --- Stage 1: builder ---------------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /app

# System packages required only to *build* Python packages with C
# extensions (psycopg2, Pillow, reportlab) — not needed at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# --- Stage 2: runtime -----------------------------------------------------
FROM python:3.12-slim AS runtime

# libpq5 is the *runtime* Postgres client library (vs. libpq-dev's headers
# needed only to build psycopg2) — the minimal package this image actually
# needs to talk to Postgres.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash appuser

WORKDIR /app

COPY --from=builder /root/.local /home/appuser/.local
COPY . .

RUN mkdir -p /app/staticfiles /app/media \
    && chown -R appuser:appuser /app /home/appuser/.local

USER appuser
ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60"]
