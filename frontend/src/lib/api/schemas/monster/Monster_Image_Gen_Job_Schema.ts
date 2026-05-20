// ___________________________
// Hand-written Zod schema based on Monster Image Generation Job data structure gotten from django API.
//
// The Assert<IsExact<...>> line is a compile-time guard. It has no runtime effect.
// If this Zod schema drifts from what the Django backend declares in openapi.yaml,
// tsc will fail here, pointing directly at the mismatch.
//
// When backend types change:
//   1. Update the Django serializer/annotation
//   2. Run `python manage.py spectacular --file openapi.yaml`
//   3. Run `npm run generate:api`
//   4. Fix this Zod schema if tsc now fails on the Assert line
// ___________________________
import z from "zod";
import { components } from "../../__generated__/types";
import { MonsterImageSchema } from "./MonsterImageSchema";
import { Assert, AssertExact, IsAssignableTo } from "../../type-assertions";

type _MonsterImageGenJobFromAPI =
	components["schemas"]["MonsterImageGenerationJob"];

/**
 * Don't use this type directly.
 *
 * This is what we get as a MonsterImageGenerationJob from the django API.
 *
 * It is divided further into sub-schemas and sub-types based on `status` — use
 * those instead. As-is, this schema can allow invalid state because it has to
 * encompass all possible statuses.
 */
const _Monster_Image_Gen_Job_Schema = z.object({
	id: z.uuid(),
	// Monster's db id
	monster: z.uuid().nullable(),
	status: z.union([
		z.literal("queued"),
		z.literal("running"),
		z.literal("succeeded"),
		z.literal("failed"),
		z.literal("blocked"),
	]),
	generation_mode: z.union([z.literal("fake"), z.literal("real")]),

	provider_info: z.object({
		provider: z.string(),
		provider_model: z.string(),
		provider_request_id: z.string(),
	}),

	generation_metadata: z.object({
		prompt_version: z.string().max(40).trim(),
		prompt_hash: z.string().max(64).trim(),
	}),

	notify_when_done: z.object({
		should_email_when_done: z.boolean(),
		// This is a date
		notified_at: z.string().nullable(),
		notification_error: z
			.object({
				code: z.string(),
				message: z.string(),
			})
			.nullable(),
	}),

	error_info: z
		.object({
			code: z.string(),
			message: z.string(),
		})
		.nullable(),

	image: MonsterImageSchema.nullable(),

	timestamps: z.object({
		// These are all dates
		created_at: z.string(),
		started_at: z.string().nullable(),
		finished_at: z.string().nullable(),
		updated_at: z.string(),
	}),
});

/** Don't use this, see notes on _Monster_Image_Gen_Job_Schema */
export type _MonsterImageGenJob = z.output<
	typeof _Monster_Image_Gen_Job_Schema
>;

/**
 * Compile-time drift check. tsc fails here if the Zod schema drifts from the OpenAPI type.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _MonsterImageGenJobSchemaMatchesOpenAPI = Assert<
	AssertExact<_MonsterImageGenJob, _MonsterImageGenJobFromAPI>
>;

// ─── Per-status schemas ───────────────────────────────────────────────────────
//
// Valid state per status (from model clean() / DB constraints):
//
//   queued    — started_at: null, finished_at: null, error_info: null, image: null
//   running   — started_at: set,  finished_at: null, error_info: null, image: null
//   succeeded — started_at: set,  finished_at: set,  error_info: null, image: non-null
//   failed    — started_at: nullable (may fail before running),
//               finished_at: set, error_info: non-null, image: null
//   blocked   — started_at: set,  finished_at: set,  error_info: non-null, image: null

/**See notes on QueuedMonsterImageGenJob */
export const Queued_Monster_Image_Gen_Job_Schema =
	_Monster_Image_Gen_Job_Schema.extend({
		status: z.literal("queued"),
		error_info: z.null(),
		image: z.null(),
		timestamps: z.object({
			created_at: z.string(),
			started_at: z.null(),
			finished_at: z.null(),
			updated_at: z.string(),
		}),
	});

/**A Queued monster image generation job.
 *
 * Specifically, this is the response you would get from the API when requesting this object type.
 *
 * Will need slight tweaking for the request body when creating a new job, since you don't provide all these fields. For example, you don't provide `status` or `timestamps` when creating a new job — those are set by the backend.
 */
export type Queued_Monster_Image_Gen_Job = z.output<
	typeof Queued_Monster_Image_Gen_Job_Schema
>;

/**Fails to compile if queued subtype drifts from parent type */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _QueuedSatisfiesBase = Assert<
	IsAssignableTo<Queued_Monster_Image_Gen_Job, _MonsterImageGenJob>
>;

/**
 * See notes on Running_Monster_Image_Gen_Job.
 */
