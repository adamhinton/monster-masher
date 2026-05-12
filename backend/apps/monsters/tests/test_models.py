"""
Comprehensive model-layer tests for Monster, MonsterImage, and
MonsterImageGenerationJob.
"""

import uuid

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import UserProfile
from apps.monsters.models import (
    Monster,
    MonsterImage,
    MonsterImageGenerationJob,
    MonsterImageGenerationMode,
    MonsterImageGenerationStatus,
)
from apps.monsters.services.generation_jobs import (
    create_generation_job,
    mark_job_running,
    mark_job_succeeded,
    mark_job_failed,
    mark_job_blocked,
)


# ---------------------------------------------------------------------------
# Shared test helpers
# ---------------------------------------------------------------------------


def _make_profile(email="test@example.com") -> UserProfile:
    return UserProfile.objects.create(
        supabase_user_id=uuid.uuid4(), email=email
    )


def _make_monster(owner: UserProfile, display_name: str = "Mucksnout") -> Monster:
    return Monster.objects.create(
        owner=owner,
        display_name=display_name,
        element="fire",
        habitat="volcano",
        personality="grumpy",
        color_palette="red and black",
        flavor_text="A cranky swamp goblin.",
    )


def _make_monster_image(monster: Monster) -> MonsterImage:
    return MonsterImage.objects.create(
        monster=monster,
        public_image_url="https://placehold.co/512x512.png",
        image_storage_path="monsters/test.png",
        provider="fake",
        provider_model="fake-fixture-v1",
    )


def _make_queued_job(owner: UserProfile) -> MonsterImageGenerationJob:
    return create_generation_job(
        owner=owner,
        generation_mode=MonsterImageGenerationMode.FAKE,
        provider="fake",
        provider_model="fake-fixture-v1",
    )


def _make_running_job(owner: UserProfile) -> MonsterImageGenerationJob:
    job = _make_queued_job(owner)
    return mark_job_running(job)


def _make_succeeded_job(
    owner: UserProfile, monster: Monster
) -> MonsterImageGenerationJob:
    job = _make_running_job(owner)
    image = _make_monster_image(monster)
    return mark_job_succeeded(job, image)


def _make_failed_job(
    owner: UserProfile, from_running: bool = False
) -> MonsterImageGenerationJob:
    if from_running:
        job = _make_running_job(owner)
    else:
        job = _make_queued_job(owner)
    return mark_job_failed(job, error_code="test_error", safe_error_message="Failed.")


def _make_blocked_job(owner: UserProfile) -> MonsterImageGenerationJob:
    job = _make_running_job(owner)
    return mark_job_blocked(job, error_code="content_policy", safe_error_message="Blocked.")


# ===========================================================================
# Monster model tests
# ===========================================================================


class MonsterModelTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()

    # ── Valid creation ───────────────────────────────────────────────────────

    def test_valid_monster_creation(self):
        monster = _make_monster(self.owner)
        self.assertIsNotNone(monster.pk)
        self.assertEqual(monster.display_name, "Mucksnout")
        self.assertEqual(monster.element, "fire")
        self.assertEqual(monster.habitat, "volcano")
        self.assertEqual(monster.personality, "grumpy")
        self.assertEqual(monster.color_palette, "red and black")
        self.assertEqual(monster.flavor_text, "A cranky swamp goblin.")

    def test_uuid_primary_key_auto_generated(self):
        monster = _make_monster(self.owner)
        self.assertIsInstance(monster.pk, uuid.UUID)

    def test_two_monsters_have_different_uuids(self):
        m1 = _make_monster(self.owner, "Alpha")
        m2 = _make_monster(self.owner, "Beta")
        self.assertNotEqual(m1.pk, m2.pk)

    def test_flavor_text_optional(self):
        monster = Monster.objects.create(
            owner=self.owner,
            display_name="Bare Bones",
            element="air",
            habitat="sky",
            personality="calm",
            color_palette="white",
            # flavor_text omitted
        )
        self.assertEqual(monster.flavor_text, "")

    def test_created_at_and_updated_at_auto_set(self):
        monster = _make_monster(self.owner)
        self.assertIsNotNone(monster.created_at)
        self.assertIsNotNone(monster.updated_at)

    def test_owner_fk_is_set_correctly(self):
        monster = _make_monster(self.owner)
        self.assertEqual(monster.owner_id, self.owner.pk)

    def test_str_representation_is_display_name(self):
        monster = _make_monster(self.owner, "Gloopbeast")
        self.assertEqual(str(monster), "Gloopbeast")

    # ── Field presence / absence ─────────────────────────────────────────────

    def test_monster_has_no_image_url_field(self):
        """Monster must not expose image URLs — those belong on MonsterImage."""
        monster = _make_monster(self.owner)
        self.assertFalse(hasattr(monster, "public_image_url"))
        self.assertFalse(hasattr(monster, "image_url"))

    def test_monster_has_no_image_storage_path_field(self):
        monster = _make_monster(self.owner)
        self.assertFalse(hasattr(monster, "image_storage_path"))

    def test_monster_has_no_provider_field(self):
        monster = _make_monster(self.owner)
        self.assertFalse(hasattr(monster, "provider"))

    def test_monster_has_no_status_field(self):
        """Generation lifecycle lives on MonsterImageGenerationJob, not Monster."""
        monster = _make_monster(self.owner)
        self.assertFalse(hasattr(monster, "status"))

    def test_monster_has_no_error_code_field(self):
        monster = _make_monster(self.owner)
        self.assertFalse(hasattr(monster, "error_code"))

    def test_monster_has_no_started_at_field(self):
        monster = _make_monster(self.owner)
        self.assertFalse(hasattr(monster, "started_at"))

    def test_monster_has_no_finished_at_field(self):
        monster = _make_monster(self.owner)
        self.assertFalse(hasattr(monster, "finished_at"))

    def test_monster_has_no_raw_prompt_field(self):
        monster = _make_monster(self.owner)
        self.assertFalse(hasattr(monster, "raw_prompt"))
        self.assertFalse(hasattr(monster, "sanitized_prompt"))

    # ── Owner security ───────────────────────────────────────────────────────

    def test_monster_owner_cannot_be_null(self):
        """Owner FK is required — monsters must always belong to a user."""
        with self.assertRaises(Exception):
            Monster.objects.create(
                owner=None,
                display_name="Ownerless",
                element="fire",
                habitat="cave",
                personality="lonely",
                color_palette="grey",
            )

    def test_client_cannot_bypass_owner_by_setting_owner_id(self):
        """
        Verify that creating a Monster with an arbitrary owner_id that
        does not correspond to any UserProfile row violates the FK constraint.

        SQLite defers FK checks to end-of-transaction, so we trigger
        check_constraints() explicitly inside an atomic savepoint to catch
        the violation before it silently contaminates the test database.
        """
        from django.db import IntegrityError, connection, transaction

        fake_profile_pk = uuid.uuid4()
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Monster.objects.create(
                    owner_id=fake_profile_pk,  # non-existent UserProfile
                    display_name="Intruder",
                    element="shadow",
                    habitat="void",
                    personality="sneaky",
                    color_palette="black",
                )
                connection.check_constraints()

    # ── Cascade ──────────────────────────────────────────────────────────────

    def test_deleting_owner_cascades_to_monsters(self):
        monster = _make_monster(self.owner)
        monster_id = monster.pk
        self.owner.delete()
        self.assertFalse(Monster.objects.filter(pk=monster_id).exists())

    # ── Multiple monsters per user ────────────────────────────────────────────

    def test_user_can_own_multiple_monsters(self):
        _make_monster(self.owner, "Alpha")
        _make_monster(self.owner, "Beta")
        _make_monster(self.owner, "Gamma")
        self.assertEqual(Monster.objects.filter(owner=self.owner).count(), 3)

    def test_monsters_ordered_newest_first(self):
        m1 = _make_monster(self.owner, "Old")
        m2 = _make_monster(self.owner, "New")
        monsters = list(Monster.objects.filter(owner=self.owner))
        self.assertEqual(monsters[0].pk, m2.pk)
        self.assertEqual(monsters[1].pk, m1.pk)


# ===========================================================================
# MonsterImage model tests
# ===========================================================================


class MonsterImageModelTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()
        self.monster = _make_monster(self.owner)

    # ── Valid creation ───────────────────────────────────────────────────────

    def test_valid_creation_with_public_image_url(self):
        image = MonsterImage.objects.create(
            monster=self.monster,
            public_image_url="https://example.com/monster.png",
            image_storage_path="monsters/abc.png",
            provider="fake",
            provider_model="fake-fixture-v1",
        )
        self.assertIsNotNone(image.pk)
        self.assertEqual(image.public_image_url, "https://example.com/monster.png")

    def test_valid_creation_without_public_image_url(self):
        """public_image_url is nullable — the image may not yet be uploaded."""
        image = MonsterImage.objects.create(
            monster=self.monster,
            public_image_url=None,
            image_storage_path="monsters/pending.png",
            provider="fake",
            provider_model="fake-fixture-v1",
        )
        self.assertIsNone(image.public_image_url)

    def test_valid_creation_with_blank_storage_path(self):
        image = MonsterImage.objects.create(
            monster=self.monster,
            public_image_url="https://example.com/img.png",
            image_storage_path="",
            provider="fake",
            provider_model="fake-fixture-v1",
        )
        self.assertEqual(image.image_storage_path, "")

    def test_uuid_primary_key_auto_generated(self):
        image = _make_monster_image(self.monster)
        self.assertIsInstance(image.pk, uuid.UUID)

    def test_created_at_auto_set(self):
        image = _make_monster_image(self.monster)
        self.assertIsNotNone(image.created_at)

    def test_str_representation_references_monster(self):
        image = _make_monster_image(self.monster)
        self.assertIn(str(self.monster.pk), str(image))

    # ── Field presence / absence ─────────────────────────────────────────────

    def test_monster_image_has_no_image_bytes_field(self):
        image = _make_monster_image(self.monster)
        self.assertFalse(hasattr(image, "image_bytes"))
        self.assertFalse(hasattr(image, "image_data"))

    def test_monster_image_has_no_base64_field(self):
        image = _make_monster_image(self.monster)
        self.assertFalse(hasattr(image, "base64"))
        self.assertFalse(hasattr(image, "image_base64"))

    def test_monster_image_has_no_raw_provider_response_field(self):
        image = _make_monster_image(self.monster)
        self.assertFalse(hasattr(image, "raw_provider_response"))
        self.assertFalse(hasattr(image, "provider_response"))

    def test_monster_image_has_no_is_primary_field(self):
        """is_primary was explicitly deferred in Step 2b."""
        image = _make_monster_image(self.monster)
        self.assertFalse(hasattr(image, "is_primary"))

    # ── Cascade ──────────────────────────────────────────────────────────────

    def test_deleting_monster_cascades_to_monster_image(self):
        image = _make_monster_image(self.monster)
        image_id = image.pk
        self.monster.delete()
        self.assertFalse(MonsterImage.objects.filter(pk=image_id).exists())

    # ── Monster FK ───────────────────────────────────────────────────────────

    def test_monster_image_monster_fk_is_required(self):
        with self.assertRaises(Exception):
            MonsterImage.objects.create(
                monster=None,
                provider="fake",
                provider_model="fake-v1",
            )

    def test_multiple_images_per_monster(self):
        _make_monster_image(self.monster)
        _make_monster_image(self.monster)
        self.assertEqual(MonsterImage.objects.filter(monster=self.monster).count(), 2)


# ===========================================================================
# MonsterImageGenerationJob — QUEUED state
# ===========================================================================


class JobQueuedStateTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()

    def test_newly_created_job_is_queued(self):
        job = _make_queued_job(self.owner)
        self.assertEqual(job.status, MonsterImageGenerationStatus.QUEUED)

    def test_queued_job_has_no_started_at(self):
        job = _make_queued_job(self.owner)
        self.assertIsNone(job.started_at)

    def test_queued_job_has_no_finished_at(self):
        job = _make_queued_job(self.owner)
        self.assertIsNone(job.finished_at)

    def test_queued_job_has_no_error_code(self):
        job = _make_queued_job(self.owner)
        self.assertEqual(job.error_code, "")

    def test_queued_job_has_no_image(self):
        job = _make_queued_job(self.owner)
        self.assertIsNone(job.image_id)

    def test_queued_job_has_uuid_primary_key(self):
        job = _make_queued_job(self.owner)
        self.assertIsInstance(job.pk, uuid.UUID)

    def test_queued_job_has_no_safe_error_message(self):
        job = _make_queued_job(self.owner)
        self.assertEqual(job.safe_error_message, "")

    # ── Invalid: timestamps forbidden on QUEUED ──────────────────────────────

    def test_queued_rejects_started_at(self):
        job = _make_queued_job(self.owner)
        job.started_at = timezone.now()
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("started_at", ctx.exception.message_dict)

    def test_queued_rejects_finished_at(self):
        job = _make_queued_job(self.owner)
        job.finished_at = timezone.now()
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("finished_at", ctx.exception.message_dict)

    def test_queued_rejects_both_timestamps(self):
        job = _make_queued_job(self.owner)
        now = timezone.now()
        job.started_at = now
        job.finished_at = now
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("started_at", ctx.exception.message_dict)
        self.assertIn("finished_at", ctx.exception.message_dict)

    # ── Invalid: error fields forbidden on QUEUED ────────────────────────────

    def test_queued_rejects_error_code(self):
        job = _make_queued_job(self.owner)
        job.error_code = "some_error"
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("error_code", ctx.exception.message_dict)

    # ── Invalid: image forbidden on QUEUED ──────────────────────────────────

    def test_queued_rejects_attached_image(self):
        monster = _make_monster(self.owner)
        image = _make_monster_image(monster)
        job = _make_queued_job(self.owner)
        job.image = image
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("image", ctx.exception.message_dict)


