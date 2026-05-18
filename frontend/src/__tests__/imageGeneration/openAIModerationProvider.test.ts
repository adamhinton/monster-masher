// ──────────────────────────────────────────────────────────────────────────────
// Unit tests for OpenAIModerationProvider.moderate() with a mocked OpenAI SDK.
//
// No real OpenAI API calls are made. The OpenAI client is replaced with a vi.fn()
// mock so tests are deterministic, offline, and free.
//
// Coverage:
//   - Outcome: allowed / blocked / failed for each provider path
//   - Monster Masher policy: violence allowed, violence/graphic blocked
//   - Score-threshold blocking even when the boolean flag is false
//   - SDK/network errors fail closed (never silently allow)
//   - Empty results array treated as a provider failure
//   - Blocked response does not expose category names or scores to the caller
//   - Sentry: exactly one withScope event per evaluation
//   - Sentry context includes job id, outcome, scores, flags, preview/hash/length
//   - Sentry context does NOT include: API key, auth token, cookies, raw prompt
//     (unless SENTRY_LOG_FULL_MODERATION_PROMPTS is explicitly enabled)
// ──────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Moderation } from "openai/resources/moderations";
import type OpenAI from "openai";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

// Mutable env mock — individual tests can flip `sentryLogFullModerationPrompts`.
const mockEnv = vi.hoisted(
	(): {
		sentryLogFullModerationPrompts: boolean;
		imageGenerationMode: "real" | "fake";
	} => ({
		sentryLogFullModerationPrompts: false,
		imageGenerationMode: "real",
	}),
);
vi.mock("@/lib/env/env", () => ({ env: mockEnv }));

// Sentry mock — `withScope` must execute its callback so scope data is captured.
const { sentryWithScope, sentryCaptureMessage } = vi.hoisted(() => ({
	sentryWithScope: vi.fn(),
	sentryCaptureMessage: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
	withScope: sentryWithScope,
	captureMessage: sentryCaptureMessage,
}));

// ─── Import under test ───────────────────────────────────────────────────────

import {
	OpenAIModerationProvider,
	type ModerationInput,
} from "@/lib/monsterGeneration/imageGeneration/moderation/moderation";

// ─── Test helpers ─────────────────────────────────────────────────────────────

type CapturedScope = {
	tags: Record<string, unknown>;
	contexts: Record<string, Record<string, unknown>>;
};

/**
 * Installs a `withScope` mock implementation that captures the tags and context
 * objects from the scope passed to each callback invocation.
 *
 * Call `getLastScope()` after `provider.moderate()` to inspect what was logged.
 */
function installScopeSpy(): { getLastScope: () => CapturedScope } {
	let lastScope: CapturedScope = { tags: {}, contexts: {} };

	sentryWithScope.mockImplementation(
		(
			cb: (scope: {
				setTags: (t: Record<string, unknown>) => void;
				setContext: (name: string, ctx: unknown) => void;
			}) => void,
		) => {
			const captured: CapturedScope = { tags: {}, contexts: {} };
			cb({
				setTags: (tags) => {
					Object.assign(captured.tags, tags);
				},
				setContext: (name, ctx) => {
					captured.contexts[name] = ctx as Record<string, unknown>;
				},
			});
			lastScope = captured;
		},
	);

	return { getLastScope: () => lastScope };
}

function makeModerationInput(
	text: string,
	overrides?: Partial<ModerationInput>,
): ModerationInput {
	return {
		promptText: text,
		imageGenerationJobId: "test-job-id-abc",
		authState: "authenticated",
		generationMode: "real",
		...overrides,
	};
}

/** All boolean flags false (or null for nullable categories). */
function makeCategories(
	overrides: Partial<Record<string, boolean | null>> = {},
): Moderation.Categories {
	return {
		harassment: false,
		"harassment/threatening": false,
		hate: false,
		"hate/threatening": false,
		illicit: null,
		"illicit/violent": null,
		"self-harm": false,
		"self-harm/intent": false,
		"self-harm/instructions": false,
		sexual: false,
		"sexual/minors": false,
		violence: false,
		"violence/graphic": false,
		...overrides,
	} as unknown as Moderation.Categories;
}

