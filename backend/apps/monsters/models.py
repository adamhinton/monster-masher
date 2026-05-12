"""
Models for monster metadata, monster images, and monster image generation jobs.
"""

import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.accounts.models import UserProfile


class MonsterImageGenerationStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    RUNNING = "running", "Running"
    SUCCEEDED = "succeeded", "Succeeded"
    FAILED = "failed", "Failed"
    BLOCKED = "blocked", "Blocked"


class MonsterImageGenerationMode(models.TextChoices):
    # For testing - doesn't drain image gen credits
    FAKE = "fake", "Fake"
    REAL = "real", "Real"


class Monster(models.Model):
    """
    Saved monster metadata owned by one app user.

    Images live on MonsterImage.
    Generation lifecycle lives on MonsterImageGenerationJob.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="monsters",
    )

    display_name = models.CharField(max_length=80)
<<<<<<< HEAD
=======
    flavor_text = models.TextField(blank=True)
>>>>>>> image-gen-contract-foundation

    # This stuff will be a `traits` sub-object in the serializers
    element = models.CharField(max_length=20)
    habitat = models.CharField(max_length=60)
    personality = models.CharField(max_length=60)
    color_palette = models.CharField(max_length=80)
<<<<<<< HEAD
    flavor_text = models.TextField(blank=True)
=======
>>>>>>> image-gen-contract-foundation

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "monster"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"]),
            models.Index(fields=["owner", "display_name"]),
            models.Index(fields=["owner", "element"]),
        ]

    def __str__(self) -> str:
        return self.display_name


class MonsterImage(models.Model):
    """
    Stored image metadata for a generated monster image.

    Image bytes live in object storage, not Postgres.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    monster = models.ForeignKey(
        Monster,
        on_delete=models.CASCADE,
        related_name="images",
    )

    public_image_url = models.URLField(blank=True, null=True)
    image_storage_path = models.TextField(blank=True)

    provider = models.CharField(max_length=50)
    provider_model = models.CharField(max_length=100)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "monster_image"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["monster", "-created_at"]),
            models.Index(fields=["provider", "provider_model"]),
        ]

    def __str__(self) -> str:
        return f"Image for {self.monster_id}"


