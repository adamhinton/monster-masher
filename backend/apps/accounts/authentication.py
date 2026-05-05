"""
Supabase JWT authentication for Django REST Framework.

Flow:
1. Extract Bearer token from Authorization header.
2. Verify signature, expiry, issuer, and audience against Supabase JWKS.
3. Get or create a local UserProfile keyed by the verified supabase_user_id (sub claim).
4. Return (profile, claims) — DRF attaches profile to request.user.
"""

import logging
from typing import Any

import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.request import Request

from .models import UserProfile

logger = logging.getLogger(__name__)

# Module-level JWKS client so the public keys are cached across requests.
# Lazily initialised so tests can run without SUPABASE_JWKS_URL being set.
_jwks_client: jwt.PyJWKClient | None = None


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if not settings.SUPABASE_JWKS_URL:
            raise AuthenticationFailed("SUPABASE_JWKS_URL is not configured.")
        _jwks_client = jwt.PyJWKClient(settings.SUPABASE_JWKS_URL, cache_jwk_set=True)
    return _jwks_client


def extract_bearer_token(request: Request) -> str | None:
    """Return the raw token string from 'Authorization: Bearer <token>', or None."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer ") :]
    return token if token else None


def verify_supabase_jwt(token: str) -> dict[str, Any]:
    """
    Verify a Supabase-issued JWT and return its claims.

    Raises AuthenticationFailed on any verification failure. Never raises
    anything that would leak the raw token into logs or error messages.
    """
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    except jwt.exceptions.PyJWKClientError as exc:
        logger.warning(
            "JWKS client error during token verification: %s", type(exc).__name__
        )
        raise AuthenticationFailed("Token verification failed.") from exc

    try:
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=[settings.SUPABASE_JWT_ALGORITHM],
            audience=settings.SUPABASE_AUTH_AUDIENCE,
            issuer=settings.SUPABASE_JWT_ISSUER,
            options={"require": ["sub", "exp", "iss", "aud"]},
        )
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed("Token has expired.")
    except jwt.InvalidAudienceError:
        raise AuthenticationFailed("Token audience is invalid.")
    except jwt.InvalidIssuerError:
        raise AuthenticationFailed("Token issuer is invalid.")
    except jwt.DecodeError:
        raise AuthenticationFailed("Token could not be decoded.")
    except jwt.InvalidTokenError:
        raise AuthenticationFailed("Token is invalid.")

    return claims


def _log_profile_created(profile: UserProfile) -> None:
    """Structured log for a new user profile. Called once at creation."""
    logger.info(
        "user_profile_created",
        extra={
            "event": "user_profile_created",
            "user_profile_id": str(profile.id),
            "supabase_user_id": str(profile.supabase_user_id),
            # email_domain only — avoid sending full PII to logs by default.
            "email_domain": (
                profile.email.split("@")[-1] if "@" in profile.email else ""
            ),
        },
    )


class SupabaseJWTAuthentication(BaseAuthentication):
    """
    DRF authentication class that verifies Supabase-issued JWTs.

    On success, sets request.user to the local UserProfile and request.auth
    to the verified JWT claims dict.

    On missing Authorization header, returns None (allows unauthenticated access
    to public endpoints). On a present-but-invalid token, raises AuthenticationFailed.
    """

    def authenticate(self, request: Request):
        token = extract_bearer_token(request)

        if token is None:
            # No Authorization header — let the view's permission_classes decide.
            return None

        claims = verify_supabase_jwt(token)

        supabase_user_id = claims["sub"]
        email = claims.get("email", "")

        profile, created = UserProfile.objects.get_or_create(
            supabase_user_id=supabase_user_id,
            defaults={"email": email},
        )

        if created:
            _log_profile_created(profile)
        elif email and profile.email != email:
            # Keep email in sync if Supabase updates it.
            profile.email = email
            profile.save(update_fields=["email", "updated_at"])

        return (profile, claims)

    def authenticate_header(self, request: Request) -> str:
        # Returning "Bearer" causes DRF to send WWW-Authenticate: Bearer on 401s,
        # which is the correct HTTP response for token-based auth.
        return "Bearer"
