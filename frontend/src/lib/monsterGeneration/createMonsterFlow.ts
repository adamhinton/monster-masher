// ________________
// Pure state-transition helpers for creating a fake (no image generation AI call) monster.
//
// These functions are decoupled from React so they can be unit-tested directly
// without mounting any components. The CreateMonsterExperience component calls
// them from inside setState / useEffect to drive the GenerationUIState machine.
// ________________

import type { MonsterFormValues } from "@/components/monsterGeneration/monsterFormSchema";
import type { GenerationUIState } from "@/lib/monsterGeneration/generationState";

/** Terms that immediately block a prompt regardless of other content. */
const blockedPromptPattern = /\b(gore|graphic|hate|blood)\b/i;

/**
 * Returns the idle state. Use this whenever the user explicitly resets
 * the flow — e.g. clicking "Try again" after a failure or "Edit prompt"
 * after a block.
 */
export function resetGenerationState(): GenerationUIState {
	return { status: "idle" };
}

/**
 * Advances `idle → running` when the user submits the form.
 *
 * If the current state is anything other than `idle` (i.e. the flow is
 * already in progress or has finished) the state is returned unchanged,
 * preventing a double-submit from clobbering an in-flight generation.
 */
export function beginGeneration(
	currentState: GenerationUIState,
): GenerationUIState {
	if (currentState.status !== "idle") {
		return currentState;
	}

	return { status: "running" };
}

/**
 * Determines the terminal state for the **fake** generation flow.
 *
 * Called after the simulated generation delay completes. Inspects the
 * submitted form values and returns one of:
 *
 * - `blocked`  — any field contains a banned term (gore, graphic, hate, blood).
 * - `failed`   — the display_name is literally "error" (sentinel for QA / dev).
 * - `succeeded` — everything else; the fake monster is "ready".
 *
 * This function never calls a real provider. Swap it out in Phase 4 when the
 * real image-generation pipeline is wired in.
 */
export function resolveFakeGeneration(
	submittedFormValues: MonsterFormValues,
): GenerationUIState {
	const promptText = [
		submittedFormValues.display_name,
		submittedFormValues.element,
		submittedFormValues.habitat,
		submittedFormValues.personality,
		submittedFormValues.color_palette,
		submittedFormValues.flavor_text,
	]
		.filter(
			(fieldValue): fieldValue is string =>
				fieldValue !== undefined && fieldValue.length > 0,
		)
		.join(" ");

	if (blockedPromptPattern.test(promptText)) {
		return {
			status: "blocked",
			safeErrorMessage:
				"Please revise the prompt and keep the monster cute, original, and non-graphic.",
		};
	}

	if (submittedFormValues.display_name.toLowerCase() === "error") {
		return {
			status: "failed",
			safeErrorMessage:
				"The fake generator hit a pretend snag. Reset and try another monster.",
		};
	}

	return { status: "succeeded" };
}
