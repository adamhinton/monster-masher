"""
Tests for image generation job create, detail, and notification views.

All job endpoints now live under /api/monsters/{monster_id}/generate-image/:
  POST   monsters/{monster_id}/generate-image/jobs/                          → create
  GET    monsters/{monster_id}/generate-image/jobs/{job_id}/                 → detail
  PATCH  monsters/{monster_id}/generate-image/jobs/{job_id}/notification/    → toggle email

verify_supabase_jwt is patched so that any Bearer token is accepted and
resolves to the given claims.

Note: the trusted-server transition endpoints (mark-running, mark-succeeded,
mark-failed, mark-blocked) are tested separately in test_transition_views.py.
"""

import uuid
from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.accounts.models import UserProfile
from apps.monsters.models import (
    Monster,
    MonsterImageGenerationJob,
    MonsterImageGenerationMode,
)
from apps.monsters.services.generation_jobs import (
    create_generation_job,
    mark_job_failed,
)

PATCH_JWT = "apps.accounts.authentication.verify_supabase_jwt"


def _make_claims(uid, email="test@example.com"):
    return {"sub": str(uid), "email": email, "aud": "authenticated"}


def _make_profile(uid=None, email="test@example.com"):
    uid = uid or uuid.uuid4()
    return UserProfile.objects.create(supabase_user_id=uid, email=email)


def _make_job(owner: UserProfile) -> MonsterImageGenerationJob:
    return create_generation_job(
        owner=owner,
        generation_mode=MonsterImageGenerationMode.FAKE,
        provider="fake",
        provider_model="fake-fixture-v1",
    )


def _create_monster(owner: UserProfile) -> Monster:
    return Monster.objects.create(
        owner=owner,
        display_name="Test Monster",
        element="fire",
        habitat="cave",
        personality="brave",
        color_palette="red",
    )


# ---------------------------------------------------------------------------
# Job create
# ---------------------------------------------------------------------------


class JobCreateViewTests(APITestCase):
    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid)
        self.monster = _create_monster(self.profile)
        self.url = reverse(
            "monster-generate-image-jobs",
            kwargs={"monster_id": self.monster.id},
        )

    def _post(self, uid=None, data=None):
        uid = uid or self.uid
        with patch(PATCH_JWT, return_value=_make_claims(uid)):
            return self.client.post(
                self.url,
                data or {},
                format="json",
                HTTP_AUTHORIZATION="Bearer token",
            )

    def test_missing_auth_returns_401(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 401)

    def test_create_job_with_no_body_returns_201(self):
        response = self._post()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(MonsterImageGenerationJob.objects.count(), 1)

    def test_created_job_is_queued(self):
        response = self._post()
        self.assertEqual(response.data["status"], "queued")

    def test_created_job_is_attached_to_monster(self):
        response = self._post()
        self.assertEqual(response.status_code, 201)
        job = MonsterImageGenerationJob.objects.first()
        self.assertEqual(job.monster_id, self.monster.id)

    def test_create_job_with_email_flag_sets_preference(self):
        response = self._post(data={"should_email_when_done": True})
        self.assertEqual(response.status_code, 201)
        job = MonsterImageGenerationJob.objects.first()
        self.assertTrue(job.should_email_when_done)

    def test_create_job_owner_is_set_from_auth_not_client(self):
        response = self._post(data={"owner": str(uuid.uuid4())})
        self.assertEqual(response.status_code, 201)
        job = MonsterImageGenerationJob.objects.first()
        self.assertEqual(str(job.owner.supabase_user_id), str(self.uid))

    def test_create_job_for_other_users_monster_returns_404(self):
        other_uid = uuid.uuid4()
        other_profile = _make_profile(other_uid, "other@test.com")
        other_monster = _create_monster(other_profile)
        url = reverse(
            "monster-generate-image-jobs",
            kwargs={"monster_id": other_monster.id},
        )
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            response = self.client.post(
                url, {}, format="json", HTTP_AUTHORIZATION="Bearer token"
            )
        self.assertEqual(response.status_code, 404)

    def test_create_job_for_nonexistent_monster_returns_404(self):
        url = reverse(
            "monster-generate-image-jobs",
            kwargs={"monster_id": uuid.uuid4()},
        )
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            response = self.client.post(
                url, {}, format="json", HTTP_AUTHORIZATION="Bearer token"
            )
        self.assertEqual(response.status_code, 404)


