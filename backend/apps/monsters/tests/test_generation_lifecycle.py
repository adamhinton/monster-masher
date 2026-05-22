"""
Full lifecycle integration tests for the image-generation pipeline.

Each test class walks a complete scenario through the Django API:

  Scenario 1 – succeeded:
    Monster create → job create → mark-running → mark-succeeded
    → job detail shows status=succeeded with linked MonsterImage

  Scenario 2 – failed:
    Monster create → job create → mark-running → mark-failed
    → job detail shows status=failed, no MonsterImage

  Scenario 3 – blocked (pre-flight, from QUEUED):
    Monster create → job create → mark-blocked
    → job detail shows status=blocked, no MonsterImage

  Scenario 4 – blocked (mid-run, from RUNNING):
    Monster create → job create → mark-running → mark-blocked
    → job detail shows status=blocked, no MonsterImage

These tests exercise the Django API endpoints end-to-end using the Django test
client. No external calls occur — there is no Next.js server, no OpenAI, no
Supabase Storage involved. verify_supabase_jwt is patched so any Bearer token
resolves to the fixture user's claims.
"""

import hashlib
import hmac
import json
import time
import uuid
from unittest.mock import patch

from django.conf import settings
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.accounts.models import UserProfile
from apps.monsters.models import (
    Monster,
    MonsterImage,
    MonsterImageGenerationJob,
    MonsterImageGenerationStatus,
)

PATCH_JWT = "apps.accounts.authentication.verify_supabase_jwt"


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _signed_internal_headers(method: str, path: str, body: str) -> dict:
    """Build HMAC auth headers for transition endpoints, mirroring Next.js signing."""
    timestamp = str(int(time.time()))
    payload = "\n".join([method.upper(), path, timestamp, body]).encode("utf-8")
    digest = hmac.new(
        settings.INTERNAL_TRANSITION_SECRET.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return {
        "HTTP_X_MONSTER_MASHER_INTERNAL_TIMESTAMP": timestamp,
        "HTTP_X_MONSTER_MASHER_INTERNAL_SIGNATURE": f"sha256={digest}",
    }


def _signed_auth_post(client, uid, url: str, data: dict):
    """POST to a transition endpoint with both JWT auth and HMAC signing."""
    body = json.dumps(data, separators=(",", ":"))
    headers = _signed_internal_headers("POST", url, body)
    headers["HTTP_AUTHORIZATION"] = "Bearer token"
    with patch(PATCH_JWT, return_value=_make_claims(uid)):
        return client.post(url, data=body, content_type="application/json", **headers)


def _make_claims(uid, email="lifecycle@example.com"):
    return {"sub": str(uid), "email": email, "aud": "authenticated"}


def _make_profile(uid=None, email="lifecycle@example.com"):
    uid = uid or uuid.uuid4()
    return UserProfile.objects.create(supabase_user_id=uid, email=email)


def _assert_job_status(test_case, job_id, expected_status):
    """Re-fetch job from DB and assert its status."""
    job = MonsterImageGenerationJob.objects.get(id=job_id)
    test_case.assertEqual(
        job.status,
        expected_status,
        f"Expected status={expected_status}, got {job.status}",
    )
    return job


# ---------------------------------------------------------------------------
# Scenario 1: happy path → succeeded
# ---------------------------------------------------------------------------


class LifecycleSucceededTests(APITestCase):
    """
    Full flow: Monster → job QUEUED → RUNNING → SUCCEEDED + MonsterImage.
    """

    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid)

    def _auth_post(self, url, data):
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return self.client.post(
                url,
                data=data,
                format="json",
                HTTP_AUTHORIZATION="Bearer token",
            )

    def _auth_get(self, url):
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return self.client.get(url, HTTP_AUTHORIZATION="Bearer token")

    def test_full_lifecycle_succeeds(self):
        # Step 1: create a Monster
        monster = Monster.objects.create(
            owner=self.profile,
            display_name="Craghorn",
            element="fire",
            habitat="volcano",
            personality="bold",
            color_palette="red and black",
        )

        # Step 2: create a generation job (status → QUEUED)
        create_url = reverse(
            "monster-generate-image-jobs",
            kwargs={"monster_id": monster.id},
        )
        create_resp = self._auth_post(create_url, {})
        self.assertEqual(create_resp.status_code, 201)
        job_id = create_resp.data["id"]
        self.assertEqual(create_resp.data["status"], "queued")

        # Step 3: mark-running (status → RUNNING)
        running_url = reverse(
            "monster-generate-image-mark-running",
            kwargs={"monster_id": monster.id},
        )
        running_resp = _signed_auth_post(
            self.client, self.uid, running_url, {"job_id": job_id}
        )
        self.assertEqual(running_resp.status_code, 200)
        self.assertEqual(running_resp.data["status"], "running")

        # Step 4: mark-succeeded (status → SUCCEEDED, creates MonsterImage)
        image_id = str(uuid.uuid4())
        succeeded_url = reverse(
            "monster-generate-image-mark-succeeded",
            kwargs={"monster_id": monster.id},
        )
        succeeded_resp = _signed_auth_post(
            self.client,
            self.uid,
            succeeded_url,
            {
                "job_id": job_id,
                "monster_image_id": image_id,
                "public_image_url": "https://storage.example.com/craghorn.png",
                "image_storage_path": f"monster-images/{self.uid}/{monster.id}/{image_id}.png",
                "provider": "fake",
                "provider_model": "fake-fixture-v1",
            },
        )
        self.assertEqual(succeeded_resp.status_code, 200)
        self.assertEqual(succeeded_resp.data["status"], "succeeded")

        # Verify DB state
        job = _assert_job_status(self, job_id, MonsterImageGenerationStatus.SUCCEEDED)
        self.assertIsNotNone(job.image_id)
        self.assertEqual(str(job.image_id), image_id)
        self.assertIsNotNone(job.started_at)
        self.assertIsNotNone(job.finished_at)

        # Verify MonsterImage was created and linked
        self.assertTrue(MonsterImage.objects.filter(id=image_id).exists())
        img = MonsterImage.objects.get(id=image_id)
        self.assertEqual(img.monster, monster)
        self.assertEqual(
            img.public_image_url, "https://storage.example.com/craghorn.png"
        )

        # Step 5: GET job detail and confirm final shape
        detail_url = reverse(
            "monster-generate-image-job-detail",
            kwargs={"monster_id": monster.id, "job_id": job_id},
        )
        detail_resp = self._auth_get(detail_url)
        self.assertEqual(detail_resp.status_code, 200)
        self.assertEqual(detail_resp.data["status"], "succeeded")
        self.assertIsNotNone(detail_resp.data.get("image"))
        self.assertEqual(
            detail_resp.data["image"]["public_image_url"],
            "https://storage.example.com/craghorn.png",
        )


