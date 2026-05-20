"""
Tests for Monster list, create, detail, update, and delete views.

These tests do not call real Supabase endpoints.  verify_supabase_jwt is
patched so that any Bearer token is accepted and resolves to the given claims.
"""

import uuid
from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APITestCase

from apps.accounts.models import UserProfile
from apps.monsters.models import Monster

PATCH_JWT = "apps.accounts.authentication.verify_supabase_jwt"


def _make_claims(uid, email="test@example.com"):
    return {"sub": str(uid), "email": email, "aud": "authenticated"}


def _make_profile(uid=None, email="test@example.com"):
    uid = uid or uuid.uuid4()
    return UserProfile.objects.create(supabase_user_id=uid, email=email)


def _monster_payload():
    return {
        "display_name": "Blorp",
        "traits": {
            "element": "fire",
            "habitat": "volcano",
            "personality": "grumpy",
            "color_palette": "red and orange",
        },
    }


def _create_monster(owner: UserProfile, display_name: str = "Test Monster") -> Monster:
    return Monster.objects.create(
        owner=owner,
        display_name=display_name,
        element="fire",
        habitat="cave",
        personality="brave",
        color_palette="red",
    )


# ---------------------------------------------------------------------------
# Monster list + create
# ---------------------------------------------------------------------------


