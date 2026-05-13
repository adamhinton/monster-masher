// _______________
// Here the user fills in details to generate their Monster.
// Stores form values in localStorage for conveninence.

// This is a wrapper for GenerateMonsterForm and GenerationStatusPanel, which are where the real work happens. This component manages shared state and simulates the generation flow for now while the provider integration is still in progress.
// _______________

"use client";

import { useEffect, useRef, useState } from "react";

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
import type { GenerationUIState } from "@/lib/monsterGeneration/generationState";

/**Disallowed terms */
const blockedPromptPattern = /\b(gore|graphic|hate|blood)\b/i;
/**Ongoing form values stored in localStorage for convenience */
const createMonsterFormStorageKey = "monster-masher:create-monster-form";

export function CreateMonsterExperience() {
	const [formValues, setFormValues] = useState<MonsterFormValues>(
		emptyMonsterFormValues,
	);
	const submittedFormValuesRef = useRef<MonsterFormValues>(
		emptyMonsterFormValues,
	);
	const [generationState, setGenerationState] = useState<GenerationUIState>({
		status: "idle",
	});

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

	useEffect(() => {
		if (generationState.status !== "running") {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			const submittedFormValues = submittedFormValuesRef.current;
			const promptText = Object.values(submittedFormValues).join(" ");

			if (blockedPromptPattern.test(promptText)) {
				setGenerationState({
					status: "blocked",
					safeErrorMessage:
						"Please revise the prompt and keep the monster cute, original, and non-graphic.",
				});
				return;
			}

			if (submittedFormValues.display_name.toLowerCase() === "error") {
				setGenerationState({
					status: "failed",
					safeErrorMessage:
						"The fake generator hit a pretend snag. Reset and try another monster.",
				});
				return;
			}

			setGenerationState({ status: "succeeded" });
		}, 900);

		return () => window.clearTimeout(timeoutId);
	}, [generationState]);

	function handleClearForm() {
		setFormValues(emptyMonsterFormValues);
		setGenerationState({ status: "idle" });
		window.localStorage.removeItem(createMonsterFormStorageKey);
	}

	function handleFormValuesChange(updatedFormValues: MonsterFormValues) {
		setFormValues(updatedFormValues);
		window.localStorage.setItem(
			createMonsterFormStorageKey,
			JSON.stringify(updatedFormValues),
		);
	}

	function handleSubmit(submittedFormValues: MonsterFormValues) {
		if (generationState.status !== "idle") {
			return;
		}

		submittedFormValuesRef.current = submittedFormValues;
		window.localStorage.removeItem(createMonsterFormStorageKey);
		setGenerationState({ status: "running" });
	}

	function handleResetGeneration() {
		setGenerationState({ status: "idle" });
	}

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)] lg:items-start">
			<Card>
				<CardHeader>
					<CardTitle>Create a Monster</CardTitle>
					<CardDescription>
						Choose a few traits and run the fake generation flow while the real
						image provider is still under construction.
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
						Status only. No image preview is shown until real images exist.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<GenerationStatusPanel
						generationState={generationState}
						onReset={handleResetGeneration}
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
