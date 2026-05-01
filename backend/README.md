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
cp .env.example .env # then fill in real values (DJANGO_SECRET_KEY at minimum)

`.env.example` lists all env vars the project knows about, with safe placeholder
values. The real `.env` is gitignored — never commit it. On Render, env vars are
set through the dashboard instead of a `.env` file, so `load_dotenv()` is a no-op
in production.

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
curl http://127.0.0.1:8000/health

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

---

## Code Conventions

- **Module docstrings**: Triple-quoted docstrings at the top of Python files that benefit from context (views, models, serializers, middleware, management commands). Not needed for trivial `__init__.py` files.
- **Function/class docstrings**: On non-obvious functions and classes.
- **Comments**: Only when they explain _why_, not _what_. If the code reads clearly, don't comment it.

---

## API Conventions

### Error response shape

All API errors use this shape:

```json
{
	"error": {
		"code": "string_code",
		"message": "Human-readable message",
		"details": {}
	}
}
```

Common `code` values: `not_found`, `method_not_allowed`, `permission_denied`, `not_authenticated`, `validation_error`.

For validation errors, `details` contains field-level messages keyed by field name.

**How this works in practice**: raise a standard DRF exception (e.g. `raise NotFound()`, `raise PermissionDenied()`) and the custom handler in `apps/common/exceptions.py` wraps it automatically. Views that return `Response` directly for error cases should manually match this shape.

### URL namespace

All API routes live under `/api/`. New endpoints belong in the relevant app's `urls.py` and get included in `apps/common/urls.py`. Do not wire new API routes directly in `config/urls.py`.

### apps/common/

`apps/common/` holds shared conventions with no feature-specific logic:

- `exceptions.py` — custom DRF exception handler
- `views.py` — `api_not_found` catch-all for unknown `/api/` routes
- Future: shared response helpers, constants, base permission classes

It has no models, no migrations, and no URLs of its own.

---

## Running Tests

Run all tests from the `backend/` directory:

```sh
python manage.py test
```

Run a specific app's tests:

```sh
python manage.py test core
python manage.py test apps.common
```

Tests live alongside the code they cover:

- `core/tests.py` — health endpoint
- `apps/common/tests.py` — error response shape and `/api/` conventions

No test hits a network endpoint or external service. Keep it that way.
