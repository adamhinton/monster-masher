"""
Models for monster metadata, monster images, and monster image generation jobs.
"""

import uuid

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

    # This stuff will be a `traits` sub-object in the serializers
    element = models.CharField(max_length=20)
    habitat = models.CharField(max_length=60)
    personality = models.CharField(max_length=60)
    color_palette = models.CharField(max_length=80)
    flavor_text = models.TextField(blank=True)

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
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="image_generation_jobs",
    )

    image = models.OneToOneField(
        MonsterImage,
        on_delete=models.SET_NULL,
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
            # queued jobs must not have lifecycle timestamps
            models.CheckConstraint(
                condition=~(
                    Q(status="queued")
                    & (Q(started_at__isnull=False) | Q(finished_at__isnull=False))
                ),
                name="job_queued_has_no_timestamps",
            ),
            # running jobs must have started_at and must not have finished_at
            models.CheckConstraint(
                condition=~(
                    Q(status="running")
                    & (Q(started_at__isnull=True) | Q(finished_at__isnull=False))
                ),
                name="job_running_has_started_at_only",
            ),
            # succeeded jobs must have both timestamps
            models.CheckConstraint(
                condition=~(
                    Q(status="succeeded")
                    & (Q(started_at__isnull=True) | Q(finished_at__isnull=True))
                ),
                name="job_succeeded_has_both_timestamps",
            ),
            # failed and blocked jobs must have both timestamps
            models.CheckConstraint(
                condition=~(
                    (Q(status="failed") | Q(status="blocked"))
                    & (Q(started_at__isnull=True) | Q(finished_at__isnull=True))
                ),
                name="job_failed_blocked_have_both_timestamps",
            ),
            # notification error fields must only be set when email was requested
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

    def __str__(self) -> str:
        return f"Job {self.id} [{self.status}] for owner {self.owner_id}"
