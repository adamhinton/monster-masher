"""
Comprehensive tests for the MonsterImageGenerationJob service functions in
apps.monsters.services.generation_jobs.

No external calls. No network. No providers.
"""

import uuid

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
    InvalidJobTransition,
    create_generation_job,
    mark_job_blocked,
    mark_job_failed,
    mark_job_running,
    mark_job_succeeded,
)

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _make_profile(email: str = "test@example.com") -> UserProfile:
    return UserProfile.objects.create(supabase_user_id=uuid.uuid4(), email=email)


def _make_monster(owner: UserProfile) -> Monster:
    return Monster.objects.create(
        owner=owner,
        display_name="Test Monster",
        element="fire",
        habitat="cave",
        personality="brave",
        color_palette="red",
    )


def _make_monster_image(monster: Monster) -> MonsterImage:
    return MonsterImage.objects.create(
        monster=monster,
        public_image_url="https://placehold.co/512x512.png",
        image_storage_path="monsters/test.png",
        provider="fake",
        provider_model="fake-fixture-v1",
    )


def _make_queued_job(owner: UserProfile, **kwargs) -> MonsterImageGenerationJob:
    return create_generation_job(
        owner=owner,
        generation_mode=MonsterImageGenerationMode.FAKE,
        provider="fake",
        provider_model="fake-fixture-v1",
        **kwargs,
    )


# ===========================================================================
# create_generation_job
# ===========================================================================


class CreateGenerationJobTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()

    def test_creates_queued_job(self):
        job = _make_queued_job(self.owner)
        self.assertEqual(job.status, MonsterImageGenerationStatus.QUEUED)

    def test_returns_saved_instance_with_pk(self):
        job = _make_queued_job(self.owner)
        self.assertIsNotNone(job.pk)
        self.assertIsInstance(job.pk, uuid.UUID)

    def test_job_is_persisted_to_database(self):
        job = _make_queued_job(self.owner)
        self.assertTrue(MonsterImageGenerationJob.objects.filter(pk=job.pk).exists())

    def test_default_status_is_queued(self):
        job = _make_queued_job(self.owner)
        self.assertEqual(job.status, MonsterImageGenerationStatus.QUEUED)

    def test_started_at_is_none(self):
        job = _make_queued_job(self.owner)
        self.assertIsNone(job.started_at)

    def test_finished_at_is_none(self):
        job = _make_queued_job(self.owner)
        self.assertIsNone(job.finished_at)

    def test_image_is_none(self):
        job = _make_queued_job(self.owner)
        self.assertIsNone(job.image_id)

    def test_monster_is_none_by_default(self):
        job = _make_queued_job(self.owner)
        self.assertIsNone(job.monster_id)

    def test_error_code_is_blank(self):
        job = _make_queued_job(self.owner)
        self.assertEqual(job.error_code, "")

    def test_safe_error_message_is_blank(self):
        job = _make_queued_job(self.owner)
        self.assertEqual(job.safe_error_message, "")

    def test_owner_is_set(self):
        job = _make_queued_job(self.owner)
        self.assertEqual(job.owner_id, self.owner.pk)

    def test_provider_stored(self):
        job = _make_queued_job(self.owner)
        self.assertEqual(job.provider, "fake")

    def test_provider_model_stored(self):
        job = _make_queued_job(self.owner)
        self.assertEqual(job.provider_model, "fake-fixture-v1")

    def test_generation_mode_stored(self):
        job = _make_queued_job(self.owner)
        self.assertEqual(job.generation_mode, MonsterImageGenerationMode.FAKE)

    def test_sanitized_prompt_stored(self):
        job = create_generation_job(
            owner=self.owner,
            generation_mode=MonsterImageGenerationMode.FAKE,
            provider="fake",
            provider_model="fake-fixture-v1",
            sanitized_prompt="A grumpy fire goblin",
        )
        self.assertEqual(job.sanitized_prompt, "A grumpy fire goblin")

    def test_prompt_version_stored(self):
        job = create_generation_job(
            owner=self.owner,
            generation_mode=MonsterImageGenerationMode.FAKE,
            provider="fake",
            provider_model="fake-fixture-v1",
            prompt_version="v2",
        )
        self.assertEqual(job.prompt_version, "v2")

    def test_prompt_hash_stored(self):
        job = create_generation_job(
            owner=self.owner,
            generation_mode=MonsterImageGenerationMode.FAKE,
            provider="fake",
            provider_model="fake-fixture-v1",
            prompt_hash="abc123",
        )
        self.assertEqual(job.prompt_hash, "abc123")

    def test_should_email_when_done_defaults_false(self):
        job = _make_queued_job(self.owner)
        self.assertFalse(job.should_email_when_done)

    def test_should_email_when_done_can_be_set_true(self):
        job = create_generation_job(
            owner=self.owner,
            generation_mode=MonsterImageGenerationMode.FAKE,
            provider="fake",
            provider_model="fake-fixture-v1",
            should_email_when_done=True,
        )
        self.assertTrue(job.should_email_when_done)

    def test_multiple_jobs_have_distinct_pks(self):
        j1 = _make_queued_job(self.owner)
        j2 = _make_queued_job(self.owner)
        self.assertNotEqual(j1.pk, j2.pk)


