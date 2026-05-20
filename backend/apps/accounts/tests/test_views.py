"""
Testing /accounts/me/ and /accounts/me/bootstrap/ views.

These are all internal logic; no outside calls are made to supabase or anywhere else. So we can just create JWTs with PyJWT and test the views directly.
"""

import uuid
from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APITestCase

from apps.accounts.models import UserProfile


def _make_claims(uid=None, email="test@example.com"):
    return {"sub": str(uid or uuid.uuid4()), "email": email, "aud": "authenticated"}


class MeViewTests(APITestCase):
    def test_missing_token_returns_401(self):
        response = self.client.get(reverse("me"))
        self.assertEqual(response.status_code, 401)

    def test_invalid_token_returns_401(self):
        from rest_framework.exceptions import AuthenticationFailed

        with patch(
            "apps.accounts.authentication.verify_supabase_jwt",
            side_effect=AuthenticationFailed("bad"),
        ):
            response = self.client.get(
                reverse("me"), HTTP_AUTHORIZATION="Bearer bad-token"
            )
        self.assertEqual(response.status_code, 401)

    def test_valid_token_returns_200_with_profile(self):
        uid = uuid.uuid4()
        claims = _make_claims(uid)
        with patch(
            "apps.accounts.authentication.verify_supabase_jwt", return_value=claims
        ):
            response = self.client.get(
                reverse("me"), HTTP_AUTHORIZATION="Bearer valid-token"
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "test@example.com")

    def test_valid_token_returns_user_profile_fields(self):
        uid = uuid.uuid4()
        claims = _make_claims(uid)
        with patch(
            "apps.accounts.authentication.verify_supabase_jwt", return_value=claims
        ):
            response = self.client.get(
                reverse("me"), HTTP_AUTHORIZATION="Bearer valid-token"
            )
        self.assertIn("id", response.data)
        self.assertIn("supabase_user_id", response.data)
        self.assertIn("created_at", response.data)


