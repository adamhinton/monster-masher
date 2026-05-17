// _______________
// Here the user fills in details to generate their Monster.
// Stores form values in localStorage for convenience.

// This is a wrapper for GenerateMonsterForm and GenerationStatusPanel, which are where the real work happens. This component manages shared state and drives the generation pipeline.
// _______________

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import z from "zod";

import { GenerateMonsterForm } from "@/components/monsterGeneration/GenerateMonsterForm";
import { GenerationStatusPanel } from "@/components/monsterGeneration/GenerationStatusPanel";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	emptyMonsterFormValues,
	monsterFormSchema,
	type MonsterFormValues,
} from "@/components/monsterGeneration/monsterFormSchema";
import {
	beginGeneration,
	resetGenerationState,
} from "@/lib/monsterGeneration/createMonsterFlow";
import type { GenerationUIState } from "@/lib/monsterGeneration/generationState";
import {
	MonsterForPOSTSchema,
	MonsterSchema,
	type Monster,
} from "@/lib/api/schemas/monster/MonsterSchema";
import { nextApiErrorSchema } from "@/lib/api/errors";
import { useAppDispatch } from "@/lib/store/hooks";
import { monsterAdded } from "../../../store/authSlice";
/**Ongoing form values stored in localStorage for convenience */
const createMonsterFormStorageKey = "monster-masher:create-monster-form";

/** Zod schema for validating the POST /api/monsters/ success response */
const monsterResponseSchema = z.object({ monster: MonsterSchema });

/** Zod schema for validating the POST /api/monsters/[id]/generate-image success response */
const generateImageSuccessSchema = z.object({
	outcome: z.literal("succeeded"),
	public_image_url: z.string(),
	image_storage_path: z.string(),
});