# ===========================================================================
# mark_job_running
# ===========================================================================


class MarkJobRunningTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()

    def test_queued_transitions_to_running(self):
        job = _make_queued_job(self.owner)
        updated = mark_job_running(job)
        self.assertEqual(updated.status, MonsterImageGenerationStatus.RUNNING)

    def test_returns_updated_instance(self):
        job = _make_queued_job(self.owner)
        updated = mark_job_running(job)
        self.assertEqual(updated.pk, job.pk)

    def test_started_at_is_set(self):
        before = timezone.now()
        job = _make_queued_job(self.owner)
        updated = mark_job_running(job)
        self.assertIsNotNone(updated.started_at)
        self.assertGreaterEqual(updated.started_at, before)

    def test_finished_at_remains_none(self):
        job = _make_queued_job(self.owner)
        updated = mark_job_running(job)
        self.assertIsNone(updated.finished_at)

    def test_error_code_remains_blank(self):
        job = _make_queued_job(self.owner)
        updated = mark_job_running(job)
        self.assertEqual(updated.error_code, "")

    def test_image_remains_none(self):
        job = _make_queued_job(self.owner)
        updated = mark_job_running(job)
        self.assertIsNone(updated.image_id)

    def test_change_is_persisted(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        refreshed = MonsterImageGenerationJob.objects.get(pk=job.pk)
        self.assertEqual(refreshed.status, MonsterImageGenerationStatus.RUNNING)
        self.assertIsNotNone(refreshed.started_at)

    # ── Invalid source states ────────────────────────────────────────────────

    def test_raises_if_already_running(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_running(job)
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.RUNNING
        )

    def test_raises_if_succeeded(self):
        monster = _make_monster(self.owner)
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        image = _make_monster_image(monster)
        mark_job_succeeded(job, image)
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_running(job)
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.SUCCEEDED
        )

    def test_raises_if_failed(self):
        job = _make_queued_job(self.owner)
        mark_job_failed(job, error_code="err", safe_error_message="msg")
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_running(job)
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.FAILED
        )

    def test_raises_if_blocked(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        mark_job_blocked(job, error_code="policy", safe_error_message="blocked")
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_running(job)
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.BLOCKED
        )


# ===========================================================================
# mark_job_succeeded
# ===========================================================================


class MarkJobSucceededTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()
        self.monster = _make_monster(self.owner)

    def _make_running(self):
        job = _make_queued_job(self.owner)
        return mark_job_running(job)

    def test_running_transitions_to_succeeded(self):
        job = self._make_running()
        image = _make_monster_image(self.monster)
        updated = mark_job_succeeded(job, image)
        self.assertEqual(updated.status, MonsterImageGenerationStatus.SUCCEEDED)

    def test_returns_updated_instance(self):
        job = self._make_running()
        image = _make_monster_image(self.monster)
        updated = mark_job_succeeded(job, image)
        self.assertEqual(updated.pk, job.pk)

    def test_finished_at_is_set(self):
        before = timezone.now()
        job = self._make_running()
        image = _make_monster_image(self.monster)
        updated = mark_job_succeeded(job, image)
        self.assertIsNotNone(updated.finished_at)
        self.assertGreaterEqual(updated.finished_at, before)

    def test_image_is_attached(self):
        job = self._make_running()
        image = _make_monster_image(self.monster)
        updated = mark_job_succeeded(job, image)
        self.assertEqual(updated.image_id, image.pk)

    def test_error_code_is_blank(self):
        job = self._make_running()
        image = _make_monster_image(self.monster)
        updated = mark_job_succeeded(job, image)
        self.assertEqual(updated.error_code, "")

    def test_safe_error_message_is_blank(self):
        job = self._make_running()
        image = _make_monster_image(self.monster)
        updated = mark_job_succeeded(job, image)
        self.assertEqual(updated.safe_error_message, "")

    def test_started_at_is_preserved(self):
        job = self._make_running()
        original_started_at = job.started_at
        image = _make_monster_image(self.monster)
        updated = mark_job_succeeded(job, image)
        self.assertEqual(updated.started_at, original_started_at)

    def test_change_is_persisted(self):
        job = self._make_running()
        image = _make_monster_image(self.monster)
        mark_job_succeeded(job, image)
        refreshed = MonsterImageGenerationJob.objects.get(pk=job.pk)
        self.assertEqual(refreshed.status, MonsterImageGenerationStatus.SUCCEEDED)
        self.assertEqual(refreshed.image_id, image.pk)
        self.assertIsNotNone(refreshed.finished_at)

    # ── Invalid source states ────────────────────────────────────────────────

    def test_raises_if_queued(self):
        job = _make_queued_job(self.owner)
        image = _make_monster_image(self.monster)
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_succeeded(job, image)
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.QUEUED
        )

    def test_raises_if_already_succeeded(self):
        job = self._make_running()
        image = _make_monster_image(self.monster)
        mark_job_succeeded(job, image)
        image2 = _make_monster_image(self.monster)
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_succeeded(job, image2)
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.SUCCEEDED
        )

    def test_raises_if_failed(self):
        job = _make_queued_job(self.owner)
        mark_job_failed(job, error_code="err", safe_error_message="msg")
        image = _make_monster_image(self.monster)
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_succeeded(job, image)
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.FAILED
        )

    def test_raises_if_blocked(self):
        job = self._make_running()
        mark_job_blocked(job, error_code="policy", safe_error_message="blocked")
        image = _make_monster_image(self.monster)
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_succeeded(job, image)
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.BLOCKED
        )