# ---------------------------------------------------------------------------
# Scenario 2: running → failed
# ---------------------------------------------------------------------------


class LifecycleFailedTests(APITestCase):
    """
    Flow: Monster → job QUEUED → RUNNING → FAILED; no MonsterImage created.
    """

    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid)

    def _auth_post(self, url, data):
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return self.client.post(
                url, data=data, format="json", HTTP_AUTHORIZATION="Bearer token"
            )

    def _auth_get(self, url):
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return self.client.get(url, HTTP_AUTHORIZATION="Bearer token")

    def test_full_lifecycle_fails(self):
        monster = Monster.objects.create(
            owner=self.profile,
            display_name="Gloomfang",
            element="shadow",
            habitat="cave",
            personality="brooding",
            color_palette="dark purple",
        )

        # Create job
        job_resp = self._auth_post(
            reverse("monster-generate-image-jobs", kwargs={"monster_id": monster.id}),
            {},
        )
        self.assertEqual(job_resp.status_code, 201)
        job_id = job_resp.data["id"]

        # Mark running
        running_url = reverse(
            "monster-generate-image-mark-running",
            kwargs={"monster_id": monster.id},
        )
        running_resp = _signed_auth_post(
            self.client, self.uid, running_url, {"job_id": job_id}
        )
        self.assertEqual(running_resp.status_code, 200)

        # Mark failed
        failed_url = reverse(
            "monster-generate-image-mark-failed",
            kwargs={"monster_id": monster.id},
        )
        failed_resp = _signed_auth_post(
            self.client,
            self.uid,
            failed_url,
            {
                "job_id": job_id,
                "error_code": "provider_failed",
                "error_message": "The image provider returned an error.",
            },
        )
        self.assertEqual(failed_resp.status_code, 200)
        self.assertEqual(failed_resp.data["status"], "failed")

        # Verify DB state
        job = _assert_job_status(self, job_id, MonsterImageGenerationStatus.FAILED)
        self.assertIsNone(job.image_id)
        self.assertIsNotNone(job.finished_at)
        self.assertEqual(job.error_code, "provider_failed")

        # No MonsterImage should exist
        self.assertEqual(MonsterImage.objects.filter(monster=monster).count(), 0)

        # GET detail confirms failed state
        detail_resp = self._auth_get(
            reverse(
                "monster-generate-image-job-detail",
                kwargs={"monster_id": monster.id, "job_id": job_id},
            )
        )
        self.assertEqual(detail_resp.status_code, 200)
        self.assertEqual(detail_resp.data["status"], "failed")
        self.assertIsNone(detail_resp.data.get("image"))