export const Running_Monster_Image_Gen_Job_Schema =
	_Monster_Image_Gen_Job_Schema.extend({
		status: z.literal("running"),
		error_info: z.null(),
		image: z.null(),
		timestamps: z.object({
			created_at: z.string(),
			started_at: z.string(),
			finished_at: z.null(),
			updated_at: z.string(),
		}),
	});

/**
 * A Running monster image generation job.
 *
 * Specifically, this is the response you would get from the API when requesting this object type.
 *
 * Will need slight tweaking for the request body when creating a new job, since you don't provide all these fields. For example, you don't provide `status` or `timestamps` when creating a new job — those are set by the backend.
 */
export type Running_Monster_Image_Gen_Job = z.output<
	typeof Running_Monster_Image_Gen_Job_Schema
>;

/**Fails to compile if running subtype drifts from parent type */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _RunningSatisfiesBase = Assert<
	IsAssignableTo<Running_Monster_Image_Gen_Job, _MonsterImageGenJob>
>;

/**
 * See notes on Succeeded_Monster_Image_Gen_Job.
 */
export const Succeeded_Monster_Image_Gen_Job_Schema =
	_Monster_Image_Gen_Job_Schema.extend({
		status: z.literal("succeeded"),
		error_info: z.null(),
		image: MonsterImageSchema,
		timestamps: z.object({
			created_at: z.string(),
			started_at: z.string(),
			finished_at: z.string(),
			updated_at: z.string(),
		}),
	});

/**
 * A Succeeded monster image generation job.
 *
 * Specifically, this is the response you would get from the API when requesting this object type.
 *
 * Will need slight tweaking for the request body when creating a new job, since you don't provide all these fields. For example, you don't provide `status` or `timestamps` when creating a new job — those are set by the backend.
 */
export type Succeeded_Monster_Image_Gen_Job = z.output<
	typeof Succeeded_Monster_Image_Gen_Job_Schema
>;

/**Fails to compile if succeeded subtype drifts from parent type */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _SucceededSatisfiesBase = Assert<
	IsAssignableTo<Succeeded_Monster_Image_Gen_Job, _MonsterImageGenJob>
>;

/**
 * See notes on Failed_Monster_Image_Gen_Job.
 */
export const Failed_Monster_Image_Gen_Job_Schema =
	_Monster_Image_Gen_Job_Schema.extend({
		status: z.literal("failed"),
		// started_at is nullable: a job can fail before it starts running
		error_info: z.object({
			code: z.string(),
			message: z.string(),
		}),
		image: z.null(),
		timestamps: z.object({
			created_at: z.string(),
			started_at: z.string().nullable(),
			finished_at: z.string(),
			updated_at: z.string(),
		}),
	});

/**
 * A Failed monster image generation job.
 *
 * Specifically, this is the response you would get from the API when requesting this object type.
 *
 * Will need slight tweaking for the request body when creating a new job, since you don't provide all these fields. For example, you don't provide `status` or `timestamps` when creating a new job — those are set by the backend.
 */
export type Failed_Monster_Image_Gen_Job = z.output<
	typeof Failed_Monster_Image_Gen_Job_Schema
>;

/**Fails to compile if failed subtype drifts from parent type */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _FailedSatisfiesBase = Assert<
	IsAssignableTo<Failed_Monster_Image_Gen_Job, _MonsterImageGenJob>
>;

/**
 * See notes on Blocked_Monster_Image_Gen_Job.
 */
export const Blocked_Monster_Image_Gen_Job_Schema =
	_Monster_Image_Gen_Job_Schema.extend({
		status: z.literal("blocked"),
		// blocked always transitions from running, so started_at is always set
		error_info: z.object({
			code: z.string(),
			message: z.string(),
		}),
		image: z.null(),
		timestamps: z.object({
			created_at: z.string(),
			started_at: z.string(),
			finished_at: z.string(),
			updated_at: z.string(),
		}),
	});

/**
 * A Blocked monster image generation job.
 *
 * Specifically, this is the response you would get from the API when requesting this object type.
 */
export type BlockedMonsterImageGenJob = z.output<
	typeof Blocked_Monster_Image_Gen_Job_Schema
>;

/**Fails to compile if blocked subtype drifts from parent type */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _BlockedSatisfiesBase = Assert<
	IsAssignableTo<BlockedMonsterImageGenJob, _MonsterImageGenJob>
>;

// ─── Union ────────────────────────────────────────────────────────────────────

/**Union schema of five different possible monster generation schemas based on `status` field */
export const Monster_Image_Gen_Job_Schema = z.discriminatedUnion("status", [
	Queued_Monster_Image_Gen_Job_Schema,
	Running_Monster_Image_Gen_Job_Schema,
	Succeeded_Monster_Image_Gen_Job_Schema,
	Failed_Monster_Image_Gen_Job_Schema,
	Blocked_Monster_Image_Gen_Job_Schema,
]);

/**Union of five different possible monster generation job types based on `status` field*/
export type MonsterImageGenJob = z.output<typeof Monster_Image_Gen_Job_Schema>;