# ===========================================================================
# mark_job_failed
# ===========================================================================


class MarkJobFailedTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()

    def test_queued_transitions_to_failed(self):
        """QUEUED → FAILED: job failed before it ever started."""
        job = _make_queued_job(self.owner)
        updated = mark_job_failed(
            job, error_code="validation_error", safe_error_message="Bad prompt."
        )
        self.assertEqual(updated.status, MonsterImageGenerationStatus.FAILED)

    def test_running_transitions_to_failed(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        updated = mark_job_failed(
            job, error_code="provider_timeout", safe_error_message="Timed out."
        )
        self.assertEqual(updated.status, MonsterImageGenerationStatus.FAILED)

    def test_returns_updated_instance(self):
        job = _make_queued_job(self.owner)
        updated = mark_job_failed(job, error_code="err", safe_error_message="msg")
        self.assertEqual(updated.pk, job.pk)

    def test_finished_at_is_set(self):
        before = timezone.now()
        job = _make_queued_job(self.owner)
        updated = mark_job_failed(job, error_code="err", safe_error_message="msg")
        self.assertIsNotNone(updated.finished_at)
        self.assertGreaterEqual(updated.finished_at, before)

    def test_error_code_is_stored(self):
        job = _make_queued_job(self.owner)
        updated = mark_job_failed(
            job, error_code="provider_timeout", safe_error_message="msg"
        )
        self.assertEqual(updated.error_code, "provider_timeout")

    def test_safe_error_message_is_stored(self):
        job = _make_queued_job(self.owner)
        updated = mark_job_failed(
            job, error_code="err", safe_error_message="The provider timed out."
        )
        self.assertEqual(updated.safe_error_message, "The provider timed out.")

    def test_no_image_attached(self):
        job = _make_queued_job(self.owner)
        updated = mark_job_failed(job, error_code="err", safe_error_message="msg")
        self.assertIsNone(updated.image_id)

    def test_failed_from_queued_has_no_started_at(self):
        """QUEUED → FAILED: started_at must be absent since the job never ran."""
        job = _make_queued_job(self.owner)
        updated = mark_job_failed(job, error_code="err", safe_error_message="msg")
        self.assertIsNone(updated.started_at)

    def test_failed_from_running_preserves_started_at(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        started = job.started_at
        updated = mark_job_failed(job, error_code="err", safe_error_message="msg")
        self.assertEqual(updated.started_at, started)

    def test_change_is_persisted(self):
        job = _make_queued_job(self.owner)
        mark_job_failed(job, error_code="err", safe_error_message="msg")
        refreshed = MonsterImageGenerationJob.objects.get(pk=job.pk)
        self.assertEqual(refreshed.status, MonsterImageGenerationStatus.FAILED)
        self.assertEqual(refreshed.error_code, "err")
        self.assertIsNotNone(refreshed.finished_at)

    # ── Raises ValueError for blank error_code ───────────────────────────────

    def test_raises_value_error_for_blank_error_code(self):
        job = _make_queued_job(self.owner)
        with self.assertRaises(ValueError):
            mark_job_failed(job, error_code="", safe_error_message="msg")

    # ── Invalid source states ────────────────────────────────────────────────

    def test_raises_if_succeeded(self):
        monster = _make_monster(self.owner)
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        image = _make_monster_image(monster)
        mark_job_succeeded(job, image)
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_failed(
                job, error_code="late_error", safe_error_message="Too late."
            )
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.SUCCEEDED
        )

    def test_raises_if_already_failed(self):
        job = _make_queued_job(self.owner)
        mark_job_failed(job, error_code="err1", safe_error_message="First failure.")
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_failed(
                job, error_code="err2", safe_error_message="Second failure."
            )
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.FAILED
        )

    def test_raises_if_blocked(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        mark_job_blocked(job, error_code="policy", safe_error_message="Blocked.")
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_failed(job, error_code="err", safe_error_message="msg")
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.BLOCKED
        )


