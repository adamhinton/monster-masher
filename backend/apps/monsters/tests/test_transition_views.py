"""
Tests for the trusted-server image-generation transition endpoints (Step B6).

Endpoints under test:
    POST /api/monsters/{monster_id}/generate-image/mark-running/
    POST /api/monsters/{monster_id}/generate-image/mark-succeeded/
    POST /api/monsters/{monster_id}/generate-image/mark-failed/
    POST /api/monsters/{monster_id}/generate-image/mark-blocked/

Trust boundary: Next.js forwards the user's Supabase access token.
Tests verify:
  - Auth required on all endpoints.
  - Monster ownership enforced (another user's monster → 404).
  - Job ownership enforced (another user's job → 404).
  - Job must be attached to the correct monster (wrong monster → 404).
  - Valid state transitions return 200 with the updated job.
  - Invalid state transitions (e.g. double-transition) return 409.
  - mark-succeeded creates a MonsterImage and links it to the job.
  - mark-succeeded rolls back the MonsterImage if the transition fails.
"""

import uuid
from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APITestCase

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
)

PATCH_JWT = "apps.accounts.authentication.verify_supabase_jwt"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_claims(uid, email="test@example.com"):
    return {"sub": str(uid), "email": email, "aud": "authenticated"}


def _make_profile(uid=None, email="test@example.com"):
    uid = uid or uuid.uuid4()
    return UserProfile.objects.create(supabase_user_id=uid, email=email)


def _make_monster(owner: UserProfile) -> Monster:
    return Monster.objects.create(
        owner=owner,
        display_name="Test Monster",
        element="fire",
        habitat="cave",
        personality="brave",
        color_palette="red",
    )


def _make_queued_job(owner: UserProfile, monster: Monster) -> MonsterImageGenerationJob:
    job = create_generation_job(
        owner=owner,
        generation_mode=MonsterImageGenerationMode.FAKE,
        provider="fake",
        provider_model="fake-fixture-v1",
    )
    job.monster = monster
    job.save()
    return job


def _make_running_job(
    owner: UserProfile, monster: Monster
) -> MonsterImageGenerationJob:
    job = _make_queued_job(owner, monster)
    return mark_job_running(job)


def _image_id():
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# mark-running
# ---------------------------------------------------------------------------