# ===========================================================================
# MonsterImageGenerationJob — RUNNING state
# ===========================================================================


class JobRunningStateTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()

    def test_running_job_has_started_at(self):
        job = _make_running_job(self.owner)
        self.assertIsNotNone(job.started_at)

    def test_running_job_has_no_finished_at(self):
        job = _make_running_job(self.owner)
        self.assertIsNone(job.finished_at)

    def test_running_job_has_no_error_code(self):
        job = _make_running_job(self.owner)
        self.assertEqual(job.error_code, "")

    def test_running_job_has_no_image(self):
        job = _make_running_job(self.owner)
        self.assertIsNone(job.image_id)

    # ── Invalid: started_at required on RUNNING ──────────────────────────────

    def test_running_rejects_missing_started_at(self):
        job = _make_running_job(self.owner)
        job.started_at = None
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("started_at", ctx.exception.message_dict)

    # ── Invalid: finished_at forbidden on RUNNING ────────────────────────────

    def test_running_rejects_finished_at(self):
        job = _make_running_job(self.owner)
        job.finished_at = timezone.now()
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("finished_at", ctx.exception.message_dict)

    # ── Invalid: error code forbidden on RUNNING ────────────────────────────

    def test_running_rejects_error_code(self):
        job = _make_running_job(self.owner)
        job.error_code = "premature_error"
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("error_code", ctx.exception.message_dict)

    # ── Invalid: image forbidden on RUNNING ─────────────────────────────────

    def test_running_rejects_attached_image(self):
        monster = _make_monster(self.owner)
        image = _make_monster_image(monster)
        job = _make_running_job(self.owner)
        job.image = image
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("image", ctx.exception.message_dict)


# ===========================================================================
# MonsterImageGenerationJob — SUCCEEDED state
# ===========================================================================


class JobSucceededStateTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()
        self.monster = _make_monster(self.owner)

    def test_succeeded_job_has_started_at(self):
        job = _make_succeeded_job(self.owner, self.monster)
        self.assertIsNotNone(job.started_at)

    def test_succeeded_job_has_finished_at(self):
        job = _make_succeeded_job(self.owner, self.monster)
        self.assertIsNotNone(job.finished_at)

    def test_succeeded_job_has_image(self):
        job = _make_succeeded_job(self.owner, self.monster)
        self.assertIsNotNone(job.image_id)

    def test_succeeded_job_has_no_error_code(self):
        job = _make_succeeded_job(self.owner, self.monster)
        self.assertEqual(job.error_code, "")

    def test_succeeded_job_has_no_safe_error_message(self):
        job = _make_succeeded_job(self.owner, self.monster)
        self.assertEqual(job.safe_error_message, "")

    # ── Invalid: missing timestamps on SUCCEEDED ─────────────────────────────

    def test_succeeded_rejects_missing_started_at(self):
        job = _make_succeeded_job(self.owner, self.monster)
        job.started_at = None
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("started_at", ctx.exception.message_dict)

    def test_succeeded_rejects_missing_finished_at(self):
        job = _make_succeeded_job(self.owner, self.monster)
        job.finished_at = None
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("finished_at", ctx.exception.message_dict)

    # ── Invalid: error on SUCCEEDED ──────────────────────────────────────────

    def test_succeeded_rejects_error_code(self):
        job = _make_succeeded_job(self.owner, self.monster)
        job.error_code = "should_not_be_here"
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("error_code", ctx.exception.message_dict)

    # ── Invalid: no image on SUCCEEDED ──────────────────────────────────────

    def test_succeeded_rejects_missing_image(self):
        job = _make_succeeded_job(self.owner, self.monster)
        job.image = None
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("image", ctx.exception.message_dict)


