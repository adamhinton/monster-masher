"""
Service functions for MonsterImageGenerationJob lifecycle transitions.

Each function is a plain module-level function — no class wrapper.

Valid transitions:
    create  → QUEUED
    QUEUED  → RUNNING   (mark_job_running)
    QUEUED  → FAILED    (mark_job_failed)   # job can fail before it ever starts
    RUNNING → SUCCEEDED (mark_job_succeeded)
    RUNNING → FAILED    (mark_job_failed)
    RUNNING → BLOCKED   (mark_job_blocked)

Terminal states (SUCCEEDED, FAILED, BLOCKED) cannot transition further.

All functions call model.save(), which invokes full_clean() and enforces
the DB-level CheckConstraints via the model's clean() method.
"""

from django.utils import timezone

from apps.accounts.models import UserProfile
from apps.monsters.models import (
    MonsterImage,
    MonsterImageGenerationJob,
    MonsterImageGenerationMode,
    MonsterImageGenerationStatus,
)


class InvalidJobTransition(Exception):
    """
    Raised when a service function is called on a job that is not in a
    state that allows the requested transition.

    Attributes:
        job_id:          UUID of the job that was in the wrong state.
        current_status:  The status the job was in when the error occurred.
        attempted:       Human-readable description of what was attempted.
    """

    def __init__(
        self,
        job: MonsterImageGenerationJob,
        attempted: str,
    ) -> None:
        self.job_id = job.id
        self.current_status = job.status
        self.attempted = attempted
        super().__init__(
            f"Cannot {attempted} job {job.id!s}: current status is '{job.status}'."
        )


# ---------------------------------------------------------------------------
# Terminal statuses — no further transitions are allowed from these.
# ---------------------------------------------------------------------------
_TERMINAL_STATUSES = frozenset(
    [
        MonsterImageGenerationStatus.SUCCEEDED,
        MonsterImageGenerationStatus.FAILED,
        MonsterImageGenerationStatus.BLOCKED,
    ]
)


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


def create_generation_job(
    *,
    owner: UserProfile,
    generation_mode: MonsterImageGenerationMode,
    provider: str,
    provider_model: str,
    should_email_when_done: bool = False,
    sanitized_prompt: str = "",
    prompt_version: str = "",
    prompt_hash: str = "",
    provider_request_id: str = "",
) -> MonsterImageGenerationJob:
    """
    Create a new MonsterImageGenerationJob in QUEUED status.

    The job has no started_at, no finished_at, no image, and no error —
    consistent with the QUEUED state machine rules enforced by the model.

    Args:
        owner:                 UserProfile that owns this job. Always set
                               from verified auth — never from client input.
        generation_mode:       MonsterImageGenerationMode value ('fake' or 'real').
        provider:              Provider label, e.g. 'fake' or 'openai'.
        provider_model:        Provider model label, e.g. 'fake-fixture-v1'.
        should_email_when_done: Whether to email the owner when the job finishes.
        sanitized_prompt:      Safe sanitized prompt text. Never the raw prompt.
        prompt_version:        Optional version label for the prompt template.
        prompt_hash:           Optional hash of the prompt for deduplication/debugging.
        provider_request_id:   Optional ID from the provider (blank at creation time).

    Returns:
        The saved MonsterImageGenerationJob instance.
    """
    job = MonsterImageGenerationJob(
        owner=owner,
        status=MonsterImageGenerationStatus.QUEUED,
        generation_mode=generation_mode,
        provider=provider,
        provider_model=provider_model,
        should_email_when_done=should_email_when_done,
        sanitized_prompt=sanitized_prompt,
        prompt_version=prompt_version,
        prompt_hash=prompt_hash,
        provider_request_id=provider_request_id,
        # Explicit nulls for clarity — matches QUEUED state constraints.
        started_at=None,
        finished_at=None,
        image=None,
        monster=None,
        error_code="",
        safe_error_message="",
    )
    job.save()
    return job