# ===========================================================================
# mark_job_blocked
# ===========================================================================


class MarkJobBlockedTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()

    def _make_running(self):
        job = _make_queued_job(self.owner)
        return mark_job_running(job)

    def test_running_transitions_to_blocked(self):
        job = self._make_running()
        updated = mark_job_blocked(
            job, error_code="content_policy_violation", safe_error_message="Blocked."
        )
        self.assertEqual(updated.status, MonsterImageGenerationStatus.BLOCKED)

    def test_returns_updated_instance(self):
        job = self._make_running()
        updated = mark_job_blocked(job, error_code="policy", safe_error_message="msg")
        self.assertEqual(updated.pk, job.pk)

    def test_finished_at_is_set(self):
        before = timezone.now()
        job = self._make_running()
        updated = mark_job_blocked(job, error_code="policy", safe_error_message="msg")
        self.assertIsNotNone(updated.finished_at)
        self.assertGreaterEqual(updated.finished_at, before)

    def test_started_at_is_preserved(self):
        job = self._make_running()
        original_started_at = job.started_at
        updated = mark_job_blocked(job, error_code="policy", safe_error_message="msg")
        self.assertEqual(updated.started_at, original_started_at)

    def test_error_code_is_stored(self):
        job = self._make_running()
        updated = mark_job_blocked(
            job, error_code="content_policy_violation", safe_error_message="msg"
        )
        self.assertEqual(updated.error_code, "content_policy_violation")

    def test_safe_error_message_is_stored(self):
        job = self._make_running()
        updated = mark_job_blocked(
            job,
            error_code="policy",
            safe_error_message="Your prompt violated content policy.",
        )
        self.assertEqual(
            updated.safe_error_message, "Your prompt violated content policy."
        )

    def test_no_image_attached(self):
        job = self._make_running()
        updated = mark_job_blocked(job, error_code="policy", safe_error_message="msg")
        self.assertIsNone(updated.image_id)

    def test_change_is_persisted(self):
        job = self._make_running()
        mark_job_blocked(job, error_code="policy", safe_error_message="Blocked.")
        refreshed = MonsterImageGenerationJob.objects.get(pk=job.pk)
        self.assertEqual(refreshed.status, MonsterImageGenerationStatus.BLOCKED)
        self.assertEqual(refreshed.error_code, "policy")
        self.assertIsNotNone(refreshed.finished_at)

    # ── Raises ValueError for blank error_code ───────────────────────────────

    def test_raises_value_error_for_blank_error_code(self):
        job = self._make_running()
        with self.assertRaises(ValueError):
            mark_job_blocked(job, error_code="", safe_error_message="msg")

    # ── Invalid source states ────────────────────────────────────────────────

    def test_raises_if_queued(self):
        """BLOCKED can only come from RUNNING, never from QUEUED."""
        job = _make_queued_job(self.owner)
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_blocked(job, error_code="policy", safe_error_message="msg")
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.QUEUED
        )

    def test_raises_if_succeeded(self):
        monster = _make_monster(self.owner)
        job = self._make_running()
        image = _make_monster_image(monster)
        mark_job_succeeded(job, image)
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_blocked(job, error_code="policy", safe_error_message="msg")
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.SUCCEEDED
        )

    def test_raises_if_failed(self):
        job = _make_queued_job(self.owner)
        mark_job_failed(job, error_code="err", safe_error_message="msg")
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_blocked(job, error_code="policy", safe_error_message="msg")
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.FAILED
        )

    def test_raises_if_already_blocked(self):
        job = self._make_running()
        mark_job_blocked(job, error_code="policy1", safe_error_message="First block.")
        with self.assertRaises(InvalidJobTransition) as ctx:
            mark_job_blocked(
                job, error_code="policy2", safe_error_message="Second block."
            )
        self.assertEqual(
            ctx.exception.current_status, MonsterImageGenerationStatus.BLOCKED
        )