# ---------------------------------------------------------------------------
# Scenario 3: blocked before running (pre-flight content check)
# ---------------------------------------------------------------------------


class LifecycleBlockedFromQueuedTests(APITestCase):
    """
    Flow: Monster → job QUEUED → BLOCKED (pre-flight); no RUNNING, no image.
    """

    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid)

    def _auth_post(self, url, data):
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return self.client.post(
                url, data=data, format="json", HTTP_AUTHORIZATION="Bearer token"
            )

    def _auth_get(self, url):
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return self.client.get(url, HTTP_AUTHORIZATION="Bearer token")

    def test_full_lifecycle_blocked_from_queued(self):
        monster = Monster.objects.create(
            owner=self.profile,
            display_name="Ripjaw",
            element="blood",
            habitat="dungeon",
            personality="violent",
            color_palette="crimson",
        )

        # Create job (QUEUED)
        job_resp = self._auth_post(
            reverse("monster-generate-image-jobs", kwargs={"monster_id": monster.id}),
            {},
        )
        self.assertEqual(job_resp.status_code, 201)
        job_id = job_resp.data["id"]
        self.assertEqual(job_resp.data["status"], "queued")

        # Mark blocked (banned-terms pre-flight catches it before mark-running)
        blocked_url = reverse(
            "monster-generate-image-mark-blocked",
            kwargs={"monster_id": monster.id},
        )
        blocked_resp = _signed_auth_post(
            self.client,
            self.uid,
            blocked_url,
            {
                "job_id": job_id,
                "error_code": "banned_terms",
                "error_message": "Prompt contains prohibited content.",
            },
        )
        self.assertEqual(blocked_resp.status_code, 200)
        self.assertEqual(blocked_resp.data["status"], "blocked")

        # Verify DB: blocked with both timestamps set (view handles this)
        job = _assert_job_status(self, job_id, MonsterImageGenerationStatus.BLOCKED)
        self.assertIsNone(job.image_id)
        self.assertIsNotNone(job.started_at)
        self.assertIsNotNone(job.finished_at)
        self.assertEqual(job.error_code, "banned_terms")

        # No MonsterImage
        self.assertEqual(MonsterImage.objects.filter(monster=monster).count(), 0)

        # GET detail confirms blocked state
        detail_resp = self._auth_get(
            reverse(
                "monster-generate-image-job-detail",
                kwargs={"monster_id": monster.id, "job_id": job_id},
            )
        )
        self.assertEqual(detail_resp.status_code, 200)
        self.assertEqual(detail_resp.data["status"], "blocked")
        self.assertIsNone(detail_resp.data.get("image"))


# ---------------------------------------------------------------------------
# Scenario 4: blocked mid-run (moderation catches it during RUNNING)
# ---------------------------------------------------------------------------


