// ________________
// The form for generating a monster
// ________________

"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import { Eraser, LoaderCircle, WandSparkles } from "lucide-react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	monsterFormFieldLimits,
	monsterFormSchema,
	type MonsterFormValues,
} from "@/components/monsterGeneration/monsterFormSchema";

interface GenerateMonsterFormProps {
	formValues: MonsterFormValues;
	isSubmitting: boolean;
	isSubmitDisabled: boolean;
	onClear: () => void;
	onFormValuesChange: (formValues: MonsterFormValues) => void;
	onSubmit: (formValues: MonsterFormValues) => void;
}

type FieldErrors = Partial<Record<keyof MonsterFormValues, string>>;

/**
 * Form for generating a monster
 *
 * This is wrapped by CreateMonsterExperience, which manages shared state.
 *
 * Stores form values in localStorage for convenience, so users don't lose their progress if they refresh or leave and come back.
 */
export function GenerateMonsterForm({
	formValues,
	isSubmitting,
	isSubmitDisabled,
	onClear,
	onFormValuesChange,
	onSubmit,
}: GenerateMonsterFormProps) {
	const formId = useId();
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

	function updateField<FieldName extends keyof MonsterFormValues>(
		fieldName: FieldName,
		fieldValue: MonsterFormValues[FieldName],
	) {
		onFormValuesChange({
			...formValues,
			[fieldName]: fieldValue,
		});
		setFieldErrors((currentErrors) => ({
			...currentErrors,
			[fieldName]: undefined,
		}));
	}

	function parseFieldErrors(error: z.ZodError<MonsterFormValues>) {
		const flattenedErrors = error.flatten().fieldErrors;
		const parsedFieldErrors: FieldErrors = {};

		for (const fieldName of monsterFormSchema.keyof().options) {
			parsedFieldErrors[fieldName] = flattenedErrors[fieldName]?.[0];
		}

		return parsedFieldErrors;
	}

	/**Clear all form values */
	function handleClear() {
		setFieldErrors({});
		onClear();
	}

	/**TODO update this with backend submission logic when we have that implementeda */
	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const parsedFormValues = monsterFormSchema.safeParse(formValues);

		if (!parsedFormValues.success) {
			setFieldErrors(parseFieldErrors(parsedFormValues.error));
			return;
		}

		setFieldErrors({});
		onSubmit(parsedFormValues.data);
	}

	return (
		<Form className="grid max-w-2xl gap-5" onSubmit={handleSubmit} noValidate>
			<FormField className="max-w-md">
				<FormItem>
					<FormLabel htmlFor={`${formId}-display-name`}>
						Monster Name
						<RequiredMarker />
					</FormLabel>
					<FormControl>
						<Input
							id={`${formId}-display-name`}
							name="display_name"
							value={formValues.display_name}
							onChange={(event) =>
								updateField("display_name", event.target.value)
							}
							aria-invalid={Boolean(fieldErrors.display_name)}
							aria-describedby={`${formId}-display-name-error`}
							disabled={isSubmitting}
							maxLength={monsterFormFieldLimits.display_name}
							required
						/>
					</FormControl>
					<FormMessage id={`${formId}-display-name-error`}>
						{fieldErrors.display_name}
					</FormMessage>
				</FormItem>
			</FormField>

			<div className="grid gap-5 sm:grid-cols-2">
				<FormField className="max-w-48">
					<FormItem>
						<FormLabel htmlFor={`${formId}-element`}>
							Element
							<RequiredMarker />
						</FormLabel>
						<FormControl>
							<Input
								id={`${formId}-element`}
								name="element"
								value={formValues.element}
								onChange={(event) => updateField("element", event.target.value)}
								aria-invalid={Boolean(fieldErrors.element)}
								aria-describedby={`${formId}-element-error`}
								disabled={isSubmitting}
								maxLength={monsterFormFieldLimits.element}
								required
							/>
						</FormControl>
						<FormMessage id={`${formId}-element-error`}>
							{fieldErrors.element}
						</FormMessage>
					</FormItem>
				</FormField>

				<FormField className="max-w-64">
					<FormItem>
						<FormLabel htmlFor={`${formId}-habitat`}>
							Habitat
							<RequiredMarker />
						</FormLabel>
						<FormControl>
							<Input
								id={`${formId}-habitat`}
								name="habitat"
								value={formValues.habitat}
								onChange={(event) => updateField("habitat", event.target.value)}
								aria-invalid={Boolean(fieldErrors.habitat)}
								aria-describedby={`${formId}-habitat-error`}
								disabled={isSubmitting}
								maxLength={monsterFormFieldLimits.habitat}
								required
							/>
						</FormControl>
						<FormMessage id={`${formId}-habitat-error`}>
							{fieldErrors.habitat}
						</FormMessage>
					</FormItem>
				</FormField>
			</div>

			<FormField className="max-w-md">
				<FormItem>
					<FormLabel htmlFor={`${formId}-personality`}>
						Personality
						<RequiredMarker />
					</FormLabel>
					<FormControl>
						<Input
							id={`${formId}-personality`}
							name="personality"
							value={formValues.personality}
							onChange={(event) =>
								updateField("personality", event.target.value)
							}
							aria-invalid={Boolean(fieldErrors.personality)}
							aria-describedby={`${formId}-personality-error`}
							disabled={isSubmitting}
							maxLength={monsterFormFieldLimits.personality}
							required
						/>
					</FormControl>
					<FormMessage id={`${formId}-personality-error`}>
						{fieldErrors.personality}
					</FormMessage>
				</FormItem>
			</FormField>

			<FormField className="max-w-md">
				<FormItem>
					<FormLabel htmlFor={`${formId}-color-palette`}>
						Color palette
						<RequiredMarker />
					</FormLabel>
					<FormControl>
						<Input
							id={`${formId}-color-palette`}
							name="color_palette"
							value={formValues.color_palette}
							onChange={(event) =>
								updateField("color_palette", event.target.value)
							}
							aria-invalid={Boolean(fieldErrors.color_palette)}
							aria-describedby={`${formId}-color-palette-error`}
							disabled={isSubmitting}
							maxLength={monsterFormFieldLimits.color_palette}
							required
						/>
					</FormControl>
					<FormMessage id={`${formId}-color-palette-error`}>
						{fieldErrors.color_palette}
					</FormMessage>
				</FormItem>
			</FormField>

			<FormField className="max-w-2xl">
				<FormItem>
					<FormLabel htmlFor={`${formId}-flavor-text`}>Flavor text</FormLabel>
					<FormControl>
						<Textarea
							id={`${formId}-flavor-text`}
							name="flavor_text"
							value={formValues.flavor_text ?? ""}
							onChange={(event) =>
								updateField("flavor_text", event.target.value)
							}
							aria-invalid={Boolean(fieldErrors.flavor_text)}
							aria-describedby={`${formId}-flavor-text-error`}
							disabled={isSubmitting}
							maxLength={monsterFormFieldLimits.flavor_text}
						/>
					</FormControl>
					<FormMessage id={`${formId}-flavor-text-error`}>
						{fieldErrors.flavor_text}
					</FormMessage>
				</FormItem>
			</FormField>

			<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
				<Button
					type="button"
					variant="outline"
					size="lg"
					onClick={handleClear}
					disabled={isSubmitting}
				>
					<Eraser aria-hidden="true" />
					Clear form
				</Button>
				<Button type="submit" size="lg" disabled={isSubmitDisabled}>
					{isSubmitting ? (
						<LoaderCircle className="animate-spin" aria-hidden="true" />
					) : (
						<WandSparkles aria-hidden="true" />
					)}
					Generate monster
				</Button>
			</div>
		</Form>
	);
}

function RequiredMarker() {
	return (
		<span className="text-destructive" aria-hidden="true">
			*
		</span>
	);
}
