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
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --config ../gunicorn_config.py

If you are on macOS and see an error like "objc[...]: +[NSString initialize] ... when fork() was called",
avoid running Gunicorn locally and use `python manage.py runserver` instead.

Temporary macOS-only workaround (not recommended for real production):
OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES gunicorn config.wsgi:application --bind 0.0.0.0:8000 --config ../gunicorn_config.py

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

## Render service setup (prod)

Make sure your Render service Root Directory is `backend` (not the repo root) so that it can find `manage.py` and `config.wsgi`.

Build Command:
./build.sh

Start Command:
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --config ../gunicorn_config.py

If your Render service Root Directory is the repo root instead:

Why `--config` matters:
Your custom `gunicorn_config.py` filter out `/health` access logs. Gunicorn only uses it when you pass `--config` (or `-c`).

Required/important env vars in Render:
DJANGO_SECRET_KEY=<strong-secret>
DJANGO_DEBUG=False
SENTRY_ENVIRONMENT=production

Notes:

- Render sets `RENDER=true` and `RENDER_EXTERNAL_HOSTNAME` automatically.
- Keep using `config.wsgi:application` (this project module is `config`, not `myapp`).

## Sentry environment tagging

Sentry defaults environment to production if you do not set one.

For local development, set one of these before starting Django:

export SENTRY_ENVIRONMENT=development

### or

export DJANGO_ENV=development

In Render production, set:

SENTRY_ENVIRONMENT=production