class LifecycleBlockedFromRunningTests(APITestCase):
    """
    Flow: Monster → job QUEUED → RUNNING → BLOCKED; no image.
    """

    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid)

    def _auth_post(self, url, data):
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return self.client.post(
                url, data=data, format="json", HTTP_AUTHORIZATION="Bearer token"
            )

    def _auth_get(self, url):
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return self.client.get(url, HTTP_AUTHORIZATION="Bearer token")

    def test_full_lifecycle_blocked_from_running(self):
        monster = Monster.objects.create(
            owner=self.profile,
            display_name="Shadowclaw",
            element="dark",
            habitat="void",
            personality="menacing",
            color_palette="black and grey",
        )

        # Create job (QUEUED)
        job_resp = self._auth_post(
            reverse("monster-generate-image-jobs", kwargs={"monster_id": monster.id}),
            {},
        )
        self.assertEqual(job_resp.status_code, 201)
        job_id = job_resp.data["id"]

        # Mark running
        running_url = reverse(
            "monster-generate-image-mark-running",
            kwargs={"monster_id": monster.id},
        )
        running_resp = _signed_auth_post(
            self.client, self.uid, running_url, {"job_id": job_id}
        )
        self.assertEqual(running_resp.status_code, 200)
        self.assertEqual(running_resp.data["status"], "running")

        # Mid-run moderation blocks it
        blocked_url = reverse(
            "monster-generate-image-mark-blocked",
            kwargs={"monster_id": monster.id},
        )
        blocked_resp = _signed_auth_post(
            self.client,
            self.uid,
            blocked_url,
            {
                "job_id": job_id,
                "error_code": "moderation_blocked",
                "error_message": "Content violates usage policy.",
            },
        )
        self.assertEqual(blocked_resp.status_code, 200)
        self.assertEqual(blocked_resp.data["status"], "blocked")

        # Verify DB
        job = _assert_job_status(self, job_id, MonsterImageGenerationStatus.BLOCKED)
        self.assertIsNone(job.image_id)
        self.assertIsNotNone(job.started_at)
        self.assertIsNotNone(job.finished_at)
        self.assertEqual(job.error_code, "moderation_blocked")

        # No MonsterImage
        self.assertEqual(MonsterImage.objects.filter(monster=monster).count(), 0)


# ---------------------------------------------------------------------------
# Cross-scenario: a succeeded job blocks a second job on the same monster
# ---------------------------------------------------------------------------


class LifecycleTwoJobsSameMonsterTests(APITestCase):
    """
    A Monster can have multiple generation jobs. Each job is independent.
    This ensures job isolation: one job succeeding does not prevent another
    from being created.
    """

    def setUp(self):
        self.uid = uuid.uuid4()
        self.profile = _make_profile(self.uid)

    def _auth_post(self, url, data):
        with patch(PATCH_JWT, return_value=_make_claims(self.uid)):
            return self.client.post(
                url, data=data, format="json", HTTP_AUTHORIZATION="Bearer token"
            )

    def test_two_jobs_on_same_monster_are_independent(self):
        monster = Monster.objects.create(
            owner=self.profile,
            display_name="Twinfang",
            element="wind",
            habitat="sky",
            personality="carefree",
            color_palette="white and cyan",
        )

        jobs_url = reverse(
            "monster-generate-image-jobs", kwargs={"monster_id": monster.id}
        )

        # First job → succeed it
        job1_resp = self._auth_post(jobs_url, {})
        job1_id = job1_resp.data["id"]

        running_url = reverse(
            "monster-generate-image-mark-running",
            kwargs={"monster_id": monster.id},
        )
        _signed_auth_post(self.client, self.uid, running_url, {"job_id": job1_id})
        image1_id = str(uuid.uuid4())
        succeeded_url = reverse(
            "monster-generate-image-mark-succeeded",
            kwargs={"monster_id": monster.id},
        )
        _signed_auth_post(
            self.client,
            self.uid,
            succeeded_url,
            {
                "job_id": job1_id,
                "monster_image_id": image1_id,
                "public_image_url": "https://storage.example.com/first.png",
                "image_storage_path": f"monster-images/{self.uid}/{monster.id}/{image1_id}.png",
                "provider": "fake",
                "provider_model": "fake-fixture-v1",
            },
        )

        # Second job can be created independently
        job2_resp = self._auth_post(jobs_url, {})
        self.assertEqual(job2_resp.status_code, 201)
        job2_id = job2_resp.data["id"]
        self.assertNotEqual(job1_id, job2_id)
        self.assertEqual(job2_resp.data["status"], "queued")

        # First job must still be succeeded
        _assert_job_status(self, job1_id, MonsterImageGenerationStatus.SUCCEEDED)
        # Second job is queued
        _assert_job_status(self, job2_id, MonsterImageGenerationStatus.QUEUED)

        # Two distinct jobs in DB for this monster
        self.assertEqual(
            MonsterImageGenerationJob.objects.filter(monster=monster).count(), 2
        )
