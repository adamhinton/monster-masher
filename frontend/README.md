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