class MonsterImageGenerationJob(models.Model):
    """
    Durable lifecycle record for one monster image generation attempt.

    Raw prompts and raw provider responses are never stored here.
    Monster trait metadata belongs on Monster, not this model.

    Validators will ensure this is a discriminated union model based on `status` - e.g. a job with status "queued" must not have `started_at` or `finished_at` set, etc. This will also be modeled in the frontend types and enforced in the serializers.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    owner = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="image_generation_jobs",
    )

    monster = models.ForeignKey(
        Monster,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="image_generation_jobs",
    )

    image = models.OneToOneField(
        MonsterImage,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="generation_job",
    )

    status = models.CharField(
        max_length=20,
        choices=MonsterImageGenerationStatus.choices,
        default=MonsterImageGenerationStatus.QUEUED,
    )

    generation_mode = models.CharField(
        max_length=10,
        choices=MonsterImageGenerationMode.choices,
    )

    # This stuff will be a `generation_metadata` sub-object in the serializers
    sanitized_prompt = models.TextField(blank=True)
    prompt_version = models.CharField(max_length=40, blank=True)
    prompt_hash = models.CharField(max_length=64, blank=True)

    # This will be under provider_info in the serializers
    provider = models.CharField(max_length=50)
    provider_model = models.CharField(max_length=100)
    provider_request_id = models.CharField(max_length=120, blank=True)

    # This stuff will be a `notify_when_done` sub object in the serializers
    should_email_when_done = models.BooleanField(default=False)
    notified_at = models.DateTimeField(null=True, blank=True)
    notification_error_code = models.CharField(max_length=100, blank=True)
    notification_error_message = models.TextField(blank=True)

    # Will be under `error_info` in the serializers
    error_code = models.CharField(max_length=100, blank=True)
    safe_error_message = models.TextField(blank=True)

    # This will be under timestamps in the serializers
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "monster_image_generation_job"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"]),
            models.Index(fields=["owner", "status", "-created_at"]),
            models.Index(fields=["monster", "-created_at"]),
            models.Index(fields=["generation_mode", "status"]),
        ]
        constraints = [
            # ── Timestamp rules ──────────────────────────────────────────────────
            # queued: no lifecycle timestamps at all
            models.CheckConstraint(
                condition=~(
                    Q(status=MonsterImageGenerationStatus.QUEUED)
                    & (Q(started_at__isnull=False) | Q(finished_at__isnull=False))
                ),
                name="job_queued_no_timestamps",
            ),
            # running: started_at set, finished_at not yet set
            models.CheckConstraint(
                condition=~(
                    Q(status=MonsterImageGenerationStatus.RUNNING)
                    & (Q(started_at__isnull=True) | Q(finished_at__isnull=False))
                ),
                name="job_running_started_not_finished",
            ),
            # succeeded: both timestamps required
            models.CheckConstraint(
                condition=~(
                    Q(status=MonsterImageGenerationStatus.SUCCEEDED)
                    & (Q(started_at__isnull=True) | Q(finished_at__isnull=True))
                ),
                name="job_succeeded_both_timestamps",
            ),
            # failed: finished_at required; started_at may be null if job failed
            # before it was ever started (QUEUED → FAILED is a valid transition)
            models.CheckConstraint(
                condition=~(
                    Q(status=MonsterImageGenerationStatus.FAILED)
                    & Q(finished_at__isnull=True)
                ),
                name="job_failed_has_finished_at",
            ),
            # blocked: both timestamps required; blocked only transitions from RUNNING
            models.CheckConstraint(
                condition=~(
                    Q(status=MonsterImageGenerationStatus.BLOCKED)
                    & (Q(started_at__isnull=True) | Q(finished_at__isnull=True))
                ),
                name="job_blocked_both_timestamps",
            ),
            # ── Error code rules ─────────────────────────────────────────────────
            # queued and running: no error yet
            models.CheckConstraint(
                condition=~(
                    Q(
                        status__in=[
                            MonsterImageGenerationStatus.QUEUED,
                            MonsterImageGenerationStatus.RUNNING,
                        ]
                    )
                    & ~Q(error_code="")
                ),
                name="job_active_no_error",
            ),
            # succeeded: no error (success and error are mutually exclusive)
            models.CheckConstraint(
                condition=~(
                    Q(status=MonsterImageGenerationStatus.SUCCEEDED) & ~Q(error_code="")
                ),
                name="job_succeeded_no_error",
            ),
            # failed: must have an error_code
            models.CheckConstraint(
                condition=~(
                    Q(status=MonsterImageGenerationStatus.FAILED) & Q(error_code="")
                ),
                name="job_failed_has_error_code",
            ),
            # blocked: must have an error_code
            models.CheckConstraint(
                condition=~(
                    Q(status=MonsterImageGenerationStatus.BLOCKED) & Q(error_code="")
                ),
                name="job_blocked_has_error_code",
            ),
            # ── Image rules ──────────────────────────────────────────────────────
            # queued and running: image is not yet produced
            models.CheckConstraint(
                condition=~(
                    Q(
                        status__in=[
                            MonsterImageGenerationStatus.QUEUED,
                            MonsterImageGenerationStatus.RUNNING,
                        ]
                    )
                    & Q(image_id__isnull=False)
                ),
                name="job_active_no_image",
            ),
            # succeeded: must have an attached image
            models.CheckConstraint(
                condition=~(
                    Q(status=MonsterImageGenerationStatus.SUCCEEDED)
                    & Q(image_id__isnull=True)
                ),
                name="job_succeeded_has_image",
            ),
            # failed and blocked: no image (job did not produce one)
            models.CheckConstraint(
                condition=~(
                    Q(
                        status__in=[
                            MonsterImageGenerationStatus.FAILED,
                            MonsterImageGenerationStatus.BLOCKED,
                        ]
                    )
                    & Q(image_id__isnull=False)
                ),
                name="job_terminal_error_no_image",
            ),
            # ── Notification rules ───────────────────────────────────────────────
            # notified_at can only be set when email delivery was requested
            models.CheckConstraint(
                condition=~(
                    Q(should_email_when_done=False) & Q(notified_at__isnull=False)
                ),
                name="job_notified_at_only_when_email_enabled",
            ),
            # notification error fields can only be set when email delivery was requested
            models.CheckConstraint(
                condition=~(
                    Q(should_email_when_done=False)
                    & (
                        ~Q(notification_error_code="")
                        | ~Q(notification_error_message="")
                    )
                ),
                name="job_notification_error_only_when_email_enabled",
            ),
        ]

    # ── State validation ─────────────────────────────────────────────────────

    def clean(self) -> None:
        """
        Enforce the job status state machine at the Django level.

        This mirrors the DB-level CheckConstraints but provides human-readable
        error messages in admin forms and serializer validation.

        Valid states per status:

            QUEUED   — no timestamps, no error, no image
            RUNNING  — started_at set, no finished_at, no error, no image
            SUCCEEDED — both timestamps set, no error, image attached
            FAILED   — finished_at set, error_code set, no image
                       (started_at optional: job may have failed before running)
            BLOCKED  — both timestamps set, error_code set, no image
                       (always transitions from RUNNING so started_at required)
        """
        S = MonsterImageGenerationStatus
        errors: dict = {}

        # ── Timestamp rules ──────────────────────────────────────────────────
        if self.status == S.QUEUED:
            if self.started_at is not None:
<<<<<<< HEAD
                errors["started_at"] = "Queued jobs must not have a started_at timestamp."
            if self.finished_at is not None:
                errors["finished_at"] = "Queued jobs must not have a finished_at timestamp."
=======
                errors["started_at"] = (
                    "Queued jobs must not have a started_at timestamp."
                )
            if self.finished_at is not None:
                errors["finished_at"] = (
                    "Queued jobs must not have a finished_at timestamp."
                )
>>>>>>> image-gen-contract-foundation
        elif self.status == S.RUNNING:
            if self.started_at is None:
                errors["started_at"] = "Running jobs must have a started_at timestamp."
            if self.finished_at is not None:
<<<<<<< HEAD
                errors["finished_at"] = "Running jobs must not have a finished_at timestamp."
        elif self.status == S.SUCCEEDED:
            if self.started_at is None:
                errors["started_at"] = "Succeeded jobs must have a started_at timestamp."
            if self.finished_at is None:
                errors["finished_at"] = "Succeeded jobs must have a finished_at timestamp."
=======
                errors["finished_at"] = (
                    "Running jobs must not have a finished_at timestamp."
                )
        elif self.status == S.SUCCEEDED:
            if self.started_at is None:
                errors["started_at"] = (
                    "Succeeded jobs must have a started_at timestamp."
                )
            if self.finished_at is None:
                errors["finished_at"] = (
                    "Succeeded jobs must have a finished_at timestamp."
                )
>>>>>>> image-gen-contract-foundation
        elif self.status == S.FAILED:
            if self.finished_at is None:
                errors["finished_at"] = "Failed jobs must have a finished_at timestamp."
        elif self.status == S.BLOCKED:
            if self.started_at is None:
                errors["started_at"] = "Blocked jobs must have a started_at timestamp."
            if self.finished_at is None:
<<<<<<< HEAD
                errors["finished_at"] = "Blocked jobs must have a finished_at timestamp."
=======
                errors["finished_at"] = (
                    "Blocked jobs must have a finished_at timestamp."
                )
>>>>>>> image-gen-contract-foundation

        # ── Error code rules ─────────────────────────────────────────────────
        if self.status in (S.QUEUED, S.RUNNING, S.SUCCEEDED):
            if self.error_code:
                errors["error_code"] = (
                    f"{self.get_status_display()} jobs must not have an error_code."
                )
        elif self.status in (S.FAILED, S.BLOCKED):
            if not self.error_code:
                errors["error_code"] = (
                    f"{self.get_status_display()} jobs must have an error_code."
                )

        # ── Image rules ──────────────────────────────────────────────────────
        if self.status in (S.QUEUED, S.RUNNING):
            if self.image_id is not None:
                errors["image"] = (
                    f"{self.get_status_display()} jobs must not have an attached image."
                )
        elif self.status == S.SUCCEEDED:
            if self.image_id is None:
                errors["image"] = "Succeeded jobs must have an attached image."
        elif self.status in (S.FAILED, S.BLOCKED):
            if self.image_id is not None:
                errors["image"] = (
                    f"{self.get_status_display()} jobs must not have an attached image."
                )

        # ── Notification rules ───────────────────────────────────────────────
        if not self.should_email_when_done:
            if self.notified_at is not None:
                errors["notified_at"] = (
                    "notified_at can only be set when should_email_when_done is True."
                )
            if self.notification_error_code:
                errors["notification_error_code"] = (
                    "notification_error_code can only be set when should_email_when_done is True."
                )
            if self.notification_error_message:
                errors["notification_error_message"] = (
                    "notification_error_message can only be set when should_email_when_done is True."
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"Job {self.id} [{self.status}] for owner {self.owner_id}"
