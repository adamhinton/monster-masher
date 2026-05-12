"""
Tests for the seed_fake_monsters management command.
"""

import io
import uuid

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from apps.accounts.models import UserProfile
from apps.monsters.models import (
    Monster,
    MonsterImage,
    MonsterImageGenerationJob,
    MonsterImageGenerationStatus,
)
from apps.monsters.management.commands.seed_fake_monsters import FAKE_IMAGE_FIXTURE_URL

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_profile(email: str = "test@example.com") -> UserProfile:
    return UserProfile.objects.create(supabase_user_id=uuid.uuid4(), email=email)


def _call_seed(email: str, num_monsters: int, stdout=None) -> None:
    """Thin wrapper around call_command for clarity."""
    kwargs = {"email": email, "num_monsters": num_monsters}
    if stdout is not None:
        kwargs["stdout"] = stdout
    call_command("seed_fake_monsters", **kwargs)


# ===========================================================================
# Guard: ENABLE_DEV_ADMIN_ACTIONS
# ===========================================================================


class SeedCommandGuardTests(TestCase):

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=False)
    def test_raises_command_error_when_dev_actions_disabled(self):
        profile = _make_profile("guard@example.com")
        with self.assertRaises(CommandError) as ctx:
            _call_seed(profile.email, 1)
        self.assertIn("ENABLE_DEV_ADMIN_ACTIONS", str(ctx.exception))

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=False)
    def test_creates_no_rows_when_dev_actions_disabled(self):
        profile = _make_profile("guard2@example.com")
        with self.assertRaises(CommandError):
            _call_seed(profile.email, 1)
        self.assertEqual(Monster.objects.filter(owner=profile).count(), 0)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_proceeds_when_dev_actions_enabled(self):
        profile = _make_profile("enabled@example.com")
        # Should not raise
        _call_seed(profile.email, 1)
        self.assertEqual(Monster.objects.filter(owner=profile).count(), 1)


# ===========================================================================
# Argument validation
# ===========================================================================


class SeedCommandArgumentTests(TestCase):

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_raises_for_unknown_email(self):
        with self.assertRaises(CommandError) as ctx:
            _call_seed("nobody@example.com", 1)
        self.assertIn("nobody@example.com", str(ctx.exception))

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_raises_for_num_monsters_less_than_one(self):
        profile = _make_profile("badnum@example.com")
        with self.assertRaises(CommandError):
            _call_seed(profile.email, 0)


# ===========================================================================
# Successful seeding: counts
# ===========================================================================


class SeedCommandCountTests(TestCase):

    def setUp(self):
        self.profile = _make_profile("seed@example.com")

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_creates_expected_number_of_monsters(self):
        _call_seed(self.profile.email, 3)
        self.assertEqual(Monster.objects.filter(owner=self.profile).count(), 3)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_creates_one_monster_when_requested(self):
        _call_seed(self.profile.email, 1)
        self.assertEqual(Monster.objects.filter(owner=self.profile).count(), 1)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_creates_five_monsters_when_requested(self):
        _call_seed(self.profile.email, 5)
        self.assertEqual(Monster.objects.filter(owner=self.profile).count(), 5)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_creates_one_image_per_monster(self):
        _call_seed(self.profile.email, 3)
        monsters = Monster.objects.filter(owner=self.profile)
        for monster in monsters:
            self.assertEqual(
                MonsterImage.objects.filter(monster=monster).count(),
                1,
                msg=f"Expected exactly 1 image for {monster.display_name}",
            )

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_creates_one_succeeded_job_per_monster(self):
        _call_seed(self.profile.email, 3)
        jobs = MonsterImageGenerationJob.objects.filter(owner=self.profile)
        self.assertEqual(jobs.count(), 3)
        for job in jobs:
            self.assertEqual(job.status, MonsterImageGenerationStatus.SUCCEEDED)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_total_image_count_matches_monster_count(self):
        _call_seed(self.profile.email, 4)
        self.assertEqual(Monster.objects.filter(owner=self.profile).count(), 4)
        monsters = Monster.objects.filter(owner=self.profile)
        total_images = MonsterImage.objects.filter(monster__in=monsters).count()
        self.assertEqual(total_images, 4)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_running_twice_creates_new_rows(self):
        """Command is not idempotent: each run creates fresh monsters."""
        _call_seed(self.profile.email, 2)
        _call_seed(self.profile.email, 2)
        self.assertEqual(Monster.objects.filter(owner=self.profile).count(), 4)


