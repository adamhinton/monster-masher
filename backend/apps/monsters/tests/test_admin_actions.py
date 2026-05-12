"""
Tests for Django admin actions on Monster and UserProfile.

"""

import uuid

from django.contrib.admin.sites import AdminSite
from django.contrib.messages.storage.fallback import FallbackStorage
from django.test import RequestFactory, TestCase, override_settings

from apps.accounts.admin import UserProfileAdmin
from apps.accounts.models import UserProfile
from apps.monsters.admin import MonsterAdmin
from apps.monsters.models import (
    Monster,
    MonsterImage,
    MonsterImageGenerationJob,
    MonsterImageGenerationStatus,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_profile(email: str = "test@example.com") -> UserProfile:
    return UserProfile.objects.create(supabase_user_id=uuid.uuid4(), email=email)


def _make_monster(owner: UserProfile, display_name: str = "Test Monster") -> Monster:
    return Monster.objects.create(
        owner=owner,
        display_name=display_name,
        element="fire",
        habitat="cave",
        personality="brave",
        color_palette="red",
    )


def _make_request():
    """Return a POST request with message storage configured."""
    factory = RequestFactory()
    request = factory.post("/admin/")
    # Django admin's message_user requires message storage on the request.
    setattr(request, "session", {})
    storage = FallbackStorage(request)
    setattr(request, "_messages", storage)
    return request


# ===========================================================================
# MonsterAdmin.attach_fake_image
# ===========================================================================


class AttachFakeImageAdminActionTests(TestCase):

    def setUp(self):
        self.site = AdminSite()
        self.admin = MonsterAdmin(Monster, self.site)
        self.owner = _make_profile()

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_creates_image_for_monster_without_image(self):
        monster = _make_monster(self.owner, "Imageless")
        self.assertEqual(MonsterImage.objects.filter(monster=monster).count(), 0)

        request = _make_request()
        self.admin.attach_fake_image(request, Monster.objects.filter(pk=monster.pk))

        self.assertEqual(MonsterImage.objects.filter(monster=monster).count(), 1)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_created_image_uses_fixture_url(self):
        monster = _make_monster(self.owner)
        request = _make_request()
        self.admin.attach_fake_image(request, Monster.objects.filter(pk=monster.pk))

        image = MonsterImage.objects.get(monster=monster)
        self.assertIsNotNone(image.public_image_url)
        self.assertTrue(image.public_image_url.startswith("https://"))

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_skips_monster_that_already_has_image(self):
        monster = _make_monster(self.owner, "Already Has Image")
        MonsterImage.objects.create(
            monster=monster,
            public_image_url="https://existing.example.com/img.png",
            provider="fake",
            provider_model="fake-v1",
        )

        request = _make_request()
        self.admin.attach_fake_image(request, Monster.objects.filter(pk=monster.pk))

        # Still only 1 image — action must be idempotent
        self.assertEqual(MonsterImage.objects.filter(monster=monster).count(), 1)
        # The original URL must be intact
        image = MonsterImage.objects.get(monster=monster)
        self.assertEqual(image.public_image_url, "https://existing.example.com/img.png")

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_mixed_queryset_only_attaches_to_imageless_monsters(self):
        monster_with_image = _make_monster(self.owner, "Has Image")
        monster_without_image = _make_monster(self.owner, "No Image")

        MonsterImage.objects.create(
            monster=monster_with_image,
            public_image_url="https://existing.example.com/img.png",
            provider="fake",
            provider_model="fake-v1",
        )

        request = _make_request()
        queryset = Monster.objects.filter(
            pk__in=[monster_with_image.pk, monster_without_image.pk]
        )
        self.admin.attach_fake_image(request, queryset)

        self.assertEqual(
            MonsterImage.objects.filter(monster=monster_with_image).count(), 1
        )
        self.assertEqual(
            MonsterImage.objects.filter(monster=monster_without_image).count(), 1
        )

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_action_is_idempotent_across_multiple_calls(self):
        monster = _make_monster(self.owner)
        request = _make_request()
        queryset = Monster.objects.filter(pk=monster.pk)

        self.admin.attach_fake_image(request, queryset)
        self.admin.attach_fake_image(request, queryset)

        # Should still be exactly 1 image after two calls
        self.assertEqual(MonsterImage.objects.filter(monster=monster).count(), 1)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=False)
    def test_blocked_when_dev_actions_disabled(self):
        monster = _make_monster(self.owner)
        request = _make_request()
        self.admin.attach_fake_image(request, Monster.objects.filter(pk=monster.pk))

        # No image should have been created
        self.assertEqual(MonsterImage.objects.filter(monster=monster).count(), 0)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=False)
    def test_blocked_emits_error_message(self):
        monster = _make_monster(self.owner)
        request = _make_request()
        self.admin.attach_fake_image(request, Monster.objects.filter(pk=monster.pk))

        messages = list(request._messages)
        self.assertEqual(len(messages), 1)
        # The message should signal an error (level 40 = ERROR)
        self.assertEqual(messages[0].level, 40)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_empty_queryset_creates_no_images(self):
        request = _make_request()
        self.admin.attach_fake_image(request, Monster.objects.none())
        self.assertEqual(MonsterImage.objects.count(), 0)


