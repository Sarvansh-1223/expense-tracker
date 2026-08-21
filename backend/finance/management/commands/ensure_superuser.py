"""
Creates a superuser from environment variables if one doesn't already exist.
Safe to run on every deploy - it's a no-op if the user already exists.
Configure via Render environment variables:
  DJANGO_SUPERUSER_USERNAME
  DJANGO_SUPERUSER_EMAIL
  DJANGO_SUPERUSER_PASSWORD
"""
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Creates a superuser from DJANGO_SUPERUSER_* env vars if none exists yet."

    def handle(self, *args, **options):
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")

        if not username or not password:
            self.stdout.write("DJANGO_SUPERUSER_USERNAME / DJANGO_SUPERUSER_PASSWORD not set - skipping.")
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(f"Superuser '{username}' already exists - skipping.")
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f"Created superuser '{username}'."))
