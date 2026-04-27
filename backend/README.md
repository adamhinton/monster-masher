# Purpose

This is the Django backend for the Monster Masher project.

## Start the project

If running for the first time:

<!-- Note to self, make these instructions better before publishing project -->

Git checkout root folder of project, then:
cd backend (if in root folder)
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

For local development (recommended):
python manage.py runserver

For production-like testing (Linux/prod style):
python manage.py collectstatic --noinput
gunicorn config.wsgi:application --bind 0.0.0.0:8000

If you are on macOS and see an error like "objc[...]: +[NSString initialize] ... when fork() was called",
avoid running Gunicorn locally and use `python manage.py runserver` instead.

Temporary macOS-only workaround (not recommended for real production):
OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES gunicorn config.wsgi:application --bind 0.0.0.0:8000

Visit:
http://127.0.0.1:8000/

## Health endpoint check

In dev:
curl http://127.0.0.1:8000/health/

In prod:
curl https://monster-masher.onrender.com/health

## Hosting

API: Render
Storage: Supabase

## Sentry environment tagging

Sentry defaults environment to production if you do not set one.

For local development, set one of these before starting Django:

export SENTRY_ENVIRONMENT=development

# or

export DJANGO_ENV=development

In Render production, set:

SENTRY_ENVIRONMENT=production