# ===========================================================================
# MonsterImageGenerationJob — FAILED state
# ===========================================================================


class JobFailedStateTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()

    def test_failed_from_queued_has_finished_at(self):
        """QUEUED → FAILED: job failed before starting, so started_at can be None."""
        job = _make_failed_job(self.owner, from_running=False)
        self.assertIsNotNone(job.finished_at)

    def test_failed_from_queued_has_no_started_at(self):
        job = _make_failed_job(self.owner, from_running=False)
        self.assertIsNone(job.started_at)

    def test_failed_from_running_has_started_at(self):
        job = _make_failed_job(self.owner, from_running=True)
        self.assertIsNotNone(job.started_at)

    def test_failed_job_has_error_code(self):
        job = _make_failed_job(self.owner)
        self.assertEqual(job.error_code, "test_error")

    def test_failed_job_has_safe_error_message(self):
        job = _make_failed_job(self.owner)
        self.assertEqual(job.safe_error_message, "Failed.")

    def test_failed_job_has_no_image(self):
        job = _make_failed_job(self.owner)
        self.assertIsNone(job.image_id)

    # ── Invalid: missing finished_at on FAILED ───────────────────────────────

    def test_failed_rejects_missing_finished_at(self):
        job = _make_failed_job(self.owner)
        job.finished_at = None
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("finished_at", ctx.exception.message_dict)

    # ── Invalid: missing error_code on FAILED ───────────────────────────────

    def test_failed_rejects_blank_error_code(self):
        job = _make_failed_job(self.owner)
        job.error_code = ""
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("error_code", ctx.exception.message_dict)

    # ── Invalid: image attached on FAILED ───────────────────────────────────

    def test_failed_rejects_attached_image(self):
        monster = _make_monster(self.owner)
        image = _make_monster_image(monster)
        job = _make_failed_job(self.owner)
        job.image = image
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("image", ctx.exception.message_dict)

    # ── Invalid: succeeded fields forbidden on FAILED ────────────────────────

    def test_failed_rejects_succeeded_status_with_no_error(self):
        """
        A SUCCEEDED status with error_code is a contradiction: must raise.
        This tests it from the succeeded-status side (not FAILED), but verifies
        the constraint is bidirectional.
        """
        monster = _make_monster(self.owner)
        job = _make_succeeded_job(self.owner, monster)
        job.error_code = "spurious_error"
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("error_code", ctx.exception.message_dict)


# ===========================================================================
# MonsterImageGenerationJob — BLOCKED state
# ===========================================================================


class JobBlockedStateTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()

    def test_blocked_job_has_started_at(self):
        """BLOCKED only ever comes from RUNNING, so started_at must be set."""
        job = _make_blocked_job(self.owner)
        self.assertIsNotNone(job.started_at)

    def test_blocked_job_has_finished_at(self):
        job = _make_blocked_job(self.owner)
        self.assertIsNotNone(job.finished_at)

    def test_blocked_job_has_error_code(self):
        job = _make_blocked_job(self.owner)
        self.assertEqual(job.error_code, "content_policy")

    def test_blocked_job_has_safe_error_message(self):
        job = _make_blocked_job(self.owner)
        self.assertEqual(job.safe_error_message, "Blocked.")

    def test_blocked_job_has_no_image(self):
        job = _make_blocked_job(self.owner)
        self.assertIsNone(job.image_id)

    # ── Invalid: missing started_at on BLOCKED ───────────────────────────────

    def test_blocked_rejects_missing_started_at(self):
        job = _make_blocked_job(self.owner)
        job.started_at = None
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("started_at", ctx.exception.message_dict)

    # ── Invalid: missing finished_at on BLOCKED ──────────────────────────────

    def test_blocked_rejects_missing_finished_at(self):
        job = _make_blocked_job(self.owner)
        job.finished_at = None
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("finished_at", ctx.exception.message_dict)

    # ── Invalid: blank error_code on BLOCKED ────────────────────────────────

    def test_blocked_rejects_blank_error_code(self):
        job = _make_blocked_job(self.owner)
        job.error_code = ""
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("error_code", ctx.exception.message_dict)

    # ── Invalid: image attached on BLOCKED ──────────────────────────────────

    def test_blocked_rejects_attached_image(self):
        monster = _make_monster(self.owner)
        image = _make_monster_image(monster)
        job = _make_blocked_job(self.owner)
        job.image = image
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("image", ctx.exception.message_dict)