# ===========================================================================
# InvalidJobTransition exception attributes
# ===========================================================================


class InvalidJobTransitionExceptionTests(TestCase):

    def setUp(self):
        self.owner = _make_profile()

    def test_has_job_id_attribute(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        try:
            mark_job_running(job)
        except InvalidJobTransition as exc:
            self.assertEqual(exc.job_id, job.pk)
        else:
            self.fail("Expected InvalidJobTransition was not raised")

    def test_has_current_status_attribute(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        try:
            mark_job_running(job)
        except InvalidJobTransition as exc:
            self.assertEqual(exc.current_status, MonsterImageGenerationStatus.RUNNING)
        else:
            self.fail("Expected InvalidJobTransition was not raised")

    def test_has_attempted_attribute(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        try:
            mark_job_running(job)
        except InvalidJobTransition as exc:
            self.assertIsNotNone(exc.attempted)
            self.assertIsInstance(exc.attempted, str)
        else:
            self.fail("Expected InvalidJobTransition was not raised")

    def test_string_representation_mentions_job_id(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        try:
            mark_job_running(job)
        except InvalidJobTransition as exc:
            self.assertIn(str(job.pk), str(exc))
        else:
            self.fail("Expected InvalidJobTransition was not raised")

    def test_string_representation_mentions_current_status(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        try:
            mark_job_running(job)
        except InvalidJobTransition as exc:
            self.assertIn("running", str(exc))
        else:
            self.fail("Expected InvalidJobTransition was not raised")


# ===========================================================================
# State machine invariants (cross-cutting)
# ===========================================================================


class JobStateMachineInvariantTests(TestCase):
    """
    Cross-cutting invariants: no matter what path led to a terminal state,
    the structural constraints of that state must hold.
    """

    def setUp(self):
        self.owner = _make_profile()
        self.monster = _make_monster(self.owner)

    def test_succeeded_job_has_no_error_code(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        image = _make_monster_image(self.monster)
        succeeded = mark_job_succeeded(job, image)
        self.assertEqual(succeeded.error_code, "")

    def test_succeeded_job_has_image(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        image = _make_monster_image(self.monster)
        succeeded = mark_job_succeeded(job, image)
        self.assertIsNotNone(succeeded.image_id)

    def test_failed_from_queued_has_no_image(self):
        job = _make_queued_job(self.owner)
        failed = mark_job_failed(job, error_code="err", safe_error_message="msg")
        self.assertIsNone(failed.image_id)

    def test_failed_from_running_has_no_image(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        failed = mark_job_failed(job, error_code="err", safe_error_message="msg")
        self.assertIsNone(failed.image_id)

    def test_blocked_has_no_image(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        blocked = mark_job_blocked(job, error_code="policy", safe_error_message="msg")
        self.assertIsNone(blocked.image_id)

    def test_failed_has_error_code(self):
        job = _make_queued_job(self.owner)
        failed = mark_job_failed(
            job, error_code="provider_timeout", safe_error_message="msg"
        )
        self.assertNotEqual(failed.error_code, "")

    def test_blocked_has_error_code(self):
        job = _make_queued_job(self.owner)
        mark_job_running(job)
        blocked = mark_job_blocked(
            job, error_code="content_policy", safe_error_message="msg"
        )
        self.assertNotEqual(blocked.error_code, "")

    def test_all_terminal_states_have_finished_at(self):
        """Every terminal state (succeeded, failed, blocked) must have finished_at."""
        monster = _make_monster(self.owner)

        job_s = _make_queued_job(self.owner)
        mark_job_running(job_s)
        image = _make_monster_image(monster)
        mark_job_succeeded(job_s, image)
        self.assertIsNotNone(job_s.finished_at)

        job_f = _make_queued_job(self.owner)
        mark_job_failed(job_f, error_code="err", safe_error_message="msg")
        self.assertIsNotNone(job_f.finished_at)

        job_b = _make_queued_job(self.owner)
        mark_job_running(job_b)
        mark_job_blocked(job_b, error_code="policy", safe_error_message="msg")
        self.assertIsNotNone(job_b.finished_at)

    def test_non_terminal_states_have_no_finished_at(self):
        """QUEUED and RUNNING must never have finished_at."""
        job_q = _make_queued_job(self.owner)
        self.assertIsNone(job_q.finished_at)

        job_r = _make_queued_job(self.owner)
        mark_job_running(job_r)
        self.assertIsNone(job_r.finished_at)
