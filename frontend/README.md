# Monster Masher — Frontend

Next.js App Router frontend for Monster Masher.

## Getting Started

```bash
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in values before running.

## Environment Variables

Check `.env.local.example` for required environment variables.

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

| Method   | Path                                       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/monsters`                            | Creates a monster. Validates the body against `MonsterForPOSTSchema`, forwards to Django `POST /api/monsters/`, returns `{ monster: Monster }`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `DELETE` | `/api/monsters/[monsterId]`                | Deletes a monster. Forwards to Django `DELETE /api/monsters/{monster_id}/`. Returns `{ ok: true }` on success or a `NextApiError` on failure.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `POST`   | `/api/monsters/[monsterId]/generate-image` | **The only way to create a `MonsterImage`.** Runs the full generation pipeline: validates the request, verifies auth, creates a `MonsterImageGenerationJob` in Django, runs the banned-terms guard and moderation provider, generates the image via the image provider, uploads it to Supabase Storage, and calls Django mark-succeeded. Returns `{ outcome: "succeeded", public_image_url, image_storage_path }` on success. Returns 400 for invalid input, 401 for unauthenticated requests, 422 for blocked content, and 500 for provider/storage failures. There is no separate `/api/monster-images/` endpoint — this route is the entry point for all image creation. |

### Email notification endpoint

| Method | Path                               | Description                                                                                                                                                                                                                                                                                                       |
| ------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/email/image-generation-done` | Sends a transactional notification email to the authenticated user when their image generation has completed. Requires `Authorization: Bearer <access_token>`. The email address in the body must match the JWT owner's email — cross-user sends are rejected with 403. Delivery failures trigger a Sentry alert. |

#### How it works

1. `POST /api/monsters/[monsterId]/generate-image` reaches a terminal outcome (succeeded or any failure).
2. If the user opted in (`should_email_when_done: true` in the form), the route calls `notifyImageGenerationDone()` from `src/lib/api/email/imageGenerationDoneEmail.ts` — **fire and forget** (`void`), so email delivery never delays the generation response.
3. The helper makes a server-to-server POST to `/api/email/image-generation-done`, forwarding the user's Supabase access token.
4. The email route verifies the token, confirms the email matches the user, and sends via Resend.

#### Scenarios

| Scenario               | When sent                                                                        |
| ---------------------- | -------------------------------------------------------------------------------- |
| `succeeded`            | Image generated and stored successfully                                          |
| `failed/moderation`    | Prompt blocked by the content policy (banned-terms guard or moderation provider) |
| `failed/network-error` | Image provider or Supabase Storage call failed                                   |
| `failed/unspecified`   | Moderation check failure, job-transition failure, or other internal error        |

All scenario types and shared request/response types live in `src/lib/api/email/imageGenerationDoneTypes.ts` — import from there; do not redeclare them. Email template components are in `src/components/emailTemplatesToUser/imageGenerationDone/ImageGenerationSuccess.tsx`.

#### Required env vars

| Variable         | Notes                                                             |
| ---------------- | ----------------------------------------------------------------- |
| `RESEND_API_KEY` | Resend API key. Server-only — do not use a `NEXT_PUBLIC_` prefix. |

#### Image generation pipeline details

`POST /api/monsters/[monsterId]/generate-image` orchestrates these steps in order:

1. **Auth** — Supabase session verified; `user_profile_id` comes from the JWT `sub` claim, never from the request body.
2. **Validation** — Request body re-validated server-side against `monsterFormSchema` (same schema the form uses).
3. **Job creation** — `POST /api/monsters/{monster_id}/generate-image/jobs/` in Django creates a `MonsterImageGenerationJob` (status: `QUEUED`). Django is the source of truth for job lifecycle.
4. **Banned-terms guard** — `containsBannedTerms(prompt)` runs before any external call. If blocked → `mark-blocked` → 422.
5. **Moderation** — `getModerationProvider().moderate(prompt)`. If blocked → `mark-blocked` → 422. If failed → `mark-failed` → 500.
6. **Mark running** — `mark-running` called after moderation passes. Only clean-prompt jobs reach RUNNING.
7. **Image generation** — `getImageProvider().generate(prompt)`. If failed → `mark-failed` → 500.
8. **Storage upload** — `getImageStorage().upload(imageBytes, options)`. If failed → `mark-failed` → 500.
9. **Mark succeeded** — `mark-succeeded` called with the image metadata. Django atomically creates the `MonsterImage` row, links it to the `Monster`, and transitions the job to `SUCCEEDED`.
10. **Response** — Returns the public image URL and storage path.

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