class MonsterListViewTests(APITestCase):
    def test_missing_auth_returns_401(self):
        response = self.client.get(reverse("monster-list-create"))
        self.assertEqual(response.status_code, 401)

    def test_invalid_token_returns_401(self):
        from rest_framework.exceptions import AuthenticationFailed

        with patch(PATCH_JWT, side_effect=AuthenticationFailed("bad")):
            response = self.client.get(
                reverse("monster-list-create"), HTTP_AUTHORIZATION="Bearer bad"
            )
        self.assertEqual(response.status_code, 401)

    def test_list_returns_only_own_monsters(self):
        uid_a = uuid.uuid4()
        uid_b = uuid.uuid4()
        profile_a = _make_profile(uid_a, "a@test.com")
        profile_b = _make_profile(uid_b, "b@test.com")
        _create_monster(profile_a, "A Monster")
        _create_monster(profile_b, "B Monster")

        with patch(PATCH_JWT, return_value=_make_claims(uid_a, "a@test.com")):
            response = self.client.get(
                reverse("monster-list-create"), HTTP_AUTHORIZATION="Bearer token"
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["display_name"], "A Monster")

    def test_list_returns_empty_for_user_with_no_monsters(self):
        uid = uuid.uuid4()
        with patch(PATCH_JWT, return_value=_make_claims(uid)):
            response = self.client.get(
                reverse("monster-list-create"), HTTP_AUTHORIZATION="Bearer token"
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_create_monster_returns_201(self):
        uid = uuid.uuid4()
        with patch(PATCH_JWT, return_value=_make_claims(uid)):
            response = self.client.post(
                reverse("monster-list-create"),
                _monster_payload(),
                format="json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 201)
        self.assertIn("id", response.data)
        self.assertEqual(response.data["display_name"], "Blorp")

    def test_create_monster_sets_owner_from_auth_not_client(self):
        uid = uuid.uuid4()
        payload = {**_monster_payload(), "owner": str(uuid.uuid4())}
        with patch(PATCH_JWT, return_value=_make_claims(uid)):
            response = self.client.post(
                reverse("monster-list-create"),
                payload,
                format="json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 201)
        monster = Monster.objects.get(id=response.data["id"])
        self.assertEqual(str(monster.owner.supabase_user_id), str(uid))

    def test_create_monster_missing_required_field_returns_400(self):
        uid = uuid.uuid4()
        bad_payload = {
            "traits": {
                "element": "fire",
                "habitat": "cave",
                "personality": "bold",
                "color_palette": "red",
            }
            # display_name is missing
        }
        with patch(PATCH_JWT, return_value=_make_claims(uid)):
            response = self.client.post(
                reverse("monster-list-create"),
                bad_payload,
                format="json",
                HTTP_AUTHORIZATION="Bearer token",
            )
        self.assertEqual(response.status_code, 400)


# ---------------------------------------------------------------------------
# Monster detail, update, delete
# ---------------------------------------------------------------------------


class MonsterDetailViewTests(APITestCase):
    def setUp(self):
        self.uid_a = uuid.uuid4()
        self.uid_b = uuid.uuid4()
        self.profile_a = _make_profile(self.uid_a, "a@test.com")
        self.profile_b = _make_profile(self.uid_b, "b@test.com")
        self.monster_a = _create_monster(self.profile_a, "A Monster")

    def _call_as(self, uid, email, method, url, **kwargs):
        with patch(PATCH_JWT, return_value=_make_claims(uid, email)):
            return method(url, HTTP_AUTHORIZATION="Bearer token", **kwargs)

    # GET

    def test_get_own_monster_returns_200(self):
        url = reverse("monster-detail", kwargs={"monster_id": self.monster_a.id})
        response = self._call_as(self.uid_a, "a@test.com", self.client.get, url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["display_name"], "A Monster")

    def test_get_other_users_monster_returns_404(self):
        url = reverse("monster-detail", kwargs={"monster_id": self.monster_a.id})
        response = self._call_as(self.uid_b, "b@test.com", self.client.get, url)
        self.assertEqual(response.status_code, 404)

    def test_get_nonexistent_monster_returns_404(self):
        url = reverse("monster-detail", kwargs={"monster_id": uuid.uuid4()})
        response = self._call_as(self.uid_a, "a@test.com", self.client.get, url)
        self.assertEqual(response.status_code, 404)

    def test_get_without_auth_returns_401(self):
        url = reverse("monster-detail", kwargs={"monster_id": self.monster_a.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    # PATCH

    def test_patch_own_monster_returns_200_with_updated_data(self):
        url = reverse("monster-detail", kwargs={"monster_id": self.monster_a.id})
        response = self._call_as(
            self.uid_a,
            "a@test.com",
            self.client.patch,
            url,
            data={"display_name": "Updated Name"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["display_name"], "Updated Name")
        self.monster_a.refresh_from_db()
        self.assertEqual(self.monster_a.display_name, "Updated Name")

    def test_patch_other_users_monster_returns_404(self):
        url = reverse("monster-detail", kwargs={"monster_id": self.monster_a.id})
        response = self._call_as(
            self.uid_b,
            "b@test.com",
            self.client.patch,
            url,
            data={"display_name": "Hacked"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        self.monster_a.refresh_from_db()
        self.assertEqual(self.monster_a.display_name, "A Monster")

    # DELETE

    def test_delete_own_monster_returns_204_and_removes_row(self):
        url = reverse("monster-detail", kwargs={"monster_id": self.monster_a.id})
        response = self._call_as(self.uid_a, "a@test.com", self.client.delete, url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Monster.objects.filter(id=self.monster_a.id).exists())

    def test_delete_other_users_monster_returns_404_and_leaves_row(self):
        url = reverse("monster-detail", kwargs={"monster_id": self.monster_a.id})
        response = self._call_as(self.uid_b, "b@test.com", self.client.delete, url)
        self.assertEqual(response.status_code, 404)
        self.assertTrue(Monster.objects.filter(id=self.monster_a.id).exists())


# ---------------------------------------------------------------------------
# MonsterImage delete
# ---------------------------------------------------------------------------


def _make_image(monster: Monster) -> "MonsterImage":
    from apps.monsters.models import MonsterImage

    return MonsterImage.objects.create(
        monster=monster,
        public_image_url="https://example.com/img.png",
        image_storage_path="monster-images/test/img.png",
        provider="fake",
        provider_model="fake-v1",
    )


class MonsterImageDeleteViewTests(APITestCase):
    """
    Tests for DELETE /api/monsters/{monster_id}/image/.

    Verifies ownership, correct 204/404 responses, and that the job history
    is preserved when an image is deleted.
    """

    def setUp(self):
        self.uid_a = uuid.uuid4()
        self.uid_b = uuid.uuid4()
        self.profile_a = _make_profile(self.uid_a, "a@test.com")
        self.profile_b = _make_profile(self.uid_b, "b@test.com")
        self.monster_a = _create_monster(self.profile_a, "Monster A")

    def _call_as(self, uid, email, method, url, **kwargs):
        claims = _make_claims(uid, email)
        with patch(PATCH_JWT, return_value=claims):
            return method(url, HTTP_AUTHORIZATION="Bearer valid-token", **kwargs)

    def test_missing_auth_returns_401(self):
        url = reverse("monster-image-delete", kwargs={"monster_id": self.monster_a.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 401)

    def test_delete_when_no_image_returns_404(self):
        url = reverse("monster-image-delete", kwargs={"monster_id": self.monster_a.id})
        response = self._call_as(self.uid_a, "a@test.com", self.client.delete, url)
        self.assertEqual(response.status_code, 404)

    def test_delete_own_image_returns_204(self):
        _make_image(self.monster_a)
        url = reverse("monster-image-delete", kwargs={"monster_id": self.monster_a.id})
        response = self._call_as(self.uid_a, "a@test.com", self.client.delete, url)
        self.assertEqual(response.status_code, 204)

    def test_delete_removes_image_record(self):
        from apps.monsters.models import MonsterImage

        image = _make_image(self.monster_a)
        image_id = image.id
        url = reverse("monster-image-delete", kwargs={"monster_id": self.monster_a.id})
        self._call_as(self.uid_a, "a@test.com", self.client.delete, url)
        self.assertFalse(MonsterImage.objects.filter(id=image_id).exists())

    def test_delete_other_users_image_returns_404(self):
        _make_image(self.monster_a)
        url = reverse("monster-image-delete", kwargs={"monster_id": self.monster_a.id})
        response = self._call_as(self.uid_b, "b@test.com", self.client.delete, url)
        self.assertEqual(response.status_code, 404)

    def test_delete_does_not_remove_monster(self):
        _make_image(self.monster_a)
        url = reverse("monster-image-delete", kwargs={"monster_id": self.monster_a.id})
        self._call_as(self.uid_a, "a@test.com", self.client.delete, url)
        self.assertTrue(Monster.objects.filter(id=self.monster_a.id).exists())

    def test_generation_jobs_preserved_after_image_delete(self):
        """Job history must survive image deletion per design intent."""
        from django.utils import timezone
        from apps.monsters.models import (
            MonsterImage,
            MonsterImageGenerationJob,
            MonsterImageGenerationMode,
            MonsterImageGenerationStatus,
        )

        image = _make_image(self.monster_a)
        now = timezone.now()
        job = MonsterImageGenerationJob.objects.create(
            owner=self.profile_a,
            monster=self.monster_a,
            image=image,
            status=MonsterImageGenerationStatus.SUCCEEDED,
            generation_mode=MonsterImageGenerationMode.FAKE,
            provider="fake",
            provider_model="fake-v1",
            started_at=now,
            finished_at=now,
        )
        url = reverse("monster-image-delete", kwargs={"monster_id": self.monster_a.id})
        self._call_as(self.uid_a, "a@test.com", self.client.delete, url)

        job.refresh_from_db()
        self.assertIsNone(job.image)

    def test_deletes_most_recent_image_when_multiple_exist(self):
        """If somehow multiple images exist, the most recent one is deleted."""
        from apps.monsters.models import MonsterImage

        older = _make_image(self.monster_a)
        newer = _make_image(self.monster_a)
        url = reverse("monster-image-delete", kwargs={"monster_id": self.monster_a.id})
        self._call_as(self.uid_a, "a@test.com", self.client.delete, url)

        self.assertFalse(MonsterImage.objects.filter(id=newer.id).exists())
        self.assertTrue(MonsterImage.objects.filter(id=older.id).exists())
