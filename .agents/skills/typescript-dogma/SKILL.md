````md
---
name: typescript-dogma
description: TypeScript rules and type safety expectations
---

## Editor Errors

Check and resolve editor errors before finishing your edit session. I'm more worried about TS errors than Python errors - there should be NO TS errors or warnings. This is a huge pet peeve for me, agents constantly leave errors all over the place.

EXTREMELY IMPORTANT: RESOLVE ALL EDITOR ERRORS THAT WERE CAUSED BY YOUR ACTIONS. RUN NPX TSC AND NPM RUN LINT.

## TypeScript Rules

**EXTREMELY IMPORTANT**: Don't remake types. If a type is defined elsewhere, import it. Never ever ever remake or copy-paste types. That's the single most infuriating thing for me and copilot does it all the time.

### No any

Never use:

```ts
any
as any
Array<any>
Record<string, any>
```
````

Use `unknown` for untrusted data.

Use precise types for trusted app data.

### Unknown at boundaries

External data starts as `unknown`.

Examples:

- `response.json()`
- localStorage reads
- search params
- third-party callbacks
- generated image provider responses

Validate before use. IMPORTANT: Validate all data at boundaries, anything to/from API calls, anything being sent to other components. I spend hours and hours writing zod schemas ----- use them.

### No unnecessary annotations

Do not write useless annotations:

```ts
const count: number = 123;
```

Prefer inference when the type is obvious.

Use explicit types when they clarify boundaries, exported APIs, component props, Redux state, or complex generics.

### Discriminated unions

Prefer discriminated unions for state machines.

IMPORTANT: Types should never model impossible states. If you only remember one thing, it should be that.

Example:

```ts
type GenerationState =
	| { status: "idle" }
	| { status: "editing"; draft: MonsterDraft }
	| { status: "generating"; draft: MonsterDraft }
	| { status: "success"; draft: MonsterDraft; result: GeneratedMonster }
	| { status: "error"; draft: MonsterDraft; message: string };
```

Do not represent this with several booleans like:

```ts
isLoading;
isSuccess;
isError;
hasResult;
```

That allows invalid states.

### Generated types

Generated API types belong in a dedicated generated folder.

Rules:

- do not manually edit generated files
- regenerate when backend schema changes
- import generated types where needed
- keep handwritten frontend types clearly separate

### Type safety anti patterns

Avoid:

- `any`
- `as any`
- broad type assertions to force code through
- duplicating backend DTOs by hand
- making every field optional to avoid errors
- storing unknown API responses in Redux
- ignoring impossible states
- using strings where a union is appropriate

### Zod

- Zod is generally going to be the source of truth for important types
- Use it for validation where possible.

### Semantic variable names

- Use clear, descriptive variable names that reflect the data they hold and their purpose in the app.
- Avoid vague names like `data`, `info`, or `item` when more specific names can be used.
- For example, use `monsterResponse` instead of `data` at API layer
- Use units and descriptive names, such as:
  - numGames instead of games (numbers)
  - isValid instead of valid (booleans)
  - speedMPH instead of speed (numbers with units)
  - userEmail instead of email (strings with specific format)

```

```
