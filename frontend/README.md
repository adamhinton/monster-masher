# Monster Masher — Frontend

Next.js App Router frontend for Monster Masher.

## Getting Started

```bash
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in values before running.

## Environment Variables

| Variable                          | Description                                                        |
| --------------------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_DJANGO_API_BASE_URL` | Base URL for the Django API (e.g. `http://127.0.0.1:8000` locally) |

## Regenerating API Types

TypeScript types for the Django API are auto-generated from `backend/openapi.yaml`.

```sh
# From frontend/
npm run generate:api
```

This writes `src/lib/api/__generated__/types.ts`. Do not edit that file manually — it is machine-generated and committed to the repo. Run the command and commit the output whenever the backend OpenAPI schema changes.

## Adding a New API Call

For every new API endpoint call:

1. Write a Zod schema in `src/lib/api/schemas/` (one file per resource/endpoint group).
2. Add a compile-time drift check at the bottom of the schema file:
   ```ts
   type _Check = Assert<AssertExact<z.output<typeof MySchema>, OpenAPIType>>;
   ```
   If the Zod schema drifts from the OpenAPI type, `tsc` will fail on that line with a descriptive error showing both sides of the mismatch.
3. Wrap the `Schema.parse(data)` call in a try/catch that sends to Sentry before re-throwing:
   ```ts
   try {
   	return MySchema.parse(data);
   } catch (err) {
   	Sentry.captureException(err, {
   		tags: { type: "api_contract_drift", endpoint: "/api/..." },
   	});
   	throw err;
   }
   ```

See `src/lib/api/schemas/health.ts` and `src/lib/api/health.ts` for a working example.

---

## Auth

Auth is handled by Next.js + Supabase Auth. Magic links are delivered by Resend. Django verifies the Supabase JWT on protected requests and owns the user profile record.

### Sign-in flow

1. User visits `/auth` and submits their email.
2. `POST /api/auth/sign-in` calls Supabase, which sends a magic link email via Resend.
3. User clicks the link — browser hits `GET /api/auth/callback?code=...&next=...`.
4. Callback exchanges the code for a Supabase session (sets auth cookies) and redirects to the safe `next` path.
5. `AuthWatcher` (mounted in the root layout) detects the `SIGNED_IN` event from the Supabase client.
6. `AuthWatcher` calls `POST /api/auth/bootstrap-auth`, which verifies the JWT server-side, calls Django's `POST /api/me/bootstrap/`, and returns a `UserProfileWithMonsters` payload — profile fields plus all saved monsters with images.
7. Redux dispatches `authSignedIn(profile)` — the app now has full auth + monster state.

### Logout flow

1. User clicks logout — header calls `POST /api/auth/logout`.
2. Route calls `supabase.auth.signOut()`, clearing session cookies.
3. `AuthWatcher` detects `SIGNED_OUT` and dispatches `authSignedOut()` to Redux.

### SSR cookie refresh

`proxy.ts` (Next.js middleware) runs on every non-static request. It validates the Supabase JWT and refreshes session cookies so server components always see a current session.

### Auth endpoints

| Method | Path                       | Description                                                                                                                                                                                                             |
| ------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/auth/sign-in`        | Accepts `{ email, next }`. Initiates magic link via Supabase; does not return a token.                                                                                                                                  |
| `GET`  | `/api/auth/callback`       | Receives `?code=` from the magic link. Exchanges it for a session and redirects to the safe `next` path.                                                                                                                |
| `POST` | `/api/auth/bootstrap-auth` | Server-side only. Verifies the Supabase session, calls Django `POST /api/me/bootstrap/`, returns `{ user: UserProfileWithMonsters }` (profile + all saved monsters with images). Called by `AuthWatcher` after sign-in. |
| `POST` | `/api/auth/logout`         | Signs out via Supabase Auth and clears session cookies.                                                                                                                                                                 |

### Monster endpoints

Next.js route handlers that proxy to Django after verifying the Supabase session server-side.

| Method   | Path                        | Description                                                                                                                                     |
| -------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/monsters`             | Creates a monster. Validates the body against `MonsterForPOSTSchema`, forwards to Django `POST /api/monsters/`, returns `{ monster: Monster }`. |
| `DELETE` | `/api/monsters/[monsterId]` | Deletes a monster. Forwards to Django `DELETE /api/monsters/{monster_id}/`. Returns `{ ok: true }` on success or a `NextApiError` on failure.   |

### Auth state (Redux)

```ts
type AuthState =
	| { status: "loading" }
	| { status: "anonymous" }
	| { status: "authenticated"; user: UserProfile }; // UserProfile includes monsters[]
```

`UserProfile.monsters` is an array of `Monster` objects (each with their most recent `MonsterImage` or `null`), populated on bootstrap. Monster state lives inside the authenticated user and is kept in sync via Redux actions:

- `monsterAdded(monster)` — prepends a newly created monster
- `monsterUpdated(monster)` — replaces an existing monster matched by id
- `monsterDeleted(monsterId)` — removes a monster by id

Initial state is derived server-side in the root layout: Supabase session checked → Django `POST /api/me/bootstrap/` fetched and Zod-validated → hydrated into Redux before first render.
