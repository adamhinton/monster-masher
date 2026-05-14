import type { MonsterImageGenJob } from "@/lib/api/schemas/monster/Monster_Image_Gen_Job_Schema";

type GenerationJobStatus = MonsterImageGenJob["status"];

/**Local create-page generation state. `idle` is UI-only; all other statuses come from the backend job schema.
 *
 * This goes in CreateMonsterExperience.tsx
 */
export type GenerationUIState =
	| { status: "idle" }
	| { status: Extract<GenerationJobStatus, "running"> }
	| { status: Extract<GenerationJobStatus, "succeeded"> }
	| {
			status: Extract<GenerationJobStatus, "failed" | "blocked">;
			safeErrorMessage: string;
	  };