# ===========================================================================
# UserProfileAdmin.seed_fake_monsters_action
# ===========================================================================


class SeedFakeMonstersAdminActionTests(TestCase):

    def setUp(self):
        self.site = AdminSite()
        self.admin = UserProfileAdmin(UserProfile, self.site)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_creates_three_monsters_per_user(self):
        user = _make_profile("seeded@example.com")
        request = _make_request()

        self.admin.seed_fake_monsters_action(
            request, UserProfile.objects.filter(pk=user.pk)
        )

        self.assertEqual(Monster.objects.filter(owner=user).count(), 3)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_creates_three_images_per_user(self):
        user = _make_profile("seeded2@example.com")
        request = _make_request()

        self.admin.seed_fake_monsters_action(
            request, UserProfile.objects.filter(pk=user.pk)
        )

        monsters = Monster.objects.filter(owner=user)
        for monster in monsters:
            self.assertEqual(
                MonsterImage.objects.filter(monster=monster).count(),
                1,
                msg=f"Monster {monster.display_name} should have exactly 1 image",
            )

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_creates_three_succeeded_jobs_per_user(self):
        user = _make_profile("seeded3@example.com")
        request = _make_request()

        self.admin.seed_fake_monsters_action(
            request, UserProfile.objects.filter(pk=user.pk)
        )

        jobs = MonsterImageGenerationJob.objects.filter(owner=user)
        self.assertEqual(jobs.count(), 3)
        for job in jobs:
            self.assertEqual(job.status, MonsterImageGenerationStatus.SUCCEEDED)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_succeeded_jobs_have_attached_image(self):
        user = _make_profile("seeded4@example.com")
        request = _make_request()

        self.admin.seed_fake_monsters_action(
            request, UserProfile.objects.filter(pk=user.pk)
        )

        jobs = MonsterImageGenerationJob.objects.filter(owner=user)
        for job in jobs:
            self.assertIsNotNone(
                job.image_id, msg=f"Succeeded job {job.pk} should have an image"
            )

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_works_for_multiple_users_in_one_call(self):
        user_a = _make_profile("a@example.com")
        user_b = _make_profile("b@example.com")
        request = _make_request()

        self.admin.seed_fake_monsters_action(
            request, UserProfile.objects.filter(pk__in=[user_a.pk, user_b.pk])
        )

        self.assertEqual(Monster.objects.filter(owner=user_a).count(), 3)
        self.assertEqual(Monster.objects.filter(owner=user_b).count(), 3)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_does_not_cross_contaminate_owners(self):
        """Monsters seeded for user A must not be owned by user B."""
        user_a = _make_profile("a2@example.com")
        user_b = _make_profile("b2@example.com")
        request = _make_request()

        self.admin.seed_fake_monsters_action(
            request, UserProfile.objects.filter(pk__in=[user_a.pk, user_b.pk])
        )

        for monster in Monster.objects.filter(owner=user_a):
            self.assertEqual(monster.owner_id, user_a.pk)
        for monster in Monster.objects.filter(owner=user_b):
            self.assertEqual(monster.owner_id, user_b.pk)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_no_real_provider_call(self):
        """No network calls should happen. Jobs should use fake provider."""
        user = _make_profile("noprovider@example.com")
        request = _make_request()

        self.admin.seed_fake_monsters_action(
            request, UserProfile.objects.filter(pk=user.pk)
        )

        jobs = MonsterImageGenerationJob.objects.filter(owner=user)
        for job in jobs:
            self.assertEqual(job.provider, "fake")
            self.assertEqual(job.provider_model, "fake-fixture-v1")

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=False)
    def test_blocked_when_dev_actions_disabled(self):
        user = _make_profile("blocked@example.com")
        request = _make_request()

        self.admin.seed_fake_monsters_action(
            request, UserProfile.objects.filter(pk=user.pk)
        )

        self.assertEqual(Monster.objects.filter(owner=user).count(), 0)

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=False)
    def test_blocked_emits_error_message(self):
        user = _make_profile("blocked2@example.com")
        request = _make_request()

        self.admin.seed_fake_monsters_action(
            request, UserProfile.objects.filter(pk=user.pk)
        )

        messages = list(request._messages)
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0].level, 40)  # ERROR

    @override_settings(ENABLE_DEV_ADMIN_ACTIONS=True)
    def test_success_message_emitted(self):
        user = _make_profile("success@example.com")
        request = _make_request()

        self.admin.seed_fake_monsters_action(
            request, UserProfile.objects.filter(pk=user.pk)
        )

        messages = list(request._messages)
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0].level, 25)  # SUCCESS
