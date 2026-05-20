import { describe, expect, it } from "vitest";
import type { MonsterFormValues } from "@/components/monsterGeneration/monsterFormSchema";
import {
	beginGeneration,
	resolveFakeGeneration,
	resetGenerationState,
} from "@/lib/monsterGeneration/createMonsterFlow";

const validFormValues: MonsterFormValues = {
	display_name: "Mossmaw",
	element: "Bogfire",
	habitat: "Cavern marsh",
	personality: "Mischievous",
	color_palette: "Moss green and ember orange",
	flavor_text: "A damp little troublemaker.",
	should_email_when_done: false,
};

describe("createMonsterFlow", () => {
	describe("beginGeneration", () => {
		it("transitions idle to running", () => {
			expect(beginGeneration({ status: "idle" })).toEqual({
				status: "running",
			});
		});

		it("does not expose impossible transitions from terminal states", () => {
			expect(
				beginGeneration({ status: "succeeded", generatedImage: null }),
			).toEqual({
				status: "succeeded",
				generatedImage: null,
			});
			expect(
				beginGeneration({
					status: "failed",
					safeErrorMessage: "Failed already",
				}),
			).toEqual({
				status: "failed",
				safeErrorMessage: "Failed already",
			});
			expect(
				beginGeneration({
					status: "blocked",
					safeErrorMessage: "Blocked already",
				}),
			).toEqual({
				status: "blocked",
				safeErrorMessage: "Blocked already",
			});
		});
	});

	describe("resolveFakeGeneration", () => {
		it("resolves valid prompts to succeeded", () => {
			expect(resolveFakeGeneration(validFormValues)).toEqual({
				status: "succeeded",
				generatedImage: null,
			});
		});

		it("resolves the sentinel error name to failed", () => {
			expect(
				resolveFakeGeneration({
					...validFormValues,
					display_name: "ERROR",
				}),
			).toEqual({
				status: "failed",
				safeErrorMessage:
					"The fake generator hit a pretend snag. Reset and try another monster.",
			});
		});

		it("resolves blocked prompt terms to blocked", () => {
			expect(
				resolveFakeGeneration({
					...validFormValues,
					flavor_text: "Graphic cave blood ritual.",
				}),
			).toEqual({
				status: "blocked",
				safeErrorMessage:
					"Please revise the prompt and keep the monster cute, original, and non-graphic.",
			});
		});
	});

	describe("resetGenerationState", () => {
		it("is the explicit path back to idle", () => {
			expect(resetGenerationState()).toEqual({ status: "idle" });
		});
	});
});
