"""
Tests for image generation job create, detail, and notification views.

verify_supabase_jwt is patched so that any Bearer token is accepted and
resolves to the given claims.
"""

import uuid
from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APITestCase

from apps.accounts.models import UserProfile
from apps.monsters.models import Monster, MonsterImageGenerationJob, MonsterImageGenerationMode
from apps.monsters.services.generation_jobs import create_generation_job, mark_job_failed

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
    def test_missing_auth_returns_401(self):
        response = self.client.post(reverse("job-list-create"))
        self.assertEqual(response.status_code, 401)

    def test_create_job_with_no_body_returns_201(self):
        uid = uuid.uuid4()
        with patch(PATCH_JWT, return_value=_make_claims(uid)):
            response = self.client.post(
                reverse("job-list-create"),
                {},
                format="json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(MonsterImageGenerationJob.objects.count(), 1)

    def test_created_job_is_queued(self):
        uid = uuid.uuid4()
        with patch(PATCH_JWT, return_value=_make_claims(uid)):
            response = self.client.post(
                reverse("job-list-create"),
                {},
                format="json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.data["status"], "queued")

    def test_create_job_with_email_flag_sets_preference(self):
        uid = uuid.uuid4()
        with patch(PATCH_JWT, return_value=_make_claims(uid)):
            response = self.client.post(
                reverse("job-list-create"),
                {"should_email_when_done": True},
                format="json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 201)
        job = MonsterImageGenerationJob.objects.first()
        self.assertTrue(job.should_email_when_done)

    def test_create_job_owner_is_set_from_auth_not_client(self):
        uid = uuid.uuid4()
        with patch(PATCH_JWT, return_value=_make_claims(uid)):
            response = self.client.post(
                reverse("job-list-create"),
                {"owner": str(uuid.uuid4())},
                format="json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 201)
        job = MonsterImageGenerationJob.objects.first()
        self.assertEqual(str(job.owner.supabase_user_id), str(uid))

    def test_create_job_with_monster_id_attaches_monster(self):
        uid = uuid.uuid4()
        profile = _make_profile(uid)
        monster = _create_monster(profile)

        with patch(PATCH_JWT, return_value=_make_claims(uid)):
            response = self.client.post(
                reverse("job-list-create"),
                {"monster_id": str(monster.id)},
                format="json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 201)
        job = MonsterImageGenerationJob.objects.first()
        self.assertEqual(job.monster_id, monster.id)

    def test_create_job_with_other_users_monster_id_returns_404(self):
        uid_a = uuid.uuid4()
        uid_b = uuid.uuid4()
        profile_b = _make_profile(uid_b, "b@test.com")
        monster_b = _create_monster(profile_b)

        with patch(PATCH_JWT, return_value=_make_claims(uid_a, "a@test.com")):
            response = self.client.post(
                reverse("job-list-create"),
                {"monster_id": str(monster_b.id)},
                format="json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 404)


# ---------------------------------------------------------------------------
# Job detail
# ---------------------------------------------------------------------------


class JobDetailViewTests(APITestCase):
    def setUp(self):
        self.uid_a = uuid.uuid4()
        self.uid_b = uuid.uuid4()
        self.profile_a = _make_profile(self.uid_a, "a@test.com")
        self.profile_b = _make_profile(self.uid_b, "b@test.com")
        self.job_a = _make_job(self.profile_a)

    def _call_as(self, uid, email, method, url, **kwargs):
        with patch(PATCH_JWT, return_value=_make_claims(uid, email)):
            return method(url, HTTP_AUTHORIZATION="Bearer token", **kwargs)

    def test_get_own_job_returns_200(self):
        url = reverse("job-detail", kwargs={"job_id": self.job_a.id})
        response = self._call_as(self.uid_a, "a@test.com", self.client.get, url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data["id"]), str(self.job_a.id))

    def test_get_other_users_job_returns_404(self):
        url = reverse("job-detail", kwargs={"job_id": self.job_a.id})
        response = self._call_as(self.uid_b, "b@test.com", self.client.get, url)
        self.assertEqual(response.status_code, 404)

    def test_get_nonexistent_job_returns_404(self):
        url = reverse("job-detail", kwargs={"job_id": uuid.uuid4()})
        response = self._call_as(self.uid_a, "a@test.com", self.client.get, url)
        self.assertEqual(response.status_code, 404)

    def test_get_without_auth_returns_401(self):
        url = reverse("job-detail", kwargs={"job_id": self.job_a.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)


# ---------------------------------------------------------------------------
# Job notification toggle
# ---------------------------------------------------------------------------


class JobNotificationViewTests(APITestCase):
    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid, "test@test.com")
        self.job = _make_job(self.profile)

    def _call(self, method, url, **kwargs):
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return method(url, HTTP_AUTHORIZATION="Bearer token", **kwargs)

    def test_patch_toggles_email_preference_to_true(self):
        url = reverse("job-notification", kwargs={"job_id": self.job.id})
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
        url = reverse("job-notification", kwargs={"job_id": self.job.id})
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
        url = reverse("job-notification", kwargs={"job_id": self.job.id})
        response = self._call(
            self.client.patch,
            url,
            data={"should_email_when_done": True},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_patch_without_auth_returns_401(self):
        url = reverse("job-notification", kwargs={"job_id": self.job.id})
        response = self.client.patch(
            url,
            data={"should_email_when_done": True},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_patch_other_users_job_returns_404(self):
        uid_b = uuid.uuid4()
        url = reverse("job-notification", kwargs={"job_id": self.job.id})
        with patch(PATCH_JWT, return_value=_make_claims(uid_b, "b@test.com")):
            response = self.client.patch(
                url,
                data={"should_email_when_done": True},
                content_type="application/json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 404)


# ---------------------------------------------------------------------------
# Trusted-server stub endpoints
# ---------------------------------------------------------------------------


class TransitionStubViewTests(APITestCase):
    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid)
        self.job = _make_job(self.profile)

    def _post_as_self(self, url_name):
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return self.client.post(
                reverse(url_name, kwargs={"job_id": self.job.id}),
                HTTP_AUTHORIZATION="Bearer token",
            )

    def test_mark_running_returns_501(self):
        self.assertEqual(self._post_as_self("job-mark-running").status_code, 501)

    def test_mark_succeeded_returns_501(self):
        self.assertEqual(self._post_as_self("job-mark-succeeded").status_code, 501)

    def test_mark_failed_returns_501(self):
        self.assertEqual(self._post_as_self("job-mark-failed").status_code, 501)

    def test_mark_blocked_returns_501(self):
        self.assertEqual(self._post_as_self("job-mark-blocked").status_code, 501)
