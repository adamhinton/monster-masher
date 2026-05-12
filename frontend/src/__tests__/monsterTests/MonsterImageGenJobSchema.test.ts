// _____________
// Unit tests for the MonsterImageGenerationJob Zod schema
// Ensuring that it and its subtypes only allow valid state, that they dodge common footguns, etc
// _____________

import { describe, it, expect } from "vitest";
import {
	Monster_Image_Gen_Job_Schema,
	Queued_Monster_Image_Gen_Job_Schema,
	Running_Monster_Image_Gen_Job_Schema,
	Succeeded_Monster_Image_Gen_Job_Schema,
	Failed_Monster_Image_Gen_Job_Schema,
	Blocked_Monster_Image_Gen_Job_Schema,
} from "@/lib/api/schemas/monster/Monster_Image_Gen_Job_Schema";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const JOB_UUID = "123e4567-e89b-12d3-a456-426614174000";
const MONSTER_UUID = "223e4567-e89b-12d3-a456-426614174001";
const IMAGE_UUID = "323e4567-e89b-12d3-a456-426614174002";

const validImage = {
	id: IMAGE_UUID,
	public_image_url: "https://example.com/monster.png",
	image_storage_path: "monsters/user/monster.png",
	provider: "fake",
	provider_model: "fake-fixture-v1",
	created_at: "2026-01-01T00:00:00.000Z",
};

// Shared fields that do not change across statuses
const baseJobFields = {
	id: JOB_UUID,
	monster: MONSTER_UUID,
	generation_mode: "fake",
	provider_info: {
		provider: "fake",
		provider_model: "fake-fixture-v1",
		provider_request_id: "",
	},
	generation_metadata: {
		prompt_version: "v1",
		prompt_hash: "abc123",
	},
	notify_when_done: {
		should_email_when_done: false,
		notified_at: null,
		notification_error: null,
	},
};

const validQueuedJob = {
	...baseJobFields,
	status: "queued",
	error_info: null,
	image: null,
	timestamps: {
		created_at: "2026-01-01T00:00:00.000Z",
		started_at: null,
		finished_at: null,
		updated_at: "2026-01-01T00:00:00.000Z",
	},
};

const validRunningJob = {
	...baseJobFields,
	status: "running",
	error_info: null,
	image: null,
	timestamps: {
		created_at: "2026-01-01T00:00:00.000Z",
		started_at: "2026-01-01T00:01:00.000Z",
		finished_at: null,
		updated_at: "2026-01-01T00:01:00.000Z",
	},
};

const validSucceededJob = {
	...baseJobFields,
	status: "succeeded",
	error_info: null,
	image: validImage,
	timestamps: {
		created_at: "2026-01-01T00:00:00.000Z",
		started_at: "2026-01-01T00:01:00.000Z",
		finished_at: "2026-01-01T00:02:00.000Z",
		updated_at: "2026-01-01T00:02:00.000Z",
	},
};

// The canonical failed job: failed before it ever started running (started_at is null).
// This is the key distinction from blocked — blocked always transitions from running.
const validFailedJob = {
	...baseJobFields,
	status: "failed",
	error_info: { code: "provider_error", message: "Image generation failed" },
	image: null,
	timestamps: {
		created_at: "2026-01-01T00:00:00.000Z",
		started_at: null,
		finished_at: "2026-01-01T00:02:00.000Z",
		updated_at: "2026-01-01T00:02:00.000Z",
	},
};

