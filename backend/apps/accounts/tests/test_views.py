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