# ===========================================================================
# Successful seeding: ownership and correctness
# ===========================================================================


class SeedCommandOwnershipTests(TestCase):

    def setUp(self):
        self.profile = _make_profile("owner@example.com")

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_monsters_owned_by_correct_user(self):
        _call_seed(self.profile.email, 2)
        monsters = Monster.objects.filter(owner=self.profile)
        for monster in monsters:
            self.assertEqual(monster.owner_id, self.profile.pk)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_jobs_owned_by_correct_user(self):
        _call_seed(self.profile.email, 2)
        jobs = MonsterImageGenerationJob.objects.filter(owner=self.profile)
        for job in jobs:
            self.assertEqual(job.owner_id, self.profile.pk)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_does_not_create_monsters_for_other_users(self):
        other_profile = _make_profile("other@example.com")
        _call_seed(self.profile.email, 3)
        self.assertEqual(Monster.objects.filter(owner=other_profile).count(), 0)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_jobs_linked_to_monsters(self):
        _call_seed(self.profile.email, 2)
        jobs = MonsterImageGenerationJob.objects.filter(owner=self.profile)
        for job in jobs:
            self.assertIsNotNone(job.monster_id)
            # Monster must be owned by the same user
            self.assertEqual(job.monster.owner_id, self.profile.pk)


# ===========================================================================
# Successful seeding: no real provider called
# ===========================================================================


class SeedCommandNoProviderTests(TestCase):

    def setUp(self):
        self.profile = _make_profile("noprovider@example.com")

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_jobs_use_fake_provider(self):
        _call_seed(self.profile.email, 3)
        jobs = MonsterImageGenerationJob.objects.filter(owner=self.profile)
        for job in jobs:
            self.assertEqual(job.provider, "fake")

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_jobs_use_fake_provider_model(self):
        _call_seed(self.profile.email, 3)
        jobs = MonsterImageGenerationJob.objects.filter(owner=self.profile)
        for job in jobs:
            self.assertEqual(job.provider_model, "fake-fixture-v1")

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_images_use_fixture_url(self):
        """No real storage upload should happen — images use the fixture URL."""
        _call_seed(self.profile.email, 3)
        monsters = Monster.objects.filter(owner=self.profile)
        for monster in monsters:
            image = MonsterImage.objects.get(monster=monster)
            self.assertEqual(image.public_image_url, FAKE_IMAGE_FIXTURE_URL)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_images_use_fake_provider_label(self):
        _call_seed(self.profile.email, 2)
        monsters = Monster.objects.filter(owner=self.profile)
        for monster in monsters:
            image = MonsterImage.objects.get(monster=monster)
            self.assertEqual(image.provider, "fake")


# ===========================================================================
# Successful seeding: job state invariants
# ===========================================================================


class SeedCommandJobStateTests(TestCase):

    def setUp(self):
        self.profile = _make_profile("jobstate@example.com")

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_succeeded_jobs_have_finished_at(self):
        _call_seed(self.profile.email, 2)
        jobs = MonsterImageGenerationJob.objects.filter(owner=self.profile)
        for job in jobs:
            self.assertIsNotNone(job.finished_at)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_succeeded_jobs_have_started_at(self):
        _call_seed(self.profile.email, 2)
        jobs = MonsterImageGenerationJob.objects.filter(owner=self.profile)
        for job in jobs:
            self.assertIsNotNone(job.started_at)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_succeeded_jobs_have_no_error_code(self):
        _call_seed(self.profile.email, 2)
        jobs = MonsterImageGenerationJob.objects.filter(owner=self.profile)
        for job in jobs:
            self.assertEqual(job.error_code, "")

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_succeeded_jobs_have_attached_image(self):
        _call_seed(self.profile.email, 2)
        jobs = MonsterImageGenerationJob.objects.filter(owner=self.profile)
        for job in jobs:
            self.assertIsNotNone(job.image_id)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_each_job_image_matches_monsters_image(self):
        """The image attached to each job should be the same as the image on the monster."""
        _call_seed(self.profile.email, 2)
        for monster in Monster.objects.filter(owner=self.profile):
            job = MonsterImageGenerationJob.objects.get(monster=monster)
            monster_image = MonsterImage.objects.get(monster=monster)
            self.assertEqual(job.image_id, monster_image.pk)
