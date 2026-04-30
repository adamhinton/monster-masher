#!/usr/bin/env python
"""
Django's command-line utility for administrative tasks.

Loads environment variables from backend/.env before Django setup so that
local development works without manually exporting env vars in the shell.
load_dotenv() is a no-op if the .env file does not exist, so this is safe
in production on Render where env vars are set through the dashboard.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv


def main():
    """Run administrative tasks."""
    load_dotenv(Path(__file__).resolve().parent / ".env")
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