# ---------------------------------------------------------------------------
# Job create — rate limit
# ---------------------------------------------------------------------------


class JobCreateRateLimitTests(APITestCase):
    """Per-user rolling 24-hour generation limit."""

    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid)
        self.monster = _create_monster(self.profile)
        self.url = reverse(
            "monster-generate-image-jobs",
            kwargs={"monster_id": self.monster.id},
        )

    def _post(self, uid=None):
        uid = uid or self.uid
        with patch(PATCH_JWT, return_value=_make_claims(uid)):
            return self.client.post(
                self.url,
                {},
                format="json",
                HTTP_AUTHORIZATION="Bearer token",
            )

    @override_settings(MAX_GENERATIONS_PER_DAY=3)
    def test_within_limit_allows_creation(self):
        # Two existing jobs — still under the limit of 3.
        _make_job(self.profile)
        _make_job(self.profile)
        response = self._post()
        self.assertEqual(response.status_code, 201)

    @override_settings(MAX_GENERATIONS_PER_DAY=3)
    def test_at_limit_returns_429(self):
        for _ in range(3):
            _make_job(self.profile)
        response = self._post()
        self.assertEqual(response.status_code, 429)

    @override_settings(MAX_GENERATIONS_PER_DAY=3)
    def test_limit_response_has_rate_limited_code(self):
        for _ in range(3):
            _make_job(self.profile)
        response = self._post()
        self.assertEqual(response.data["error"]["code"], "RATE_LIMITED")

    @override_settings(MAX_GENERATIONS_PER_DAY=3)
    def test_limit_response_has_user_friendly_message(self):
        for _ in range(3):
            _make_job(self.profile)
        response = self._post()
        self.assertIn("3", response.data["error"]["message"])
        self.assertIn("Try again tomorrow", response.data["error"]["message"])

    @override_settings(MAX_GENERATIONS_PER_DAY=3)
    def test_limit_is_per_user_not_global(self):
        """Another user's jobs must not count against this user's limit."""
        other_profile = _make_profile(uuid.uuid4(), "other@test.com")
        for _ in range(3):
            _make_job(other_profile)
        response = self._post()
        self.assertEqual(response.status_code, 201)

    @override_settings(MAX_GENERATIONS_PER_DAY=3)
    @patch("apps.monsters.views.sentry_sdk.capture_message")
    def test_limit_hit_fires_sentry_warning(self, mock_capture):
        for _ in range(3):
            _make_job(self.profile)
        self._post()
        mock_capture.assert_called_once()
        event_name, = mock_capture.call_args.args
        self.assertEqual(event_name, "image_generation.per_user_daily_limit_hit")

    @override_settings(MAX_GENERATIONS_PER_DAY=3)
    @patch("apps.monsters.views.sentry_sdk.capture_message")
    def test_sentry_event_does_not_include_raw_user_id(self, mock_capture):
        for _ in range(3):
            _make_job(self.profile)
        self._post()
        tags = mock_capture.call_args.kwargs["tags"]
        # The hashed user ID is included but the raw UUID must not appear.
        self.assertIn("user_id_hash", tags)
        self.assertNotIn(str(self.uid), str(tags))

    @override_settings(MAX_GENERATIONS_PER_DAY=0)
    def test_zero_limit_blocks_immediately(self):
        response = self._post()
        self.assertEqual(response.status_code, 429)


# ---------------------------------------------------------------------------
# Job detail
# ---------------------------------------------------------------------------