def mark_job_running(job: MonsterImageGenerationJob) -> MonsterImageGenerationJob:
    """
    Transition a QUEUED job to RUNNING.

    Sets started_at to the current time.

    Args:
        job: A MonsterImageGenerationJob that must currently be QUEUED.

    Returns:
        The updated job instance.

    Raises:
        InvalidJobTransition: If the job is not currently QUEUED.
    """
    if job.status != MonsterImageGenerationStatus.QUEUED:
        raise InvalidJobTransition(job, attempted="mark as running")

    job.status = MonsterImageGenerationStatus.RUNNING
    job.started_at = timezone.now()
    # Explicitly clear fields that must be absent in RUNNING state.
    # These should already be unset (QUEUED enforces it), but being
    # explicit here mirrors the pattern used in the other transition functions.
    job.finished_at = None
    job.image = None
    job.error_code = ""
    job.safe_error_message = ""
    job.save()
    return job


def mark_job_succeeded(
    job: MonsterImageGenerationJob,
    monster_image: MonsterImage,
) -> MonsterImageGenerationJob:
    """
    Transition a RUNNING job to SUCCEEDED.

    Sets finished_at to the current time and links the produced MonsterImage.
    Clears any error fields (there must not be an error on a succeeded job).

    Args:
        job:           A MonsterImageGenerationJob that must currently be RUNNING.
        monster_image: The MonsterImage produced by this generation run.

    Returns:
        The updated job instance.

    Raises:
        InvalidJobTransition: If the job is not currently RUNNING.
    """
    if job.status != MonsterImageGenerationStatus.RUNNING:
        raise InvalidJobTransition(job, attempted="mark as succeeded")

    job.status = MonsterImageGenerationStatus.SUCCEEDED
    job.finished_at = timezone.now()
    job.image = monster_image
    # Explicitly clear error fields — the model constraint forbids them on SUCCEEDED,
    # but being explicit here makes the intent clear and guards against stale data.
    job.error_code = ""
    job.safe_error_message = ""
    job.save()
    return job


def mark_job_failed(
    job: MonsterImageGenerationJob,
    error_code: str,
    safe_error_message: str,
) -> MonsterImageGenerationJob:
    """
    Transition a QUEUED or RUNNING job to FAILED.

    FAILED is reachable from both QUEUED (job failed before it could start,
    e.g. validation or moderation failure) and RUNNING (provider error).

    Sets finished_at and records safe error information. Does not attach an image.

    Args:
        job:               A MonsterImageGenerationJob in QUEUED or RUNNING status.
        error_code:        Short machine-readable error code, e.g. 'provider_timeout'.
        safe_error_message: User-safe description of the failure.

    Returns:
        The updated job instance.

    Raises:
        InvalidJobTransition: If the job is already in a terminal state.
        ValueError:           If error_code is blank (callers must always provide one).
    """
    if job.status in _TERMINAL_STATUSES:
        raise InvalidJobTransition(job, attempted="mark as failed")

    if not error_code:
        raise ValueError("error_code must not be blank when marking a job failed.")

    job.status = MonsterImageGenerationStatus.FAILED
    job.finished_at = timezone.now()
    job.error_code = error_code
    job.safe_error_message = safe_error_message
    # Ensure no image is attached — failed jobs never produce an image.
    job.image = None
    job.save()
    return job


def mark_job_blocked(
    job: MonsterImageGenerationJob,
    error_code: str,
    safe_error_message: str,
) -> MonsterImageGenerationJob:
    """
    Transition a RUNNING job to BLOCKED.

    BLOCKED is used for content moderation rejections or policy blocks —
    cases where the job ran but was intentionally stopped rather than
    failing due to a technical error. BLOCKED only transitions from RUNNING
    (the job must have started before it could be blocked).

    Sets both started_at (already set from RUNNING) and finished_at.
    Records safe error information. Does not attach an image.

    Args:
        job:               A MonsterImageGenerationJob that must currently be RUNNING.
        error_code:        Short machine-readable code, e.g. 'content_policy_violation'.
        safe_error_message: User-safe description of why the job was blocked.

    Returns:
        The updated job instance.

    Raises:
        InvalidJobTransition: If the job is not currently RUNNING.
        ValueError:           If error_code is blank.
    """
    if job.status != MonsterImageGenerationStatus.RUNNING:
        raise InvalidJobTransition(job, attempted="mark as blocked")

    if not error_code:
        raise ValueError("error_code must not be blank when marking a job blocked.")

    job.status = MonsterImageGenerationStatus.BLOCKED
    job.finished_at = timezone.now()
    job.error_code = error_code
    job.safe_error_message = safe_error_message
    # Ensure no image is attached — blocked jobs never produce an image.
    job.image = None
    job.save()
    return job
