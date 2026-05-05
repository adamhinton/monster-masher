"""
Tests for authentication logic and helpers, particularly JWT stuff
Makes no outside calls — all external interactions are mocked, so these should run fast and reliably.
"""

import uuid
from unittest.mock import patch

from django.test import TestCase
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIRequestFactory

from apps.accounts.authentication import (
    SupabaseJWTAuthentication,
    extract_bearer_token,
)
from apps.accounts.models import UserProfile


def _make_claims(supabase_user_id=None, email="test@example.com"):
    return {
        "sub": str(supabase_user_id or uuid.uuid4()),
        "email": email,
        "aud": "authenticated",
    }


class ExtractBearerTokenTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def _request(self, auth_header=None):
        request = self.factory.get("/")
        if auth_header:
            request.META["HTTP_AUTHORIZATION"] = auth_header
        from rest_framework.request import Request

        return Request(request)

    def test_no_header_returns_none(self):
        self.assertIsNone(extract_bearer_token(self._request()))

    def test_non_bearer_header_returns_none(self):
        self.assertIsNone(extract_bearer_token(self._request("Token abc123")))

    def test_bearer_prefix_returns_token(self):
        self.assertEqual(
            extract_bearer_token(self._request("Bearer mytoken")), "mytoken"
        )

    def test_bearer_with_empty_token_returns_none(self):
        self.assertIsNone(extract_bearer_token(self._request("Bearer ")))


class SupabaseJWTAuthenticationTests(TestCase):
    def setUp(self):
        self.auth = SupabaseJWTAuthentication()
        self.factory = APIRequestFactory()

    def _request(self, auth_header=None):
        request = self.factory.get("/")
        if auth_header:
            request.META["HTTP_AUTHORIZATION"] = auth_header
        from rest_framework.request import Request

        return Request(request)

    def test_no_authorization_header_returns_none(self):
        result = self.auth.authenticate(self._request())
        self.assertIsNone(result)

    def test_non_bearer_authorization_returns_none(self):
        result = self.auth.authenticate(self._request("Token whatever"))
        self.assertIsNone(result)

    def test_invalid_token_raises_authentication_failed(self):
        with patch(
            "apps.accounts.authentication.verify_supabase_jwt",
            side_effect=AuthenticationFailed("bad token"),
        ):
            with self.assertRaises(AuthenticationFailed):
                self.auth.authenticate(self._request("Bearer bad-token"))

    def test_valid_token_creates_user_profile(self):
        uid = uuid.uuid4()
        claims = _make_claims(uid)
        with patch(
            "apps.accounts.authentication.verify_supabase_jwt", return_value=claims
        ):
            profile, returned_claims = self.auth.authenticate(
                self._request("Bearer valid-token")
            )
        self.assertEqual(str(profile.supabase_user_id), str(uid))
        self.assertEqual(profile.email, "test@example.com")
        self.assertTrue(UserProfile.objects.filter(supabase_user_id=uid).exists())

    def test_valid_token_reuses_existing_profile(self):
        uid = uuid.uuid4()
        UserProfile.objects.create(supabase_user_id=uid, email="old@example.com")
        claims = _make_claims(uid, email="old@example.com")
        with patch(
            "apps.accounts.authentication.verify_supabase_jwt", return_value=claims
        ):
            self.auth.authenticate(self._request("Bearer valid-token"))
        self.assertEqual(UserProfile.objects.filter(supabase_user_id=uid).count(), 1)

    def test_email_updated_if_changed(self):
        uid = uuid.uuid4()
        UserProfile.objects.create(supabase_user_id=uid, email="old@example.com")
        claims = _make_claims(uid, email="new@example.com")
        with patch(
            "apps.accounts.authentication.verify_supabase_jwt", return_value=claims
        ):
            self.auth.authenticate(self._request("Bearer valid-token"))
        self.assertEqual(
            UserProfile.objects.get(supabase_user_id=uid).email, "new@example.com"
        )

    def test_authenticate_header_returns_bearer(self):
        self.assertEqual(self.auth.authenticate_header(self._request()), "Bearer")