class BootstrapMeViewTests(APITestCase):
    def test_missing_token_returns_401(self):
        response = self.client.post(reverse("me-bootstrap"))
        self.assertEqual(response.status_code, 401)

    def test_invalid_token_returns_401(self):
        from rest_framework.exceptions import AuthenticationFailed

        with patch(
            "apps.accounts.authentication.verify_supabase_jwt",
            side_effect=AuthenticationFailed("bad"),
        ):
            response = self.client.post(
                reverse("me-bootstrap"), HTTP_AUTHORIZATION="Bearer bad-token"
            )
        self.assertEqual(response.status_code, 401)

    def test_new_user_returns_200_and_creates_profile(self):
        uid = uuid.uuid4()
        claims = _make_claims(uid)
        with patch(
            "apps.accounts.authentication.verify_supabase_jwt", return_value=claims
        ):
            response = self.client.post(
                reverse("me-bootstrap"), HTTP_AUTHORIZATION="Bearer valid-token"
            )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(UserProfile.objects.filter(supabase_user_id=uid).exists())

    def test_repeated_calls_are_idempotent(self):
        uid = uuid.uuid4()
        claims = _make_claims(uid)
        with patch(
            "apps.accounts.authentication.verify_supabase_jwt", return_value=claims
        ):
            self.client.post(
                reverse("me-bootstrap"), HTTP_AUTHORIZATION="Bearer valid-token"
            )
            response = self.client.post(
                reverse("me-bootstrap"), HTTP_AUTHORIZATION="Bearer valid-token"
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(UserProfile.objects.filter(supabase_user_id=uid).count(), 1)


class AuthErrorResponseShapeTests(APITestCase):
    """
    Regression: 401 responses must use the project's error shape
    {error: {code, message, details}}, not DRF's default {detail: ...}.
    """

    def test_missing_token_401_shape(self):
        response = self.client.get(reverse("me"))
        self.assertEqual(response.status_code, 401)
        # Must not use DRF's default {detail: ...} shape.
        self.assertNotIn("detail", response.data)
        # Must use project's {error: {code, message, details}} shape.
        self.assertIn("error", response.data)
        error = response.data["error"]
        self.assertIn("code", error)
        self.assertIn("message", error)

    def test_invalid_token_401_shape(self):
        from rest_framework.exceptions import AuthenticationFailed

        with patch(
            "apps.accounts.authentication.verify_supabase_jwt",
            side_effect=AuthenticationFailed("bad token"),
        ):
            response = self.client.get(
                reverse("me"), HTTP_AUTHORIZATION="Bearer bad-token"
            )
        self.assertEqual(response.status_code, 401)
        self.assertNotIn("detail", response.data)
        self.assertIn("error", response.data)
        error = response.data["error"]
        self.assertIn("code", error)
        self.assertIn("message", error)


PATCH_JWT = "apps.accounts.authentication.verify_supabase_jwt"


def _make_profile(uid=None, email="test@example.com"):
    uid = uid or uuid.uuid4()
    return UserProfile.objects.create(supabase_user_id=uid, email=email)


class ImageGensRemainingViewTests(APITestCase):
    """
    Tests for GET /api/me/image-gens-remaining/.

    No external calls are made; verify_supabase_jwt is patched for all requests.
    """

    def _make_user_and_claims(self):
        uid = uuid.uuid4()
        profile = _make_profile(uid)
        claims = _make_claims(uid)
        return profile, claims

    def test_missing_auth_returns_401(self):
        response = self.client.get(reverse("me-image-gens-remaining"))
        self.assertEqual(response.status_code, 401)

    def test_returns_200_with_correct_shape(self):
        _profile, claims = self._make_user_and_claims()
        with patch(PATCH_JWT, return_value=claims):
            response = self.client.get(
                reverse("me-image-gens-remaining"),
                HTTP_AUTHORIZATION="Bearer valid-token",
            )
        self.assertEqual(response.status_code, 200)
        self.assertIn("num_remaining", response.data)
        self.assertIn("max_per_day", response.data)
        self.assertIn("used_today", response.data)

    def test_fresh_user_has_full_quota(self):
        _profile, claims = self._make_user_and_claims()
        with patch(PATCH_JWT, return_value=claims):
            response = self.client.get(
                reverse("me-image-gens-remaining"),
                HTTP_AUTHORIZATION="Bearer valid-token",
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["used_today"], 0)
        self.assertGreater(response.data["num_remaining"], 0)
        self.assertEqual(response.data["num_remaining"], response.data["max_per_day"])

    def test_remaining_decreases_when_jobs_exist(self):
        from apps.monsters.models import (
            Monster,
            MonsterImageGenerationJob,
            MonsterImageGenerationMode,
            MonsterImageGenerationStatus,
        )
        from django.utils import timezone

        profile, claims = self._make_user_and_claims()
        # Create two recent jobs for this user.
        for _ in range(2):
            monster = Monster.objects.create(
                owner=profile,
                display_name="Test",
                element="fire",
                habitat="cave",
                personality="bold",
                color_palette="red",
            )
            MonsterImageGenerationJob.objects.create(
                owner=profile,
                monster=monster,
                status=MonsterImageGenerationStatus.QUEUED,
                generation_mode=MonsterImageGenerationMode.FAKE,
                provider="fake",
                provider_model="fake-v1",
            )

        with patch(PATCH_JWT, return_value=claims):
            response = self.client.get(
                reverse("me-image-gens-remaining"),
                HTTP_AUTHORIZATION="Bearer valid-token",
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["used_today"], 2)
        self.assertEqual(
            response.data["num_remaining"], response.data["max_per_day"] - 2
        )

    def test_remaining_never_goes_below_zero(self):
        """When used_today exceeds max_per_day, remaining is clamped to 0."""
        from apps.monsters.models import (
            Monster,
            MonsterImageGenerationJob,
            MonsterImageGenerationMode,
            MonsterImageGenerationStatus,
        )

        profile, claims = self._make_user_and_claims()
        max_limit = 2

        with self.settings(MAX_GENERATIONS_PER_DAY=max_limit):
            for _ in range(max_limit + 3):
                monster = Monster.objects.create(
                    owner=profile,
                    display_name="Test",
                    element="fire",
                    habitat="cave",
                    personality="bold",
                    color_palette="red",
                )
                MonsterImageGenerationJob.objects.create(
                    owner=profile,
                    monster=monster,
                    status=MonsterImageGenerationStatus.QUEUED,
                    generation_mode=MonsterImageGenerationMode.FAKE,
                    provider="fake",
                    provider_model="fake-v1",
                )

            with patch(PATCH_JWT, return_value=claims):
                response = self.client.get(
                    reverse("me-image-gens-remaining"),
                    HTTP_AUTHORIZATION="Bearer valid-token",
                )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["num_remaining"], 0)


class PublicEndpointRegressionTests(APITestCase):
    """
    Regression guard: /health, /api/schema/, and /api/docs/ must always return
    200 without an auth token. Any accidental IsAuthenticated default would break these.
    """

    def test_health_returns_200_without_token(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)

    def test_api_schema_returns_200_without_token(self):
        response = self.client.get("/api/schema/")
        self.assertEqual(response.status_code, 200)

    def test_api_docs_returns_200_without_token(self):
        response = self.client.get("/api/docs/")
        self.assertEqual(response.status_code, 200)