class MarkRunningViewTests(APITestCase):
    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid)
        self.monster = _make_monster(self.profile)
        self.job = _make_queued_job(self.profile, self.monster)
        self.url = reverse(
            "monster-generate-image-mark-running",
            kwargs={"monster_id": self.monster.id},
        )

    def _post(self, uid, email, url, data):
        with patch(PATCH_JWT, return_value=_make_claims(uid, email)):
            return self.client.post(
                url,
                data=data,
                content_type="application/json",
                HTTP_AUTHORIZATION="Bearer token",
            )

    def _post_as_owner(self, data=None):
        payload = {"job_id": str(self.job.id)} if data is None else data
        return self._post(self.uid, "test@example.com", self.url, payload)

    def test_unauthenticated_returns_401(self):
        response = self.client.post(
            self.url, {"job_id": str(self.job.id)}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 401)

    def test_valid_transition_returns_200(self):
        response = self._post_as_owner()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "running")

    def test_valid_transition_updates_db(self):
        self._post_as_owner()
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, MonsterImageGenerationStatus.RUNNING)
        self.assertIsNotNone(self.job.started_at)

    def test_missing_job_id_returns_400(self):
        response = self._post_as_owner(data={})
        self.assertEqual(response.status_code, 400)

    def test_other_users_monster_returns_404(self):
        uid_b = uuid.uuid4()
        response = self._post(
            uid_b, "b@test.com", self.url, {"job_id": str(self.job.id)}
        )
        self.assertEqual(response.status_code, 404)

    def test_other_users_job_returns_404(self):
        uid_b = uuid.uuid4()
        profile_b = _make_profile(uid_b, "b@test.com")
        monster_b = _make_monster(profile_b)
        job_b = _make_queued_job(profile_b, monster_b)
        # Own monster, but job belongs to profile_b
        response = self._post_as_owner(data={"job_id": str(job_b.id)})
        self.assertEqual(response.status_code, 404)

    def test_job_attached_to_different_monster_returns_404(self):
        # Second monster owned by same user
        monster2 = _make_monster(self.profile)
        job2 = _make_queued_job(self.profile, monster2)
        # URL targets monster1, but job is attached to monster2
        response = self._post_as_owner(data={"job_id": str(job2.id)})
        self.assertEqual(response.status_code, 404)

    def test_double_transition_returns_409(self):
        # First call succeeds
        self._post_as_owner()
        # Second call: job is now RUNNING, can't mark-running again
        response = self._post_as_owner()
        self.assertEqual(response.status_code, 409)

    def test_transition_already_terminal_returns_409(self):
        from apps.monsters.services.generation_jobs import mark_job_succeeded

        mark_job_running(self.job)
        img = MonsterImage.objects.create(
            monster=self.monster,
            public_image_url="https://example.com/img.png",
            image_storage_path="path/to/img.png",
            provider="fake",
            provider_model="fake-fixture-v1",
        )
        mark_job_succeeded(self.job, img)
        response = self._post_as_owner()
        self.assertEqual(response.status_code, 409)

    def test_nonexistent_monster_returns_404(self):
        url = reverse(
            "monster-generate-image-mark-running",
            kwargs={"monster_id": uuid.uuid4()},
        )
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            response = self.client.post(
                url,
                {"job_id": str(self.job.id)},
                content_type="application/json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 404)


# ---------------------------------------------------------------------------
# mark-succeeded
# ---------------------------------------------------------------------------


class MarkSucceededViewTests(APITestCase):
    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid)
        self.monster = _make_monster(self.profile)
        self.job = _make_running_job(self.profile, self.monster)
        self.url = reverse(
            "monster-generate-image-mark-succeeded",
            kwargs={"monster_id": self.monster.id},
        )
        self.image_id = uuid.uuid4()

    def _valid_body(self):
        return {
            "job_id": str(self.job.id),
            "monster_image_id": str(self.image_id),
            "public_image_url": "https://storage.example.com/image.png",
            "image_storage_path": "users/uid/monsters/mid/images/iid.png",
            "provider": "fake",
            "provider_model": "fake-fixture-v1",
        }

    def _post_as_owner(self, data=None):
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return self.client.post(
                self.url,
                data=data if data is not None else self._valid_body(),
                content_type="application/json",
                HTTP_AUTHORIZATION="Bearer token",
            )

    def test_unauthenticated_returns_401(self):
        response = self.client.post(
            self.url, self._valid_body(), content_type="application/json"
        )
        self.assertEqual(response.status_code, 401)

    def test_valid_transition_returns_200(self):
        response = self._post_as_owner()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "succeeded")

    def test_valid_transition_creates_monster_image(self):
        self._post_as_owner()
        self.assertTrue(MonsterImage.objects.filter(id=self.image_id).exists())

    def test_valid_transition_links_image_to_job(self):
        self._post_as_owner()
        self.job.refresh_from_db()
        self.assertIsNotNone(self.job.image)
        self.assertEqual(self.job.image.id, self.image_id)

    def test_valid_transition_links_image_to_monster(self):
        self._post_as_owner()
        img = MonsterImage.objects.get(id=self.image_id)
        self.assertEqual(img.monster, self.monster)

    def test_response_includes_image(self):
        response = self._post_as_owner()
        self.assertIsNotNone(response.data.get("image"))
        self.assertEqual(
            response.data["image"]["public_image_url"],
            "https://storage.example.com/image.png",
        )

    def test_other_users_monster_returns_404(self):
        uid_b = uuid.uuid4()
        with patch(PATCH_JWT, return_value=_make_claims(uid_b, "b@test.com")):
            response = self.client.post(
                self.url,
                self._valid_body(),
                content_type="application/json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 404)

    def test_other_users_job_returns_404(self):
        uid_b = uuid.uuid4()
        profile_b = _make_profile(uid_b, "b@test.com")
        monster_b = _make_monster(profile_b)
        job_b = _make_running_job(profile_b, monster_b)
        body = self._valid_body()
        body["job_id"] = str(job_b.id)
        response = self._post_as_owner(data=body)
        self.assertEqual(response.status_code, 404)

    def test_queued_job_transition_returns_409(self):
        queued_job = _make_queued_job(self.profile, self.monster)
        body = self._valid_body()
        body["job_id"] = str(queued_job.id)
        response = self._post_as_owner(data=body)
        self.assertEqual(response.status_code, 409)

    def test_queued_job_409_does_not_create_image(self):
        queued_job = _make_queued_job(self.profile, self.monster)
        body = self._valid_body()
        body["job_id"] = str(queued_job.id)
        self._post_as_owner(data=body)
        self.assertFalse(MonsterImage.objects.filter(id=self.image_id).exists())

    def test_missing_required_field_returns_400(self):
        body = self._valid_body()
        del body["public_image_url"]
        response = self._post_as_owner(data=body)
        self.assertEqual(response.status_code, 400)

    def test_invalid_url_returns_400(self):
        body = self._valid_body()
        body["public_image_url"] = "not-a-url"
        response = self._post_as_owner(data=body)
        self.assertEqual(response.status_code, 400)


# ---------------------------------------------------------------------------
# mark-failed
# ---------------------------------------------------------------------------


class MarkFailedViewTests(APITestCase):
    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid)
        self.monster = _make_monster(self.profile)
        self.url = reverse(
            "monster-generate-image-mark-failed",
            kwargs={"monster_id": self.monster.id},
        )

    def _post_as_owner(self, job_id, extra=None):
        data = {
            "job_id": str(job_id),
            "error_code": "provider_failed",
            "error_message": "Provider returned an error.",
        }
        if extra:
            data.update(extra)
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return self.client.post(
                self.url,
                data=data,
                content_type="application/json",
                HTTP_AUTHORIZATION="Bearer token",
            )

    def test_unauthenticated_returns_401(self):
        response = self.client.post(
            self.url,
            {"job_id": str(uuid.uuid4()), "error_code": "x", "error_message": "y"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_queued_job_can_be_failed(self):
        job = _make_queued_job(self.profile, self.monster)
        response = self._post_as_owner(job.id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "failed")

    def test_running_job_can_be_failed(self):
        job = _make_running_job(self.profile, self.monster)
        response = self._post_as_owner(job.id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "failed")

    def test_error_info_in_response(self):
        job = _make_queued_job(self.profile, self.monster)
        response = self._post_as_owner(job.id)
        self.assertEqual(response.data["error_info"]["code"], "provider_failed")
        self.assertEqual(
            response.data["error_info"]["message"], "Provider returned an error."
        )

    def test_already_failed_job_returns_409(self):
        job = _make_queued_job(self.profile, self.monster)
        self._post_as_owner(job.id)
        response = self._post_as_owner(job.id)
        self.assertEqual(response.status_code, 409)

    def test_other_users_monster_returns_404(self):
        uid_b = uuid.uuid4()
        job = _make_queued_job(self.profile, self.monster)
        with patch(PATCH_JWT, return_value=_make_claims(uid_b, "b@test.com")):
            response = self.client.post(
                self.url,
                {"job_id": str(job.id), "error_code": "x", "error_message": "y"},
                content_type="application/json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 404)

    def test_other_users_job_returns_404(self):
        uid_b = uuid.uuid4()
        profile_b = _make_profile(uid_b, "b@test.com")
        monster_b = _make_monster(profile_b)
        job_b = _make_queued_job(profile_b, monster_b)
        response = self._post_as_owner(job_b.id)
        self.assertEqual(response.status_code, 404)

    def test_missing_error_code_returns_400(self):
        job = _make_queued_job(self.profile, self.monster)
        data = {
            "job_id": str(job.id),
            "error_message": "Something went wrong.",
        }
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            response = self.client.post(
                self.url,
                data=data,
                content_type="application/json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 400)


# ---------------------------------------------------------------------------
# mark-blocked
# ---------------------------------------------------------------------------


class MarkBlockedViewTests(APITestCase):
    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid)
        self.monster = _make_monster(self.profile)
        self.url = reverse(
            "monster-generate-image-mark-blocked",
            kwargs={"monster_id": self.monster.id},
        )

    def _post_as_owner(self, job_id, data_override=None):
        data = {
            "job_id": str(job_id),
            "error_code": "banned_terms",
            "error_message": "Prompt contains banned terms.",
        }
        if data_override:
            data.update(data_override)
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return self.client.post(
                self.url,
                data=data,
                content_type="application/json",
                HTTP_AUTHORIZATION="Bearer token",
            )

    def test_unauthenticated_returns_401(self):
        response = self.client.post(
            self.url,
            {"job_id": str(uuid.uuid4()), "error_code": "x", "error_message": "y"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_queued_job_can_be_blocked(self):
        """Pre-flight content check blocks a QUEUED job (before mark-running)."""
        job = _make_queued_job(self.profile, self.monster)
        response = self._post_as_owner(job.id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "blocked")

    def test_running_job_can_be_blocked(self):
        """Content policy block during a RUNNING job."""
        job = _make_running_job(self.profile, self.monster)
        response = self._post_as_owner(job.id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "blocked")

    def test_queued_blocked_sets_both_timestamps(self):
        """Blocking a QUEUED job must set both started_at and finished_at."""
        job = _make_queued_job(self.profile, self.monster)
        self._post_as_owner(job.id)
        job.refresh_from_db()
        self.assertIsNotNone(job.started_at)
        self.assertIsNotNone(job.finished_at)

    def test_error_info_in_response(self):
        job = _make_queued_job(self.profile, self.monster)
        response = self._post_as_owner(job.id)
        self.assertEqual(response.data["error_info"]["code"], "banned_terms")
        self.assertEqual(
            response.data["error_info"]["message"], "Prompt contains banned terms."
        )

    def test_already_blocked_job_returns_409(self):
        job = _make_queued_job(self.profile, self.monster)
        self._post_as_owner(job.id)
        response = self._post_as_owner(job.id)
        self.assertEqual(response.status_code, 409)

    def test_other_users_monster_returns_404(self):
        uid_b = uuid.uuid4()
        job = _make_queued_job(self.profile, self.monster)
        with patch(PATCH_JWT, return_value=_make_claims(uid_b, "b@test.com")):
            response = self.client.post(
                self.url,
                {"job_id": str(job.id), "error_code": "x", "error_message": "y"},
                content_type="application/json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 404)

    def test_other_users_job_returns_404(self):
        uid_b = uuid.uuid4()
        profile_b = _make_profile(uid_b, "b@test.com")
        monster_b = _make_monster(profile_b)
        job_b = _make_queued_job(profile_b, monster_b)
        response = self._post_as_owner(job_b.id)
        self.assertEqual(response.status_code, 404)

    def test_job_attached_to_wrong_monster_returns_404(self):
        monster2 = _make_monster(self.profile)
        job2 = _make_queued_job(self.profile, monster2)
        # URL targets self.monster, but job2 belongs to monster2
        response = self._post_as_owner(job2.id)
        self.assertEqual(response.status_code, 404)

    def test_missing_error_code_returns_400(self):
        job = _make_queued_job(self.profile, self.monster)
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            response = self.client.post(
                self.url,
                {"job_id": str(job.id), "error_message": "Something."},
                content_type="application/json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 400)

    def test_succeeded_job_returns_409(self):
        """Blocking a terminal job is rejected."""
        job = _make_running_job(self.profile, self.monster)
        # Manually set to succeeded via the running job
        from apps.monsters.services.generation_jobs import mark_job_succeeded

        img = MonsterImage.objects.create(
            monster=self.monster,
            public_image_url="https://example.com/img.png",
            image_storage_path="path/to/img.png",
            provider="fake",
            provider_model="fake-fixture-v1",
        )
        mark_job_succeeded(job, img)
        response = self._post_as_owner(job.id)
        self.assertEqual(response.status_code, 409)
