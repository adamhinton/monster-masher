# Monster Masher — Backend

> This README covers the **Django backend** only. For a project overview, getting-started guide, and deployment summary, see the [root README](../README.md).

## Start the project

If running for the first time:

Git checkout root folder of project, then:
cd backend (if in root folder)
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create backend/.env — use the Backend section of .env.example (repo root) as a guide

The real `.env` is gitignored — never commit it. On Render, env vars are
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

## Before committing changes

Note to future self, these steps are duplicated in the frontend README.

1. Regenerate OpenAPI schema on the backend, and generate new API types in the frontend.
   - From /backend (this assumes you've already activated the virtual environment):
     `python manage.py spectacular --file openapi.yaml`

   - From /frontend:
     `npm run generate:api`

2. Run `npx tsc` to check for type errors
   - While not everything is covered, this should catch most API contract drift issues between backend schema and frontend schemas/types.ts.
   - If you see errors here after regenerating the API, it likely means you forgot to update some of the frontend code that calls the affected endpoint(s) to match the new contract.
3. Run `npm run lint`
4. From /frontend, run `npm run test`
5. From /backend, run `python manage.py test`

## API Endpoints

### Health check

```
GET /health
GET /health/
```

Returns `{"status": "ok"}` when the server is running. No authentication required.

```sh
# Dev
curl http://127.0.0.1:8000/health

# Prod
curl https://monster-masher.onrender.com/health
```

### OpenAPI schema

```
GET /api/schema/           → OpenAPI 3.x YAML
GET /api/schema/?format=json → OpenAPI 3.x JSON
```

The committed `backend/openapi.yaml` is generated from this endpoint. The frontend codegen pipeline reads `openapi.yaml` directly (no running server needed).

```sh
curl http://127.0.0.1:8000/api/schema/
curl "http://127.0.0.1:8000/api/schema/?format=json"
```

### Swagger UI (interactive docs)

```
GET /api/docs/
```

Browser-based Swagger UI. Lists all documented endpoints with request/response shapes.

```sh
open http://127.0.0.1:8000/api/docs/
```

### Catch-all (unknown /api/\* routes)

Any `/api/` path that does not match a registered endpoint returns a standard JSON 404:

```json
{
	"error": {
		"code": "not_found",
		"message": "The requested endpoint does not exist.",
		"details": {}
	}
}
```

### User profile endpoints

All require `Authorization: Bearer <supabase_access_token>`.

```
GET  /api/me/           → returns the authenticated user's UserProfile (profile fields only, no monsters)
POST /api/me/bootstrap/ → creates or fetches the UserProfile + all saved monsters with images
```

`/api/me/bootstrap/` is the primary login hook. It is called once after Supabase Auth confirms a session
to ensure a local `UserProfile` row exists and to return the full initial state — profile fields plus all
saved monsters (each with their most recent `MonsterImage` or `null`) — in a single round-trip.

The response shape is `UserProfileWithMonsters` (see the OpenAPI schema). Monsters are ordered
newest-first (`-created_at`) and monsters are prefetched with their images to avoid N+1 queries.

`GET /api/me/` returns only the plain `UserProfile` (no monsters). Use it when only profile metadata
is needed.

### Monster endpoints

All require `Authorization: Bearer <supabase_access_token>`.

Owner is always derived from the verified JWT — never passed in the request body.

Non-owner access returns 404 (not 403) to avoid leaking resource existence.

```
GET    /api/monsters/              → list the authenticated user's monsters
POST   /api/monsters/              → create a monster (owner set from JWT)
GET    /api/monsters/{monster_id}/ → retrieve a monster
PATCH  /api/monsters/{monster_id}/ → partial update (display_name, traits, flavor_text)
DELETE /api/monsters/{monster_id}/ → delete; returns 204
```

### Image generation job endpoints

All require `Authorization: Bearer <supabase_access_token>`.

Owner is always derived from the verified JWT. `{monster_id}` must belong to the authenticated user.

```
POST  /api/monsters/{monster_id}/generate-image/jobs/                        → create a job
GET   /api/monsters/{monster_id}/generate-image/jobs/{job_id}/               → retrieve job status and result
PATCH /api/monsters/{monster_id}/generate-image/jobs/{job_id}/notification/  → toggle should_email_when_done (returns 400 on terminal jobs)
```

**Trusted-server transition endpoints** — called by the Next.js server route (`POST /api/monsters/[monsterId]/generate-image`) using the user's Supabase access token. Django verifies ownership via JWT before accepting transitions:

```
POST /api/monsters/{monster_id}/generate-image/mark-running/
POST /api/monsters/{monster_id}/generate-image/mark-succeeded/
POST /api/monsters/{monster_id}/generate-image/mark-failed/
POST /api/monsters/{monster_id}/generate-image/mark-blocked/
```

## Regenerating the API Schema

After any API change (serializer, view, or endpoint):

```sh
cd backend/ && python manage.py spectacular --file openapi.yaml
cd frontend/ && npm run generate:api
# Fix any frontend TypeScript errors
# Commit both openapi.yaml and __generated__/types.ts
```

The committed `backend/openapi.yaml` is the source of truth for the frontend codegen pipeline. Never edit it manually.

---

## Hosting

API: Render
Storage: Supabase

---

## Database

Django uses Supabase Postgres via `dj-database-url`. Set `DATABASE_URL` in `.env` for local dev.

**Connection options** (in order of preference):

1. **Direct connection** — best for persistent servers; uses IPv6 on newer Supabase projects, which may fail from some networks
2. **Session pooler** (port 5432) — use this if the direct connection fails due to IPv6 issues
3. **Transaction pooler** (port 6543) — **never use this for Django**; Django requires prepared statements, which the transaction pooler does not support

SSL is required in production and disabled locally (controlled by `DEBUG`).

**Migrations**:

```sh
# Apply migrations locally
python manage.py migrate

# Create a local superuser (for Django admin)
python manage.py createsuperuser
```

Migrations run automatically on Render during each deploy via `build.sh`.

---

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

```

```