class BootstrapMonstersTests(APITestCase):
    """
    Tests for the monsters payload nested inside the POST /api/me/bootstrap/ response.

    verify_supabase_jwt is patched so that tests run without a real Supabase instance.
    """

    def _do_bootstrap(self, uid, email="test@example.com"):
        claims = _make_claims(uid, email)
        with patch(
            "apps.accounts.authentication.verify_supabase_jwt", return_value=claims
        ):
            return self.client.post(
                reverse("me-bootstrap"), HTTP_AUTHORIZATION="Bearer valid-token"
            )

    def _make_monster(self, owner, display_name="Gloopbeast"):
        from apps.monsters.models import Monster

        return Monster.objects.create(
            owner=owner,
            display_name=display_name,
            element="fire",
            habitat="volcano",
            personality="grumpy",
            color_palette="red and black",
            flavor_text="Smells of sulphur.",
        )

    def _make_image(self, monster):
        from apps.monsters.models import MonsterImage

        return MonsterImage.objects.create(
            monster=monster,
            public_image_url="https://placehold.co/512x512.png",
            image_storage_path="monsters/test.png",
            provider="fake",
            provider_model="fake-fixture-v1",
        )

    def test_bootstrap_response_includes_monsters_key(self):
        uid = uuid.uuid4()
        response = self._do_bootstrap(uid)
        self.assertEqual(response.status_code, 200)
        self.assertIn("monsters", response.data)

    def test_monsters_is_empty_list_when_user_has_no_monsters(self):
        uid = uuid.uuid4()
        response = self._do_bootstrap(uid)
        self.assertEqual(response.data["monsters"], [])

    def test_monsters_contains_user_monsters(self):
        uid = uuid.uuid4()
        # Bootstrap to create the profile first
        response = self._do_bootstrap(uid)
        profile = UserProfile.objects.get(supabase_user_id=uid)
        self._make_monster(profile, "Blorp")
        self._make_monster(profile, "Zorp")

        response = self._do_bootstrap(uid)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["monsters"]), 2)

    def test_monster_has_expected_fields(self):
        uid = uuid.uuid4()
        response = self._do_bootstrap(uid)
        profile = UserProfile.objects.get(supabase_user_id=uid)
        self._make_monster(profile, "Flumpus")

        response = self._do_bootstrap(uid)
        monster = response.data["monsters"][0]
        self.assertIn("id", monster)
        self.assertIn("display_name", monster)
        self.assertIn("traits", monster)
        self.assertIn("flavor_text", monster)
        self.assertIn("created_at", monster)
        self.assertIn("updated_at", monster)
        self.assertIn("image", monster)

    def test_monster_traits_subobject_is_present(self):
        uid = uuid.uuid4()
        response = self._do_bootstrap(uid)
        profile = UserProfile.objects.get(supabase_user_id=uid)
        self._make_monster(profile, "Traitmaster")

        response = self._do_bootstrap(uid)
        traits = response.data["monsters"][0]["traits"]
        self.assertIn("element", traits)
        self.assertIn("habitat", traits)
        self.assertIn("personality", traits)
        self.assertIn("color_palette", traits)

    def test_monster_image_is_null_when_no_image_generated(self):
        uid = uuid.uuid4()
        response = self._do_bootstrap(uid)
        profile = UserProfile.objects.get(supabase_user_id=uid)
        self._make_monster(profile, "Imageless")

        response = self._do_bootstrap(uid)
        self.assertIsNone(response.data["monsters"][0]["image"])

    def test_monster_image_is_populated_when_image_exists(self):
        uid = uuid.uuid4()
        response = self._do_bootstrap(uid)
        profile = UserProfile.objects.get(supabase_user_id=uid)
        monster = self._make_monster(profile, "Picturesque")
        self._make_image(monster)

        response = self._do_bootstrap(uid)
        image = response.data["monsters"][0]["image"]
        self.assertIsNotNone(image)
        self.assertIn("id", image)
        self.assertIn("public_image_url", image)
        self.assertIn("provider", image)
        self.assertEqual(image["public_image_url"], "https://placehold.co/512x512.png")

    def test_monsters_ordered_newest_first(self):
        """Monsters must come back newest-first (-created_at), matching the Monster model ordering."""
        uid = uuid.uuid4()
        response = self._do_bootstrap(uid)
        profile = UserProfile.objects.get(supabase_user_id=uid)
        first = self._make_monster(profile, "Older")
        second = self._make_monster(profile, "Newer")

        response = self._do_bootstrap(uid)
        names = [m["display_name"] for m in response.data["monsters"]]
        # Newer was created last so it should appear first
        self.assertEqual(names[0], "Newer")
        self.assertEqual(names[1], "Older")

    def test_only_owner_monsters_are_returned(self):
        """A user must only see their own monsters, not another user's."""
        uid_a = uuid.uuid4()
        uid_b = uuid.uuid4()
        response_a = self._do_bootstrap(uid_a)
        response_b = self._do_bootstrap(uid_b)
        profile_a = UserProfile.objects.get(supabase_user_id=uid_a)
        profile_b = UserProfile.objects.get(supabase_user_id=uid_b)
        self._make_monster(profile_a, "A Monster")
        self._make_monster(profile_b, "B Monster")

        response_a = self._do_bootstrap(uid_a)
        self.assertEqual(len(response_a.data["monsters"]), 1)
        self.assertEqual(response_a.data["monsters"][0]["display_name"], "A Monster")

    def test_response_still_includes_profile_fields_alongside_monsters(self):
        uid = uuid.uuid4()
        response = self._do_bootstrap(uid)
        self.assertIn("id", response.data)
        self.assertIn("email", response.data)
        self.assertIn("supabase_user_id", response.data)
        self.assertIn("monsters", response.data)