/** All scores well below every threshold. */
function makeScores(
	overrides: Partial<Record<string, number>> = {},
): Moderation.CategoryScores {
	return {
		harassment: 0.001,
		"harassment/threatening": 0.001,
		hate: 0.001,
		"hate/threatening": 0.001,
		illicit: 0.001,
		"illicit/violent": 0.001,
		"self-harm": 0.001,
		"self-harm/intent": 0.001,
		"self-harm/instructions": 0.001,
		sexual: 0.001,
		"sexual/minors": 0.000001,
		violence: 0.001,
		"violence/graphic": 0.001,
		...overrides,
	} as unknown as Moderation.CategoryScores;
}

function makeOpenAIResponse(
	categories: Moderation.Categories,
	categoryScores: Moderation.CategoryScores,
	{
		flagged = false,
		id = "modr-test-id",
		model = "omni-moderation-latest",
	}: { flagged?: boolean; id?: string; model?: string } = {},
) {
	return {
		id,
		model,
		results: [{ flagged, categories, category_scores: categoryScores }],
	};
}

/** Replicates the sha256hex helper from the module under test for assertion use. */
async function computeSha256Hex(text: string): Promise<string> {
	const bytes = new TextEncoder().encode(text);
	const buffer = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OpenAIModerationProvider (OpenAI SDK mocked)", () => {
	/** Controlled stand-in for `openai.moderations.create`. */
	let mockModerationsCreate: ReturnType<typeof vi.fn>;
	let provider: OpenAIModerationProvider;
	let getLastScope: () => CapturedScope;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnv.sentryLogFullModerationPrompts = false;
		// Inject a fake OpenAI client — no real API key or network call needed.
		mockModerationsCreate = vi.fn();
		provider = new OpenAIModerationProvider(
			() =>
				({
					moderations: { create: mockModerationsCreate },
				}) as unknown as OpenAI,
		);
		({ getLastScope } = installScopeSpy());
	});

	// ── Outcome: allowed ────────────────────────────────────────────────────────

	describe("clean prompt → { outcome: 'allowed' }", () => {
		it("returns allowed", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			const result = await provider.moderate(
				makeModerationInput("a mossy bog creature"),
			);
			expect(result.outcome).toBe("allowed");
		});

		it("does not include safeReason or safeErrorMessage", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			const result = await provider.moderate(
				makeModerationInput("a mossy bog creature"),
			);
			expect(result).not.toHaveProperty("safeReason");
			expect(result).not.toHaveProperty("safeErrorMessage");
		});
	});

	// ── violence: true → allowed under Monster Masher policy ───────────────────

	describe("violence: true only → allowed (Monster Masher policy allows combat vibes)", () => {
		it("returns allowed", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories({ violence: true }), makeScores(), {
					flagged: true,
				}),
			);
			const result = await provider.moderate(
				makeModerationInput("a creature with razor claws and fangs"),
			);
			expect(result.outcome).toBe("allowed");
		});
	});

	// ── violence/graphic: true → blocked ───────────────────────────────────────

	describe("violence/graphic: true → blocked", () => {
		it("returns { outcome: 'blocked' }", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(
					makeCategories({ "violence/graphic": true }),
					makeScores(),
					{ flagged: true },
				),
			);
			const result = await provider.moderate(
				makeModerationInput("graphic gore content"),
			);
			expect(result.outcome).toBe("blocked");
		});

		it("blocked result has a non-empty safeReason", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(
					makeCategories({ "violence/graphic": true }),
					makeScores(),
				),
			);
			const result = await provider.moderate(
				makeModerationInput("graphic gore content"),
			);
			if (result.outcome !== "blocked") throw new Error("expected blocked");
			expect(typeof result.safeReason).toBe("string");
			expect(result.safeReason.length).toBeGreaterThan(0);
		});

		it("blocked result does NOT expose category names, scores, or openaiModerationId", async () => {
			// The ModerationResult type for blocked only carries { outcome, safeReason }.
			// Verify no extra fields leak through.
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(
					makeCategories({ "violence/graphic": true }),
					makeScores({ "violence/graphic": 0.95 }),
					{ id: "modr-sensitive-id" },
				),
			);
			const result = await provider.moderate(
				makeModerationInput("graphic gore content"),
			);
			expect(result).not.toHaveProperty("categories");
			expect(result).not.toHaveProperty("categoryScores");
			expect(result).not.toHaveProperty("triggeredCategories");
			expect(result).not.toHaveProperty("triggeredScoreThresholds");
			expect(result).not.toHaveProperty("openaiModerationId");
			expect(result).not.toHaveProperty("safeErrorMessage");
		});
	});

	// ── Score threshold exceeded → blocked ─────────────────────────────────────

	describe("score threshold exceeded → blocked even when boolean flag is false", () => {
		it("blocks when violence/graphic score >= 0.5 and flag is false", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(
					makeCategories({ "violence/graphic": false }),
					makeScores({ "violence/graphic": 0.5 }),
				),
			);
			const result = await provider.moderate(
				makeModerationInput("borderline graphic content"),
			);
			expect(result.outcome).toBe("blocked");
		});

		it("blocks when sexual/minors score >= 0.01 and flag is false", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(
					makeCategories({ "sexual/minors": false }),
					makeScores({ "sexual/minors": 0.01 }),
				),
			);
			const result = await provider.moderate(
				makeModerationInput("some prompt"),
			);
			expect(result.outcome).toBe("blocked");
		});
	});

	// ── SDK error → failed (fail closed) ───────────────────────────────────────

	describe("OpenAI SDK throws → failed", () => {
		it("returns { outcome: 'failed' } on network error", async () => {
			mockModerationsCreate.mockRejectedValueOnce(
				new Error("network connection refused"),
			);
			const result = await provider.moderate(
				makeModerationInput("a mossy bog creature"),
			);
			expect(result.outcome).toBe("failed");
		});

		it("safeErrorMessage is a non-empty safe string", async () => {
			mockModerationsCreate.mockRejectedValueOnce(new Error("network error"));
			const result = await provider.moderate(
				makeModerationInput("a mossy bog creature"),
			);
			if (result.outcome !== "failed") throw new Error("expected failed");
			expect(typeof result.safeErrorMessage).toBe("string");
			expect(result.safeErrorMessage.length).toBeGreaterThan(0);
		});

		it("safeErrorMessage does NOT contain raw SDK error details", async () => {
			mockModerationsCreate.mockRejectedValueOnce(
				new Error("very-sensitive-internal-openai-error-detail"),
			);
			const result = await provider.moderate(
				makeModerationInput("a mossy bog creature"),
			);
			if (result.outcome !== "failed") throw new Error("expected failed");
			expect(result.safeErrorMessage).not.toContain(
				"very-sensitive-internal-openai-error-detail",
			);
		});
	});

	// ── Empty results array → failed ────────────────────────────────────────────

	describe("OpenAI returns empty results array → failed", () => {
		it("returns { outcome: 'failed' }", async () => {
			mockModerationsCreate.mockResolvedValueOnce({
				id: "modr-empty",
				model: "omni-moderation-latest",
				results: [],
			});
			const result = await provider.moderate(
				makeModerationInput("a mossy bog creature"),
			);
			expect(result.outcome).toBe("failed");
		});

		it("safeErrorMessage is present and non-empty", async () => {
			mockModerationsCreate.mockResolvedValueOnce({
				id: "modr-empty",
				model: "omni-moderation-latest",
				results: [],
			});
			const result = await provider.moderate(
				makeModerationInput("a mossy bog creature"),
			);
			if (result.outcome !== "failed") throw new Error("expected failed");
			expect(typeof result.safeErrorMessage).toBe("string");
			expect(result.safeErrorMessage.length).toBeGreaterThan(0);
		});
	});

	// ── Sentry — exactly one event per evaluation ──────────────────────────────

	describe("Sentry — exactly one withScope call per moderate() invocation", () => {
		it("calls withScope once on allowed path", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			expect(sentryWithScope).toHaveBeenCalledOnce();
		});

		it("calls withScope once on blocked path", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(
					makeCategories({ "violence/graphic": true }),
					makeScores(),
				),
			);
			await provider.moderate(makeModerationInput("graphic content"));
			expect(sentryWithScope).toHaveBeenCalledOnce();
		});

		it("calls withScope once on SDK-error path", async () => {
			mockModerationsCreate.mockRejectedValueOnce(new Error("error"));
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			expect(sentryWithScope).toHaveBeenCalledOnce();
		});

		it("calls withScope once on empty-results path", async () => {
			mockModerationsCreate.mockResolvedValueOnce({
				id: "modr-empty",
				model: "omni-moderation-latest",
				results: [],
			});
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			expect(sentryWithScope).toHaveBeenCalledOnce();
		});
	});

	// ── Sentry event names and levels ──────────────────────────────────────────

	describe("Sentry event names", () => {
		it("captures image_generation.moderation.allowed at info level", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			expect(sentryCaptureMessage).toHaveBeenCalledWith(
				"image_generation.moderation.allowed",
				"info",
			);
		});

		it("captures image_generation.moderation.blocked at warning level", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(
					makeCategories({ "violence/graphic": true }),
					makeScores(),
				),
			);
			await provider.moderate(makeModerationInput("graphic content"));
			expect(sentryCaptureMessage).toHaveBeenCalledWith(
				"image_generation.moderation.blocked",
				"warning",
			);
		});

		it("captures image_generation.moderation.failed at error level on SDK throw", async () => {
			mockModerationsCreate.mockRejectedValueOnce(new Error("network"));
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			expect(sentryCaptureMessage).toHaveBeenCalledWith(
				"image_generation.moderation.failed",
				"error",
			);
		});

		it("captures image_generation.moderation.failed at error level on empty results", async () => {
			mockModerationsCreate.mockResolvedValueOnce({
				id: "modr-empty",
				model: "omni-moderation-latest",
				results: [],
			});
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			expect(sentryCaptureMessage).toHaveBeenCalledWith(
				"image_generation.moderation.failed",
				"error",
			);
		});
	});

	// ── Sentry required context — success/blocked paths ────────────────────────

	describe("Sentry context — required fields (success/blocked paths)", () => {
		it("includes imageGenerationJobId in moderation context", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(
				makeModerationInput("a mossy bog creature", {
					imageGenerationJobId: "specific-job-xyz",
				}),
			);
			expect(getLastScope().contexts.moderation).toMatchObject({
				imageGenerationJobId: "specific-job-xyz",
			});
		});

		it("includes openaiModerationId in moderation context", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores(), {
					id: "modr-known-id",
				}),
			);
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			expect(getLastScope().contexts.moderation).toMatchObject({
				openaiModerationId: "modr-known-id",
			});
		});

		it("includes flagged boolean in moderation context", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores(), { flagged: false }),
			);
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			expect(getLastScope().contexts.moderation).toHaveProperty(
				"flagged",
				false,
			);
		});

		it("includes categories object in moderation context", async () => {
			const cats = makeCategories({ violence: true });
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(cats, makeScores()),
			);
			await provider.moderate(makeModerationInput("a creature with claws"));
			const ctx = getLastScope().contexts.moderation;
			expect(ctx).toHaveProperty("categories");
			expect((ctx.categories as Record<string, boolean>).violence).toBe(true);
		});

		it("includes categoryScores object in moderation context", async () => {
			const scores = makeScores({ violence: 0.321 });
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), scores),
			);
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			const ctx = getLastScope().contexts.moderation;
			expect(ctx).toHaveProperty("categoryScores");
			expect((ctx.categoryScores as Record<string, number>).violence).toBe(
				0.321,
			);
		});

		it("includes triggeredCategories in moderation context", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			expect(getLastScope().contexts.moderation).toHaveProperty(
				"triggeredCategories",
			);
		});

		it("includes triggeredScoreThresholds in moderation context", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			expect(getLastScope().contexts.moderation).toHaveProperty(
				"triggeredScoreThresholds",
			);
		});

		it("moderation_outcome tag matches the decision outcome (allowed)", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			expect(getLastScope().tags).toMatchObject({
				moderation_outcome: "allowed",
			});
		});

		it("moderation_outcome tag matches the decision outcome (blocked)", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(
					makeCategories({ "violence/graphic": true }),
					makeScores(),
				),
			);
			await provider.moderate(makeModerationInput("graphic content"));
			expect(getLastScope().tags).toMatchObject({
				moderation_outcome: "blocked",
			});
		});

		it("includes generation_mode tag", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(
				makeModerationInput("a mossy bog creature", { generationMode: "real" }),
			);
			expect(getLastScope().tags).toMatchObject({ generation_mode: "real" });
		});

		it("includes auth_state tag", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(
				makeModerationInput("a mossy bog creature", {
					authState: "authenticated",
				}),
			);
			expect(getLastScope().tags).toMatchObject({
				auth_state: "authenticated",
			});
		});
	});

	// ── Sentry — prompt context (preview, hash, length) ────────────────────────

	describe("Sentry context — prompt preview / sha256 / length", () => {
		it("includes promptLength equal to the prompt's character count", async () => {
			const prompt = "a mossy bog creature";
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput(prompt));
			expect(getLastScope().contexts.moderation).toMatchObject({
				promptLength: prompt.length,
			});
		});

		it("includes promptPreview that is ≤200 characters", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			const preview = getLastScope().contexts.moderation
				.promptPreview as string;
			expect(typeof preview).toBe("string");
			expect(preview.length).toBeLessThanOrEqual(200);
		});

		it("truncates promptPreview to 200 chars for long prompts", async () => {
			const longPrompt = "a".repeat(500);
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput(longPrompt));
			const preview = getLastScope().contexts.moderation
				.promptPreview as string;
			expect(preview.length).toBe(200);
		});

		it("strips HTML angle brackets from promptPreview", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(
				makeModerationInput("<b>monster</b> with <i>claws</i>"),
			);
			const preview = getLastScope().contexts.moderation
				.promptPreview as string;
			expect(preview).not.toContain("<");
			expect(preview).not.toContain(">");
		});

		it("includes promptSha256 as a 64-character lowercase hex string", async () => {
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			const sha = getLastScope().contexts.moderation.promptSha256 as string;
			expect(typeof sha).toBe("string");
			expect(sha).toMatch(/^[0-9a-f]{64}$/);
		});

		it("promptSha256 matches the expected SHA-256 digest of the input prompt", async () => {
			const prompt = "a crystalline forest spirit with ember wings";
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput(prompt));
			const actual = getLastScope().contexts.moderation.promptSha256 as string;
			const expected = await computeSha256Hex(prompt);
			expect(actual).toBe(expected);
		});

		it("includes prompt context even when SDK throws (catch path)", async () => {
			mockModerationsCreate.mockRejectedValueOnce(new Error("network error"));
			const prompt = "a mossy bog creature";
			await provider.moderate(makeModerationInput(prompt));
			const ctx = getLastScope().contexts.moderation;
			const sha = ctx.promptSha256 as string;
			expect(sha).toMatch(/^[0-9a-f]{64}$/);
			expect(sha).toBe(await computeSha256Hex(prompt));
			expect(ctx.promptLength).toBe(prompt.length);
			expect(typeof ctx.promptPreview).toBe("string");
		});
	});

	// ── Sentry — sensitive data NOT included ───────────────────────────────────

	describe("Sentry logging — sensitive data NOT included by default", () => {
		it("does NOT include promptFull when sentryLogFullModerationPrompts is false", async () => {
			mockEnv.sentryLogFullModerationPrompts = false;
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(
				makeModerationInput("full prompt that must not appear in logs"),
			);
			expect(getLastScope().contexts.moderation).not.toHaveProperty(
				"promptFull",
			);
		});

		it("DOES include sanitized promptFull when sentryLogFullModerationPrompts is true", async () => {
			mockEnv.sentryLogFullModerationPrompts = true;
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			expect(getLastScope().contexts.moderation).toHaveProperty("promptFull");
		});

		it("sanitized promptFull strips HTML angle brackets even when flag is on", async () => {
			mockEnv.sentryLogFullModerationPrompts = true;
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput("<script>inject</script>"));
			const promptFull = getLastScope().contexts.moderation
				.promptFull as string;
			expect(promptFull).not.toContain("<");
			expect(promptFull).not.toContain(">");
		});

		it("does NOT include the OpenAI API key in Sentry context", async () => {
			const sensitiveKey = "sk-test-this-key-must-not-appear";
			process.env.OPENAI_API_KEY = sensitiveKey;
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			const contextJson = JSON.stringify(getLastScope().contexts);
			const tagsJson = JSON.stringify(getLastScope().tags);
			expect(contextJson).not.toContain(sensitiveKey);
			expect(tagsJson).not.toContain(sensitiveKey);
			delete process.env.OPENAI_API_KEY;
		});

		it("does NOT include raw auth tokens in Sentry context", async () => {
			// ModerationInput carries only authState ('authenticated'), never a token.
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(
				makeModerationInput("a mossy bog creature", {
					authState: "authenticated",
				}),
			);
			const ctx = getLastScope().contexts.moderation;
			expect(ctx).not.toHaveProperty("token");
			expect(ctx).not.toHaveProperty("accessToken");
			expect(ctx).not.toHaveProperty("jwt");
			expect(ctx).not.toHaveProperty("cookie");
			expect(ctx).not.toHaveProperty("cookies");
		});

		it("does NOT include Supabase service role key if somehow present in env", async () => {
			const serviceKey =
				"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role-test";
			process.env.SUPABASE_SECRET_KEY = serviceKey;
			mockModerationsCreate.mockResolvedValueOnce(
				makeOpenAIResponse(makeCategories(), makeScores()),
			);
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			const contextJson = JSON.stringify(getLastScope().contexts);
			expect(contextJson).not.toContain(serviceKey);
			delete process.env.SUPABASE_SECRET_KEY;
		});
	});

	// ── Sentry — failed path context ────────────────────────────────────────────

	describe("Sentry context — failed path (SDK throws)", () => {
		it("tags moderation_outcome as 'failed'", async () => {
			mockModerationsCreate.mockRejectedValueOnce(new Error("error"));
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			expect(getLastScope().tags).toMatchObject({
				moderation_outcome: "failed",
			});
		});

		it("includes imageGenerationJobId in context", async () => {
			mockModerationsCreate.mockRejectedValueOnce(new Error("error"));
			await provider.moderate(
				makeModerationInput("a mossy bog creature", {
					imageGenerationJobId: "job-on-error-path",
				}),
			);
			expect(getLastScope().contexts.moderation).toMatchObject({
				imageGenerationJobId: "job-on-error-path",
			});
		});

		it("does NOT include category scores (not available when SDK throws)", async () => {
			mockModerationsCreate.mockRejectedValueOnce(new Error("error"));
			await provider.moderate(makeModerationInput("a mossy bog creature"));
			// categories/categoryScores only exist after a successful API response
			expect(getLastScope().contexts.moderation).not.toHaveProperty(
				"categories",
			);
			expect(getLastScope().contexts.moderation).not.toHaveProperty(
				"categoryScores",
			);
		});
	});
});