class JobDetailViewTests(APITestCase):
    def setUp(self):
        self.uid_a = uuid.uuid4()
        self.uid_b = uuid.uuid4()
        self.profile_a = _make_profile(self.uid_a, "a@test.com")
        self.profile_b = _make_profile(self.uid_b, "b@test.com")
        self.monster_a = _create_monster(self.profile_a)
        self.job_a = _make_job(self.profile_a)
        self.job_a.monster = self.monster_a
        self.job_a.save()

    def _url(self, monster_id, job_id):
        return reverse(
            "monster-generate-image-job-detail",
            kwargs={"monster_id": monster_id, "job_id": job_id},
        )

    def _call_as(self, uid, email, method, url, **kwargs):
        with patch(PATCH_JWT, return_value=_make_claims(uid, email)):
            return method(url, HTTP_AUTHORIZATION="Bearer token", **kwargs)

    def test_get_own_job_returns_200(self):
        url = self._url(self.monster_a.id, self.job_a.id)
        response = self._call_as(self.uid_a, "a@test.com", self.client.get, url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data["id"]), str(self.job_a.id))

    def test_get_other_users_job_returns_404(self):
        url = self._url(self.monster_a.id, self.job_a.id)
        response = self._call_as(self.uid_b, "b@test.com", self.client.get, url)
        self.assertEqual(response.status_code, 404)

    def test_get_job_with_wrong_monster_returns_404(self):
        monster_b = _create_monster(self.profile_a)  # same user, different monster
        url = self._url(monster_b.id, self.job_a.id)
        response = self._call_as(self.uid_a, "a@test.com", self.client.get, url)
        self.assertEqual(response.status_code, 404)

    def test_get_nonexistent_job_returns_404(self):
        url = self._url(self.monster_a.id, uuid.uuid4())
        response = self._call_as(self.uid_a, "a@test.com", self.client.get, url)
        self.assertEqual(response.status_code, 404)

    def test_get_without_auth_returns_401(self):
        url = self._url(self.monster_a.id, self.job_a.id)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)


# ---------------------------------------------------------------------------
# Job notification toggle
# ---------------------------------------------------------------------------


class JobNotificationViewTests(APITestCase):
    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid, "test@test.com")
        self.monster = _create_monster(self.profile)
        self.job = _make_job(self.profile)
        self.job.monster = self.monster
        self.job.save()

    def _url(self, monster_id=None, job_id=None):
        return reverse(
            "monster-generate-image-job-notification",
            kwargs={
                "monster_id": monster_id or self.monster.id,
                "job_id": job_id or self.job.id,
            },
        )

    def _call(self, method, url, **kwargs):
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return method(url, HTTP_AUTHORIZATION="Bearer token", **kwargs)

    def test_patch_toggles_email_preference_to_true(self):
        url = self._url()
        response = self._call(
            self.client.patch,
            url,
            data={"should_email_when_done": True},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.job.refresh_from_db()
        self.assertTrue(self.job.should_email_when_done)

    def test_patch_toggles_email_preference_to_false(self):
        self.job.should_email_when_done = True
        self.job.save()
        url = self._url()
        response = self._call(
            self.client.patch,
            url,
            data={"should_email_when_done": False},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.job.refresh_from_db()
        self.assertFalse(self.job.should_email_when_done)

    def test_patch_on_failed_job_returns_400(self):
        mark_job_failed(
            self.job,
            error_code="test_error",
            safe_error_message="Test failure",
        )
        url = self._url()
        response = self._call(
            self.client.patch,
            url,
            data={"should_email_when_done": True},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_patch_without_auth_returns_401(self):
        url = self._url()
        response = self.client.patch(
            url,
            data={"should_email_when_done": True},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_patch_other_users_job_returns_404(self):
        uid_b = uuid.uuid4()
        url = self._url()
        with patch(PATCH_JWT, return_value=_make_claims(uid_b, "b@test.com")):
            response = self.client.patch(
                url,
                data={"should_email_when_done": True},
                content_type="application/json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 404)

    def test_patch_with_wrong_monster_returns_404(self):
        other_monster = _create_monster(self.profile)
        url = self._url(monster_id=other_monster.id)
        response = self._call(
            self.client.patch,
            url,
            data={"should_email_when_done": True},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
