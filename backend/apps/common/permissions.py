"""
Permission classes for internal server-to-server calls.
"""

import hashlib
import hmac
import time

from django.conf import settings
from rest_framework.permissions import BasePermission
from rest_framework.request import Request


class HasValidInternalTransitionSignature(BasePermission):
    """
    Require an HMAC signature for image-generation transition endpoints.

    User JWT auth still establishes ownership. This permission adds a separate
    server-only proof so browser users cannot call transition endpoints directly.
    """

    message = "A valid internal transition signature is required."

    timestamp_header = "X-Monster-Masher-Internal-Timestamp"
    signature_header = "X-Monster-Masher-Internal-Signature"

    def has_permission(self, request: Request, view) -> bool:
        secret = getattr(settings, "INTERNAL_TRANSITION_SECRET", "")
        if not secret:
            return False

        timestamp = request.headers.get(self.timestamp_header)
        signature = request.headers.get(self.signature_header)
        if not timestamp or not signature:
            return False

        try:
            timestamp_seconds = int(timestamp)
        except ValueError:
            return False

        max_skew_seconds = getattr(
            settings, "INTERNAL_TRANSITION_MAX_CLOCK_SKEW_SECONDS", 300
        )
        if abs(int(time.time()) - timestamp_seconds) > max_skew_seconds:
            return False

        body = request._request.body
        expected_signature = _sign_transition_request(
            secret=secret,
            method=request.method,
            path=request.get_full_path(),
            timestamp=timestamp,
            body=body,
        )
        return hmac.compare_digest(signature, expected_signature)


def _sign_transition_request(
    *,
    secret: str,
    method: str,
    path: str,
    timestamp: str,
    body: bytes,
) -> str:
    payload = b"\n".join(
        [
            method.upper().encode("utf-8"),
            path.encode("utf-8"),
            timestamp.encode("utf-8"),
            body,
        ]
    )
    digest = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return f"sha256={digest}"
