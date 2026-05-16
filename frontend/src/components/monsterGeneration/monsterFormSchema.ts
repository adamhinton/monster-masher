// ___________________________
// Form validation for the create-monster UI.
//
// This schema derives field validation from MonsterSchema instead of
// redefining Monster fields. The form keeps `traits` flattened for a nicer UI,
// but the field constraints still come from the backend-backed Monster schema.
// ___________________________

import { z } from "zod";

import { MonsterSchema } from "@/lib/api/schemas/monster/MonsterSchema";

const monsterTraitsSchema = MonsterSchema.shape.traits;
const flavorTextSchema = MonsterSchema.shape.flavor_text.unwrap();

/**Defines needed inputs and constraints for Monster generation form
 *
 * Fields are derived from the MonsterSchema so as to alert us if any type drift happens.
 */
export const monsterFormSchema = MonsterSchema.pick({
	display_name: true,
	flavor_text: true,
}).extend({
	display_name: MonsterSchema.shape.display_name.min(
		1,
		"Give your monster a name or name inspiration.",
	),
	element: monsterTraitsSchema.shape.element.min(1, "Describe an element."),
	habitat: monsterTraitsSchema.shape.habitat.min(1, "Describe a habitat."),
	personality: monsterTraitsSchema.shape.personality.min(
		1,
		"Describe the monster's personality.",
	),
	color_palette: monsterTraitsSchema.shape.color_palette.min(
		1,
		"Describe the color palette.",
	),
	should_email_when_done: z.boolean().default(false),
});

export type MonsterFormValues = z.output<typeof monsterFormSchema>;

/**Form input limits like maxLength, derived from the MonsterSchema to ensure consistency between frontend and backend validation.
 */
export const monsterFormFieldLimits: Record<
	keyof MonsterFormValues,
	number | undefined
> = {
	display_name: MonsterSchema.shape.display_name.maxLength ?? undefined,
	element: monsterTraitsSchema.shape.element.maxLength ?? undefined,
	habitat: monsterTraitsSchema.shape.habitat.maxLength ?? undefined,
	personality: monsterTraitsSchema.shape.personality.maxLength ?? undefined,
	color_palette: monsterTraitsSchema.shape.color_palette.maxLength ?? undefined,
	flavor_text: flavorTextSchema.maxLength ?? undefined,
	should_email_when_done: undefined,
} satisfies Record<keyof MonsterFormValues, number | undefined>;

/**Initial Monster generation form values */
export const emptyMonsterFormValues: MonsterFormValues = {
	display_name: "",
	element: "",
	habitat: "",
	personality: "",
	color_palette: "",
	flavor_text: "",
	should_email_when_done: false,
};