const validBlockedJob = {
	...baseJobFields,
	status: "blocked",
	error_info: { code: "content_policy", message: "Blocked by content filter" },
	image: null,
	timestamps: {
		created_at: "2026-01-01T00:00:00.000Z",
		started_at: "2026-01-01T00:01:00.000Z", // blocked always transitions from running
		finished_at: "2026-01-01T00:02:00.000Z",
		updated_at: "2026-01-01T00:02:00.000Z",
	},
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Monster_Image_Gen_Job_Schema (discriminated union)", () => {
	// ─── Union routing ──────────────────────────────────────────────────────────

	describe("union routing — correct status routes to the right subtype", () => {
		it("routes to queued when status is 'queued'", () => {
			expect(
				Monster_Image_Gen_Job_Schema.safeParse(validQueuedJob).success,
			).toBe(true);
		});

		it("routes to running when status is 'running'", () => {
			expect(
				Monster_Image_Gen_Job_Schema.safeParse(validRunningJob).success,
			).toBe(true);
		});

		it("routes to succeeded when status is 'succeeded'", () => {
			expect(
				Monster_Image_Gen_Job_Schema.safeParse(validSucceededJob).success,
			).toBe(true);
		});

		it("routes to failed when status is 'failed'", () => {
			expect(
				Monster_Image_Gen_Job_Schema.safeParse(validFailedJob).success,
			).toBe(true);
		});

		it("routes to blocked when status is 'blocked'", () => {
			expect(
				Monster_Image_Gen_Job_Schema.safeParse(validBlockedJob).success,
			).toBe(true);
		});

		it("rejects an unknown status value like 'canceled'", () => {
			expect(
				Monster_Image_Gen_Job_Schema.safeParse({
					...validQueuedJob,
					status: "canceled",
				}).success,
			).toBe(false);
		});

		it("rejects when status is missing entirely", () => {
			const { status: _status, ...withoutStatus } = validQueuedJob;
			expect(
				Monster_Image_Gen_Job_Schema.safeParse(withoutStatus).success,
			).toBe(false);
		});
	});

	// ─── Common fields ──────────────────────────────────────────────────────────

	describe("common fields (validated via queued as representative)", () => {
		it("allows monster to be null — a job may not be linked to a saved monster yet", () => {
			expect(
				Monster_Image_Gen_Job_Schema.safeParse({
					...validQueuedJob,
					monster: null,
				}).success,
			).toBe(true);
		});

		it("allows monster to be a valid UUID", () => {
			expect(
				Monster_Image_Gen_Job_Schema.safeParse({
					...validQueuedJob,
					monster: MONSTER_UUID,
				}).success,
			).toBe(true);
		});

		it("rejects a non-UUID value for monster", () => {
			expect(
				Monster_Image_Gen_Job_Schema.safeParse({
					...validQueuedJob,
					monster: "not-a-uuid",
				}).success,
			).toBe(false);
		});

		it("rejects an unknown generation_mode", () => {
			expect(
				Monster_Image_Gen_Job_Schema.safeParse({
					...validQueuedJob,
					generation_mode: "demo",
				}).success,
			).toBe(false);
		});

		it("rejects when provider_info is missing", () => {
			const { provider_info: _pi, ...withoutProviderInfo } = validQueuedJob;
			expect(
				Monster_Image_Gen_Job_Schema.safeParse(withoutProviderInfo).success,
			).toBe(false);
		});

		it("rejects when provider_info.provider is missing", () => {
			expect(
				Monster_Image_Gen_Job_Schema.safeParse({
					...validQueuedJob,
					provider_info: {
						provider_model: "fake-fixture-v1",
						provider_request_id: "",
					},
				}).success,
			).toBe(false);
		});

		it("rejects when generation_metadata is missing", () => {
			const { generation_metadata: _gm, ...withoutMeta } = validQueuedJob;
			expect(
				Monster_Image_Gen_Job_Schema.safeParse(withoutMeta).success,
			).toBe(false);
		});

		it("rejects when notify_when_done is missing", () => {
			const { notify_when_done: _nwd, ...withoutNotify } = validQueuedJob;
			expect(
				Monster_Image_Gen_Job_Schema.safeParse(withoutNotify).success,
			).toBe(false);
		});

		it("rejects should_email_when_done as a string instead of boolean", () => {
			expect(
				Monster_Image_Gen_Job_Schema.safeParse({
					...validQueuedJob,
					notify_when_done: {
						...validQueuedJob.notify_when_done,
						should_email_when_done: "true",
					},
				}).success,
			).toBe(false);
		});
	});

	// ─── Queued ─────────────────────────────────────────────────────────────────

	describe("Queued_Monster_Image_Gen_Job_Schema", () => {
		describe("valid inputs", () => {
			it("parses a valid queued job", () => {
				expect(
					Queued_Monster_Image_Gen_Job_Schema.safeParse(validQueuedJob).success,
				).toBe(true);
			});

			it("parses with monster as null — a queued job may not yet be linked to a saved monster", () => {
				expect(
					Queued_Monster_Image_Gen_Job_Schema.safeParse({
						...validQueuedJob,
						monster: null,
					}).success,
				).toBe(true);
			});
		});

		describe("rejects impossible state", () => {
			it("rejects when error_info is non-null — queued jobs have no error yet", () => {
				expect(
					Queued_Monster_Image_Gen_Job_Schema.safeParse({
						...validQueuedJob,
						error_info: { code: "too_early", message: "has not started" },
					}).success,
				).toBe(false);
			});

			it("rejects when image is non-null — queued jobs have not produced an image yet", () => {
				expect(
					Queued_Monster_Image_Gen_Job_Schema.safeParse({
						...validQueuedJob,
						image: validImage,
					}).success,
				).toBe(false);
			});

			it("rejects when timestamps.started_at is set — queued means not yet started", () => {
				expect(
					Queued_Monster_Image_Gen_Job_Schema.safeParse({
						...validQueuedJob,
						timestamps: {
							...validQueuedJob.timestamps,
							started_at: "2026-01-01T00:01:00.000Z",
						},
					}).success,
				).toBe(false);
			});

			it("rejects when timestamps.finished_at is set — queued is not a terminal state", () => {
				expect(
					Queued_Monster_Image_Gen_Job_Schema.safeParse({
						...validQueuedJob,
						timestamps: {
							...validQueuedJob.timestamps,
							finished_at: "2026-01-01T00:02:00.000Z",
						},
					}).success,
				).toBe(false);
			});

			it("rejects when status is not 'queued'", () => {
				expect(
					Queued_Monster_Image_Gen_Job_Schema.safeParse({
						...validQueuedJob,
						status: "running",
					}).success,
				).toBe(false);
			});
		});
	});

	// ─── Running ────────────────────────────────────────────────────────────────

	describe("Running_Monster_Image_Gen_Job_Schema", () => {
		describe("valid inputs", () => {
			it("parses a valid running job", () => {
				expect(
					Running_Monster_Image_Gen_Job_Schema.safeParse(validRunningJob)
						.success,
				).toBe(true);
			});
		});

		describe("rejects impossible state", () => {
			it("rejects when error_info is non-null — running jobs have no error yet", () => {
				expect(
					Running_Monster_Image_Gen_Job_Schema.safeParse({
						...validRunningJob,
						error_info: { code: "mid_run_error", message: "bad" },
					}).success,
				).toBe(false);
			});

			it("rejects when image is non-null — running jobs have not produced an image yet", () => {
				expect(
					Running_Monster_Image_Gen_Job_Schema.safeParse({
						...validRunningJob,
						image: validImage,
					}).success,
				).toBe(false);
			});

			it("rejects when timestamps.started_at is null — a running job must have started", () => {
				expect(
					Running_Monster_Image_Gen_Job_Schema.safeParse({
						...validRunningJob,
						timestamps: { ...validRunningJob.timestamps, started_at: null },
					}).success,
				).toBe(false);
			});

			it("rejects when timestamps.finished_at is set — running is not yet terminal", () => {
				expect(
					Running_Monster_Image_Gen_Job_Schema.safeParse({
						...validRunningJob,
						timestamps: {
							...validRunningJob.timestamps,
							finished_at: "2026-01-01T00:02:00.000Z",
						},
					}).success,
				).toBe(false);
			});

			it("rejects when status is not 'running'", () => {
				expect(
					Running_Monster_Image_Gen_Job_Schema.safeParse({
						...validRunningJob,
						status: "queued",
					}).success,
				).toBe(false);
			});
		});

		describe("cross-subtype contamination", () => {
			it("rejects a queued-shaped job — queued has null started_at but running requires it", () => {
				expect(
					Running_Monster_Image_Gen_Job_Schema.safeParse({
						...validQueuedJob,
						status: "running",
						// timestamps.started_at is null — invalid for running
					}).success,
				).toBe(false);
			});
		});
	});

	// ─── Succeeded ──────────────────────────────────────────────────────────────

	describe("Succeeded_Monster_Image_Gen_Job_Schema", () => {
		describe("valid inputs", () => {
			it("parses a valid succeeded job with a fully populated image", () => {
				expect(
					Succeeded_Monster_Image_Gen_Job_Schema.safeParse(validSucceededJob)
						.success,
				).toBe(true);
			});
		});

		describe("rejects impossible state", () => {
			it("rejects when error_info is non-null — success and error are mutually exclusive", () => {
				expect(
					Succeeded_Monster_Image_Gen_Job_Schema.safeParse({
						...validSucceededJob,
						error_info: {
							code: "impossible",
							message: "succeeded but also errored?",
						},
					}).success,
				).toBe(false);
			});

			it("rejects when image is null — a succeeded job must have produced an image", () => {
				expect(
					Succeeded_Monster_Image_Gen_Job_Schema.safeParse({
						...validSucceededJob,
						image: null,
					}).success,
				).toBe(false);
			});

			it("rejects when image has an invalid structure", () => {
				expect(
					Succeeded_Monster_Image_Gen_Job_Schema.safeParse({
						...validSucceededJob,
						image: { id: "not-a-uuid" }, // missing required fields
					}).success,
				).toBe(false);
			});

			it("rejects when timestamps.started_at is null — succeeded jobs must have started", () => {
				expect(
					Succeeded_Monster_Image_Gen_Job_Schema.safeParse({
						...validSucceededJob,
						timestamps: {
							...validSucceededJob.timestamps,
							started_at: null,
						},
					}).success,
				).toBe(false);
			});

			it("rejects when timestamps.finished_at is null — succeeded is a terminal state", () => {
				expect(
					Succeeded_Monster_Image_Gen_Job_Schema.safeParse({
						...validSucceededJob,
						timestamps: {
							...validSucceededJob.timestamps,
							finished_at: null,
						},
					}).success,
				).toBe(false);
			});

			it("rejects when status is not 'succeeded'", () => {
				expect(
					Succeeded_Monster_Image_Gen_Job_Schema.safeParse({
						...validSucceededJob,
						status: "running",
					}).success,
				).toBe(false);
			});
		});

		describe("cross-subtype contamination", () => {
			it("rejects a running-shaped job — running has no finished_at or image", () => {
				expect(
					Succeeded_Monster_Image_Gen_Job_Schema.safeParse({
						...validRunningJob,
						status: "succeeded",
						// timestamps.finished_at is null and image is null — both required for succeeded
					}).success,
				).toBe(false);
			});
		});
	});

	// ─── Failed ─────────────────────────────────────────────────────────────────

	describe("Failed_Monster_Image_Gen_Job_Schema", () => {
		describe("valid inputs", () => {
			it("parses a failed job that never started (started_at is null) — job can fail before ever running", () => {
				expect(
					Failed_Monster_Image_Gen_Job_Schema.safeParse(validFailedJob).success,
				).toBe(true);
			});

			it("parses a failed job that failed while running (started_at is set)", () => {
				expect(
					Failed_Monster_Image_Gen_Job_Schema.safeParse({
						...validFailedJob,
						timestamps: {
							...validFailedJob.timestamps,
							started_at: "2026-01-01T00:01:00.000Z",
						},
					}).success,
				).toBe(true);
			});
		});

		describe("rejects impossible state", () => {
			it("rejects when error_info is null — a failed job must have an error", () => {
				expect(
					Failed_Monster_Image_Gen_Job_Schema.safeParse({
						...validFailedJob,
						error_info: null,
					}).success,
				).toBe(false);
			});

			it("rejects when error_info is an empty object — both code and message are required", () => {
				expect(
					Failed_Monster_Image_Gen_Job_Schema.safeParse({
						...validFailedJob,
						error_info: {},
					}).success,
				).toBe(false);
			});

			it("rejects when error_info is missing the code field", () => {
				expect(
					Failed_Monster_Image_Gen_Job_Schema.safeParse({
						...validFailedJob,
						error_info: { message: "error with no code" },
					}).success,
				).toBe(false);
			});

			it("rejects when image is non-null — a failed job did not produce an image", () => {
				expect(
					Failed_Monster_Image_Gen_Job_Schema.safeParse({
						...validFailedJob,
						image: validImage,
					}).success,
				).toBe(false);
			});

			it("rejects when timestamps.finished_at is null — failed is a terminal state and must have a finish time", () => {
				expect(
					Failed_Monster_Image_Gen_Job_Schema.safeParse({
						...validFailedJob,
						timestamps: { ...validFailedJob.timestamps, finished_at: null },
					}).success,
				).toBe(false);
			});

			it("rejects when status is not 'failed'", () => {
				expect(
					Failed_Monster_Image_Gen_Job_Schema.safeParse({
						...validFailedJob,
						status: "blocked",
					}).success,
				).toBe(false);
			});
		});
	});

	// ─── Blocked ────────────────────────────────────────────────────────────────

	describe("Blocked_Monster_Image_Gen_Job_Schema", () => {
		describe("valid inputs", () => {
			it("parses a valid blocked job", () => {
				expect(
					Blocked_Monster_Image_Gen_Job_Schema.safeParse(validBlockedJob)
						.success,
				).toBe(true);
			});
		});

		describe("rejects impossible state", () => {
			it("rejects when error_info is null — a blocked job must have an error", () => {
				expect(
					Blocked_Monster_Image_Gen_Job_Schema.safeParse({
						...validBlockedJob,
						error_info: null,
					}).success,
				).toBe(false);
			});

			it("rejects when image is non-null — a blocked job did not produce an image", () => {
				expect(
					Blocked_Monster_Image_Gen_Job_Schema.safeParse({
						...validBlockedJob,
						image: validImage,
					}).success,
				).toBe(false);
			});

			it("rejects when timestamps.started_at is null — blocked only transitions from running, so started_at is always set", () => {
				expect(
					Blocked_Monster_Image_Gen_Job_Schema.safeParse({
						...validBlockedJob,
						timestamps: { ...validBlockedJob.timestamps, started_at: null },
					}).success,
				).toBe(false);
			});

			it("rejects when timestamps.finished_at is null — blocked is a terminal state", () => {
				expect(
					Blocked_Monster_Image_Gen_Job_Schema.safeParse({
						...validBlockedJob,
						timestamps: { ...validBlockedJob.timestamps, finished_at: null },
					}).success,
				).toBe(false);
			});

			it("rejects when status is not 'blocked'", () => {
				expect(
					Blocked_Monster_Image_Gen_Job_Schema.safeParse({
						...validBlockedJob,
						status: "failed",
					}).success,
				).toBe(false);
			});
		});

		describe("cross-subtype contamination", () => {
			it("rejects a failed-shaped job with null started_at — blocked always has started_at set", () => {
				// validFailedJob has started_at: null. Valid for failed, invalid for blocked.
				expect(
					Blocked_Monster_Image_Gen_Job_Schema.safeParse({
						...validFailedJob,
						status: "blocked",
						// timestamps.started_at is null — the key difference
					}).success,
				).toBe(false);
			});
		});
	});

	// ─── Failed vs Blocked distinction ──────────────────────────────────────────

	describe("failed vs blocked — the key difference is started_at nullability", () => {
		it("failed allows started_at to be null; blocked does not — a job can fail before it ever starts", () => {
			const jobWithNullStartedAt = {
				...validFailedJob,
				timestamps: { ...validFailedJob.timestamps, started_at: null },
			};
			expect(
				Failed_Monster_Image_Gen_Job_Schema.safeParse(jobWithNullStartedAt)
					.success,
			).toBe(true);
			expect(
				Blocked_Monster_Image_Gen_Job_Schema.safeParse({
					...jobWithNullStartedAt,
					status: "blocked",
				}).success,
			).toBe(false);
		});

		it("both failed and blocked require error_info — neither can succeed silently", () => {
			expect(
				Failed_Monster_Image_Gen_Job_Schema.safeParse({
					...validFailedJob,
					error_info: null,
				}).success,
			).toBe(false);
			expect(
				Blocked_Monster_Image_Gen_Job_Schema.safeParse({
					...validBlockedJob,
					error_info: null,
				}).success,
			).toBe(false);
		});

		it("both failed and blocked reject image being non-null — neither produced an image", () => {
			expect(
				Failed_Monster_Image_Gen_Job_Schema.safeParse({
					...validFailedJob,
					image: validImage,
				}).success,
			).toBe(false);
			expect(
				Blocked_Monster_Image_Gen_Job_Schema.safeParse({
					...validBlockedJob,
					image: validImage,
				}).success,
			).toBe(false);
		});

		it("both failed and blocked require finished_at", () => {
			expect(
				Failed_Monster_Image_Gen_Job_Schema.safeParse({
					...validFailedJob,
					timestamps: { ...validFailedJob.timestamps, finished_at: null },
				}).success,
			).toBe(false);
			expect(
				Blocked_Monster_Image_Gen_Job_Schema.safeParse({
					...validBlockedJob,
					timestamps: { ...validBlockedJob.timestamps, finished_at: null },
				}).success,
			).toBe(false);
		});
	});
});