export function CreateMonsterExperience() {
	const router = useRouter();
	const [formValues, setFormValues] = useState<MonsterFormValues>(
		emptyMonsterFormValues,
	);
	const submittedFormValuesRef = useRef<MonsterFormValues>(
		emptyMonsterFormValues,
	);
	const [generationState, setGenerationState] = useState<GenerationUIState>({
		status: "idle",
	});
	const dispatch = useAppDispatch();

	// Check if ongoing form values are stored in localStorage and load them if so. This allows users to refresh or leave and come back without losing their progress.
	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			const storedFormValues = readStoredFormValues();

			if (storedFormValues !== null) {
				setFormValues(storedFormValues);
			}
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, []);

	// When generation is running, POST the monster then call the image-gen pipeline.
	useEffect(() => {
		if (generationState.status !== "running") {
			return;
		}

		let isCancelled = false;

		async function runGenerationPipeline() {
			const formValues = submittedFormValuesRef.current;
			const {
				display_name,
				element,
				habitat,
				personality,
				color_palette,
				flavor_text,
			} = formValues;

			const monsterPayload = {
				display_name,
				traits: { element, habitat, personality, color_palette },
				flavor_text: flavor_text ?? "",
			};

			const isValidMonster = MonsterForPOSTSchema.safeParse(monsterPayload);
			if (!isValidMonster.success) {
				if (!isCancelled) {
					setGenerationState({
						status: "failed",
						safeErrorMessage: "Unexpected error. Please try again.",
					});
				}
				return;
			}

			// Step 1: Create the monster in Django.
			let monster: Monster;
			try {
				const monsterResponse = await fetch("/api/monsters/", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(monsterPayload),
				});

				const monsterRaw: unknown = await monsterResponse.json();

				if (!monsterResponse.ok) {
					const parsedError = nextApiErrorSchema.safeParse(monsterRaw);
					const message = parsedError.success
						? parsedError.data.error.message
						: "Failed to create monster. Please try again.";
					if (!isCancelled) {
						setGenerationState({ status: "failed", safeErrorMessage: message });
					}
					return;
				}

				const parsedMonster = monsterResponseSchema.safeParse(monsterRaw);
				if (!parsedMonster.success) {
					if (!isCancelled) {
						setGenerationState({
							status: "failed",
							safeErrorMessage:
								"Received unexpected data from server. Please try again.",
						});
					}
					return;
				}
				monster = parsedMonster.data.monster;
			} catch {
				if (!isCancelled) {
					setGenerationState({
						status: "failed",
						safeErrorMessage:
							"Network error. Check your connection and try again.",
					});
				}
				return;
			}

			// Step 2: Generate the image.
			try {
				const generateResponse = await fetch(
					`/api/monsters/${monster.id}/generate-image`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(formValues),
					},
				);

				const generateRaw: unknown = await generateResponse.json();

				if (!generateResponse.ok) {
					const parsedError = nextApiErrorSchema.safeParse(generateRaw);
					const errorMessage = parsedError.success
						? parsedError.data.error.message
						: "Image generation failed. Please try again.";
					if (!isCancelled) {
						setGenerationState(
							generateResponse.status === 422
								? { status: "blocked", safeErrorMessage: errorMessage }
								: { status: "failed", safeErrorMessage: errorMessage },
						);
					}
					return;
				}

				const parsedGenerate =
					generateImageSuccessSchema.safeParse(generateRaw);
				if (!parsedGenerate.success) {
					if (!isCancelled) {
						setGenerationState({
							status: "failed",
							safeErrorMessage:
								"Received unexpected response from image generation. Please try again.",
						});
					}
					return;
				}
			} catch {
				if (!isCancelled) {
					setGenerationState({
						status: "failed",
						safeErrorMessage:
							"Network error during image generation. Please try again.",
					});
				}
				return;
			}

			if (!isCancelled) {
				dispatch(monsterAdded(monster));
				setGenerationState({ status: "succeeded" });
			}
		}

		void runGenerationPipeline();

		return () => {
			isCancelled = true;
		};
	}, [generationState.status, dispatch]);

	/**Delete all form values */
	function handleClearForm() {
		setFormValues(emptyMonsterFormValues);
		setGenerationState(resetGenerationState());
		window.localStorage.removeItem(createMonsterFormStorageKey);
	}

	function handleFormValuesChange(updatedFormValues: MonsterFormValues) {
		setFormValues(updatedFormValues);
		window.localStorage.setItem(
			createMonsterFormStorageKey,
			JSON.stringify(updatedFormValues),
		);
	}

	/**This sends to preview component, doesn't save to db or anything
	 * Then, handleSave() is what performs db operations and API calls in the preview component
	 *
	 * COuld maybe simplify that flow (TODO)
	 */
	function handleSubmit(submittedFormValues: MonsterFormValues) {
		const nextGenerationState = beginGeneration(generationState);

		if (nextGenerationState.status !== "running") {
			return;
		}

		submittedFormValuesRef.current = submittedFormValues;
		window.localStorage.removeItem(createMonsterFormStorageKey);
		setGenerationState(nextGenerationState);
	}

	// TODO might be able to delete this
	function handleResetGeneration() {
		setGenerationState(resetGenerationState());
	}

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)] lg:items-start">
			<Card>
				<CardHeader>
					<CardTitle>Create a Monster</CardTitle>
					<CardDescription>
						Fill in your monster&apos;s traits and kick off image generation.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<GenerateMonsterForm
						formValues={formValues}
						isSubmitting={generationState.status === "running"}
						isSubmitDisabled={generationState.status !== "idle"}
						onClear={handleClearForm}
						onFormValuesChange={handleFormValuesChange}
						onSubmit={handleSubmit}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Generation Status</CardTitle>
					<CardDescription>
						Image generation can take up to 90 seconds.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<GenerationStatusPanel
						generationState={generationState}
						onReset={handleResetGeneration}
						onSave={() => router.push("/gallery")}
						isSaving={false}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

function readStoredFormValues() {
	const storedFormValuesJson = window.localStorage.getItem(
		createMonsterFormStorageKey,
	);

	if (storedFormValuesJson === null) {
		return null;
	}

	try {
		const storedFormValues: unknown = JSON.parse(storedFormValuesJson);
		const parsedFormValues = monsterFormSchema.safeParse(storedFormValues);

		if (parsedFormValues.success) {
			return parsedFormValues.data;
		}
	} catch {
		// Invalid localStorage should behave like no draft.
	}

	window.localStorage.removeItem(createMonsterFormStorageKey);
	return null;
}