# ===========================================================================
# MonsterImageGenerationJob — notification field cross-cutting rules
# ===========================================================================


class JobNotificationConstraintTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()

    def test_notified_at_rejected_when_email_not_requested(self):
        job = _make_queued_job(self.owner)
        self.assertFalse(job.should_email_when_done)
        job.notified_at = timezone.now()
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("notified_at", ctx.exception.message_dict)

    def test_notification_error_code_rejected_when_email_not_requested(self):
        job = _make_queued_job(self.owner)
        job.notification_error_code = "smtp_timeout"
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("notification_error_code", ctx.exception.message_dict)

    def test_notification_error_message_rejected_when_email_not_requested(self):
        job = _make_queued_job(self.owner)
        job.notification_error_message = "Connection refused."
        with self.assertRaises(ValidationError) as ctx:
            job.clean()
        self.assertIn("notification_error_message", ctx.exception.message_dict)

    def test_notified_at_allowed_when_email_requested(self):
        """A job with should_email_when_done=True may have notified_at set."""
        job = create_generation_job(
            owner=self.owner,
            generation_mode=MonsterImageGenerationMode.FAKE,
            provider="fake",
            provider_model="fake-fixture-v1",
            should_email_when_done=True,
        )
        job.notified_at = timezone.now()
        # Should not raise
        job.clean()

    def test_notification_error_allowed_when_email_requested(self):
        job = create_generation_job(
            owner=self.owner,
            generation_mode=MonsterImageGenerationMode.FAKE,
            provider="fake",
            provider_model="fake-fixture-v1",
            should_email_when_done=True,
        )
        job.notification_error_code = "smtp_timeout"
        job.notification_error_message = "SMTP server timed out."
        # Should not raise
        job.clean()


# ===========================================================================
# MonsterImageGenerationJob — structural fields
# ===========================================================================


class JobStructuralFieldTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()

    def test_job_has_no_raw_prompt_field(self):
        job = _make_queued_job(self.owner)
        self.assertFalse(hasattr(job, "raw_prompt"))

    def test_job_has_no_raw_provider_response_field(self):
        job = _make_queued_job(self.owner)
        self.assertFalse(hasattr(job, "raw_provider_response"))
        self.assertFalse(hasattr(job, "provider_response"))

    def test_job_has_no_monster_trait_fields(self):
        """Monster trait columns must not be duplicated on the job model."""
        job = _make_queued_job(self.owner)
        for field in ("element", "habitat", "personality", "color_palette", "flavor_text"):
            self.assertFalse(hasattr(job, field), msg=f"Job should not have field '{field}'")

    def test_job_has_sanitized_prompt(self):
        """sanitized_prompt exists on the model (not exposed in serializer, but stored)."""
        job = _make_queued_job(self.owner)
        self.assertTrue(hasattr(job, "sanitized_prompt"))

    def test_job_has_prompt_version(self):
        job = _make_queued_job(self.owner)
        self.assertTrue(hasattr(job, "prompt_version"))

    def test_job_has_prompt_hash(self):
        job = _make_queued_job(self.owner)
        self.assertTrue(hasattr(job, "prompt_hash"))

    def test_job_owner_fk_is_required(self):
        with self.assertRaises(Exception):
            MonsterImageGenerationJob.objects.create(
                owner=None,
                generation_mode=MonsterImageGenerationMode.FAKE,
                provider="fake",
                provider_model="fake-v1",
            )

    def test_job_monster_fk_is_nullable(self):
        """monster FK is nullable: job may exist before or without a Monster."""
        job = _make_queued_job(self.owner)
        self.assertIsNone(job.monster_id)

    def test_job_image_fk_is_nullable(self):
        """image FK is nullable until job succeeds."""
        job = _make_queued_job(self.owner)
        self.assertIsNone(job.image_id)

    def test_job_str_contains_status(self):
        job = _make_queued_job(self.owner)
        self.assertIn("queued", str(job))
