#!/bin/bash
# =============================================================================
# Container entrypoint — runs once, every time the backend container starts,
# before handing off to the Dockerfile's CMD (gunicorn).
#
# Ordering matters: wait for Postgres to accept connections (container start
# order isn't guaranteed by docker-compose's `depends_on` alone), then apply
# any pending migrations, then collect static files for WhiteNoise, then
# execute whatever command was passed in (gunicorn in production, but this
# same entrypoint is reused for one-off commands like `manage.py seed_data`
# via `docker-compose run backend python manage.py seed_data`).
# =============================================================================
set -e

echo "Waiting for database..."
python manage.py wait_for_db

echo "Applying database migrations..."
python manage.py migrate --noinput
echo "passing data to database"
python manage.py seed_data

echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "Starting: $@"
exec "$@"
