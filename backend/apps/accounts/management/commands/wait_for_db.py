"""
Management command: wait_for_db.

Used as the first step of the Docker entrypoint (see backend/entrypoint.sh)
so `manage.py migrate` never races against Postgres still starting up
inside its own container. Polls with a short sleep rather than failing
fast, since container start order in docker-compose isn't otherwise
guaranteed even with `depends_on`.
"""

import time

from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = "Waits until the database is available before returning."

    def add_arguments(self, parser):
        parser.add_argument("--timeout", type=int, default=30, help="Max seconds to wait before giving up.")

    def handle(self, *args, **options):
        self.stdout.write("Waiting for database...")
        start = time.monotonic()
        db_conn = None

        while not db_conn:
            try:
                db_conn = connections["default"]
                db_conn.cursor()
            except OperationalError:
                db_conn = None
                if time.monotonic() - start > options["timeout"]:
                    self.stderr.write(self.style.ERROR("Database unavailable after timeout."))
                    raise
                self.stdout.write("Database unavailable, waiting 1 second...")
                time.sleep(1)

        self.stdout.write(self.style.SUCCESS("Database available!"))
