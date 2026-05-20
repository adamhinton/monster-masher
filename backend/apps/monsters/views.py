"""
Monster and image generation job views.

Ownership is enforced by filtering all querysets and get_object_or_404 calls
on owner=request.user, which causes non-owner access to return 404, not 403
(per Step 5c requirement).  No endpoint accepts owner_id as input from the
client; ownership always comes from the verified request.user.

Trust boundary for image-generation transition endpoints:
    Next.js forwards the user's Supabase access token to Django.
    Django verifies the JWT (IsAuthenticated), confirms that the monster
    belongs to the authenticated user, and confirms that the job belongs to
    the same user and is attached to that monster.
    This keeps the implementation simple and avoids a shared server secret.
    Because the user's own token is used, the client could in principle call
    these endpoints directly; the views are designed to be safe at the user
    level (correct ownership checks, valid state transitions).
"""

import hashlib
from datetime import timedelta

import sentry_sdk
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.monsters.models import (
    Monster,
    MonsterImage,
    MonsterImageGenerationJob,
    MonsterImageGenerationMode,
    MonsterImageGenerationStatus,
)
from apps.monsters.serializers import (
    MarkJobBlockedSerializer,
    MarkJobFailedSerializer,
    MarkJobRunningSerializer,
    MarkJobSucceededSerializer,
    MonsterCreateSerializer,
    MonsterImageGenerationJobCreateSerializer,
    MonsterImageGenerationJobNotificationUpdateSerializer,
    MonsterImageGenerationJobSerializer,
    MonsterSerializer,
    MonsterUpdateSerializer,
)
from apps.monsters.services.generation_jobs import (
    InvalidJobTransition,
    create_generation_job,
    mark_job_blocked,
    mark_job_failed,
    mark_job_running,
    mark_job_succeeded,
)

_TERMINAL_STATUSES = frozenset(
    [
        MonsterImageGenerationStatus.SUCCEEDED,
        MonsterImageGenerationStatus.FAILED,
        MonsterImageGenerationStatus.BLOCKED,
    ]
)


# ---------------------------------------------------------------------------
# Monster views
# ---------------------------------------------------------------------------


class MonsterListCreateView(GenericAPIView):
    """
    GET  /api/monsters/   — list the authenticated user's monsters.
    POST /api/monsters/   — create a monster owned by the authenticated user.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List current user's monsters",
        responses={200: MonsterSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        monsters = Monster.objects.filter(owner=request.user).prefetch_related("images")
        serializer = MonsterSerializer(monsters, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Create a monster",
        request=MonsterCreateSerializer,
        responses={201: MonsterSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = MonsterCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        monster = serializer.save()
        return Response(MonsterSerializer(monster).data, status=status.HTTP_201_CREATED)


class MonsterDetailView(GenericAPIView):
    """
    GET    /api/monsters/{monster_id}/ — retrieve a monster.
    PATCH  /api/monsters/{monster_id}/ — partial-update a monster.
    DELETE /api/monsters/{monster_id}/ — delete a monster.

    Returns 404 (not 403) when the monster does not exist or belongs to
    another user.
    """

    permission_classes = [IsAuthenticated]

    def _get_monster(self, request: Request, monster_id) -> Monster:
        return get_object_or_404(Monster, id=monster_id, owner=request.user)

    @extend_schema(
        summary="Get a monster",
        responses={200: MonsterSerializer},
    )
    def get(self, request: Request, monster_id) -> Response:
        monster = self._get_monster(request, monster_id)
        return Response(MonsterSerializer(monster).data)

    @extend_schema(
        summary="Partial-update a monster",
        request=MonsterUpdateSerializer,
        responses={200: MonsterSerializer},
    )
    def patch(self, request: Request, monster_id) -> Response:
        monster = self._get_monster(request, monster_id)
        serializer = MonsterUpdateSerializer(monster, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(MonsterSerializer(updated).data)

    @extend_schema(
        summary="Delete a monster",
        responses={204: None},
    )
    def delete(self, request: Request, monster_id) -> Response:
        monster = self._get_monster(request, monster_id)
        monster.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MonsterImageDeleteView(GenericAPIView):
    """
    DELETE /api/monsters/{monster_id}/image/

    Deletes the current MonsterImage for a monster. The monster record itself
    is preserved. MonsterImageGenerationJob records linked to the deleted image
    are also preserved as historical records — they document that a generation
    attempt was made and are useful for admin visibility and rate-limit counting.

    Design note: this endpoint is called by the Next.js generate-image route
    before retrying image generation for a monster that already has an image.
    Keeping old job records means the admin can see retry patterns, and the
    rate limiter correctly counts retries against the daily quota.

    Returns 204 if the image was deleted, or 404 if the monster has no image.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Delete the current image for a monster",
        responses={204: None, 404: None},
    )
    def delete(self, request: Request, monster_id) -> Response:
        monster = get_object_or_404(Monster, id=monster_id, owner=request.user)
        # MonsterImage.Meta ordering = ["-created_at"] so .first() returns the
        # most recently created image — matching what MonsterSerializer exposes.
        image = monster.images.first()
        if image is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Image generation job views
# ---------------------------------------------------------------------------


class ImageGenerationJobCreateView(GenericAPIView):
    """
    POST /api/monsters/{monster_id}/generate-image/jobs/

    Creates a generation job attached to the given monster. monster_id is
    always taken from the URL — never from the request body.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MonsterImageGenerationJobCreateSerializer

    @extend_schema(
        summary="Create an image generation job",
        request=MonsterImageGenerationJobCreateSerializer,
        responses={201: MonsterImageGenerationJobSerializer},
    )
    def post(self, request: Request, monster_id) -> Response:
        monster = get_object_or_404(Monster, id=monster_id, owner=request.user)

        # ── Per-user daily rate limit. Currently set to 6 images per user. ─────────────────────────────────────────
        cutoff = timezone.now() - timedelta(hours=24)
        recent_count = MonsterImageGenerationJob.objects.filter(
            owner=request.user,
            created_at__gte=cutoff,
        ).count()
        max_per_day: int = getattr(settings, "MAX_GENERATIONS_PER_DAY", 12)
        if recent_count >= max_per_day:
            # Hash the user ID so Sentry sees an abuse signal without raw PII.
            user_id_hash = hashlib.sha256(
                str(request.user.supabase_user_id).encode()
            ).hexdigest()[:16]
            sentry_sdk.capture_message(
                "image_generation.per_user_daily_limit_hit",
                level="warning",
                tags={"user_id_hash": user_id_hash, "limit": str(max_per_day)},
            )
            return Response(
                {
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": (
                            f"You've reached the daily limit of {max_per_day} image "
                            "generations. Try again tomorrow."
                        ),
                    }
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = MonsterImageGenerationJobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        job = create_generation_job(
            owner=request.user,
            generation_mode=MonsterImageGenerationMode.FAKE,
            provider="fake",
            provider_model="fake-fixture-v1",
            should_email_when_done=vd["should_email_when_done"],
        )
        job.monster = monster
        job.save()

        return Response(
            MonsterImageGenerationJobSerializer(job).data,
            status=status.HTTP_201_CREATED,
        )


class ImageGenerationJobDetailView(GenericAPIView):
    """
    GET /api/monsters/{monster_id}/generate-image/jobs/{job_id}/

    Returns 404 (not 403) when the job does not exist, belongs to another
    user, or is not attached to the given monster.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MonsterImageGenerationJobSerializer

    @extend_schema(
        summary="Get an image generation job",
        responses={200: MonsterImageGenerationJobSerializer},
    )
    def get(self, request: Request, monster_id, job_id) -> Response:
        monster = get_object_or_404(Monster, id=monster_id, owner=request.user)
        job = get_object_or_404(
            MonsterImageGenerationJob, id=job_id, owner=request.user, monster=monster
        )
        return Response(MonsterImageGenerationJobSerializer(job).data)


class ImageGenerationJobNotificationView(GenericAPIView):
    """
    PATCH /api/monsters/{monster_id}/generate-image/jobs/{job_id}/notification/

    Toggle email notification preference. Returns 400 if the job is already
    in a terminal state (succeeded, failed, or blocked) because the
    notification window has closed.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MonsterImageGenerationJobNotificationUpdateSerializer

    @extend_schema(
        summary="Toggle email notification preference for a job",
        request=MonsterImageGenerationJobNotificationUpdateSerializer,
        responses={200: MonsterImageGenerationJobSerializer, 400: None},
    )
    def patch(self, request: Request, monster_id, job_id) -> Response:
        monster = get_object_or_404(Monster, id=monster_id, owner=request.user)
        job = get_object_or_404(
            MonsterImageGenerationJob, id=job_id, owner=request.user, monster=monster
        )

        if job.status in _TERMINAL_STATUSES:
            return Response(
                {"detail": "Cannot update notification preference on a completed job."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = MonsterImageGenerationJobNotificationUpdateSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        job.should_email_when_done = serializer.validated_data["should_email_when_done"]
        job.save()
        return Response(MonsterImageGenerationJobSerializer(job).data)


# ---------------------------------------------------------------------------
# Trusted-server transition endpoints
#
# Trust boundary: Next.js forwards the user's Supabase access token.
# See module docstring for rationale.
#
# All four views follow the same pattern:
#   1. Verify the monster exists and belongs to the authenticated user (404 if not).
#   2. Parse and validate the request body (job_id + any transition-specific fields).
#   3. Verify the job exists, belongs to the user, and is attached to that monster.
#   4. Attempt the transition; return 409 if the state machine rejects it.
#   5. Return the updated job serialized as MonsterImageGenerationJobSerializer.
# ---------------------------------------------------------------------------


def _get_job_for_transition(
    request: Request,
    monster: Monster,
    job_id,
) -> MonsterImageGenerationJob | None:
    """
    Fetch the job, verifying ownership and monster attachment.

    Returns None if the job does not exist, belongs to another user,
    or is not attached to the given monster (caller should return 404).
    """
    try:
        return MonsterImageGenerationJob.objects.get(
            id=job_id,
            owner=request.user,
            monster=monster,
        )
    except MonsterImageGenerationJob.DoesNotExist:
        return None


class MonsterGenerateImageMarkRunningView(APIView):
    """
    POST /api/monsters/{monster_id}/generate-image/mark-running/

    Transitions a QUEUED job to RUNNING. Called by the Next.js pipeline
    after moderation passes and before image generation begins.

    Body: { job_id }
    Returns: the updated MonsterImageGenerationJob.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Mark image generation job as running",
        request=MarkJobRunningSerializer,
        responses={200: MonsterImageGenerationJobSerializer, 404: None, 409: None},
    )
    def post(self, request: Request, monster_id) -> Response:
        monster = get_object_or_404(Monster, id=monster_id, owner=request.user)

        serializer = MarkJobRunningSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        job = _get_job_for_transition(
            request, monster, serializer.validated_data["job_id"]
        )
        if job is None:
            return Response(
                {"error": {"code": "not_found", "message": "Job not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            updated_job = mark_job_running(job)
        except InvalidJobTransition as exc:
            return Response(
                {
                    "error": {
                        "code": "invalid_transition",
                        "message": str(exc),
                    }
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(MonsterImageGenerationJobSerializer(updated_job).data)


class MonsterGenerateImageMarkSucceededView(APIView):
    """
    POST /api/monsters/{monster_id}/generate-image/mark-succeeded/

    Transitions a RUNNING job to SUCCEEDED and creates the MonsterImage record.
    Called by the Next.js pipeline after the image has been uploaded to storage.

    Body: { job_id, monster_image_id, public_image_url, image_storage_path,
            provider, provider_model }
    Returns: the updated MonsterImageGenerationJob (including the linked image).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Mark image generation job as succeeded and create MonsterImage",
        request=MarkJobSucceededSerializer,
        responses={200: MonsterImageGenerationJobSerializer, 404: None, 409: None},
    )
    def post(self, request: Request, monster_id) -> Response:
        monster = get_object_or_404(Monster, id=monster_id, owner=request.user)

        serializer = MarkJobSucceededSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        job = _get_job_for_transition(request, monster, vd["job_id"])
        if job is None:
            return Response(
                {"error": {"code": "not_found", "message": "Job not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        monster_image = MonsterImage.objects.create(
            id=vd["monster_image_id"],
            monster=monster,
            public_image_url=vd["public_image_url"],
            image_storage_path=vd["image_storage_path"],
            provider=vd["provider"],
            provider_model=vd["provider_model"],
        )

        try:
            updated_job = mark_job_succeeded(job, monster_image)
        except InvalidJobTransition as exc:
            # Roll back the image we just created since the transition failed.
            monster_image.delete()
            return Response(
                {
                    "error": {
                        "code": "invalid_transition",
                        "message": str(exc),
                    }
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(MonsterImageGenerationJobSerializer(updated_job).data)


class MonsterGenerateImageMarkFailedView(APIView):
    """
    POST /api/monsters/{monster_id}/generate-image/mark-failed/

    Transitions a QUEUED or RUNNING job to FAILED. Called by the Next.js
    pipeline on provider or storage errors.

    Body: { job_id, error_code, error_message }
    Returns: the updated MonsterImageGenerationJob.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Mark image generation job as failed",
        request=MarkJobFailedSerializer,
        responses={200: MonsterImageGenerationJobSerializer, 404: None, 409: None},
    )
    def post(self, request: Request, monster_id) -> Response:
        monster = get_object_or_404(Monster, id=monster_id, owner=request.user)

        serializer = MarkJobFailedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        job = _get_job_for_transition(request, monster, vd["job_id"])
        if job is None:
            return Response(
                {"error": {"code": "not_found", "message": "Job not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            updated_job = mark_job_failed(
                job,
                error_code=vd["error_code"],
                safe_error_message=vd["error_message"],
            )
        except InvalidJobTransition as exc:
            return Response(
                {
                    "error": {
                        "code": "invalid_transition",
                        "message": str(exc),
                    }
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(MonsterImageGenerationJobSerializer(updated_job).data)


class MonsterGenerateImageMarkBlockedView(APIView):
    """
    POST /api/monsters/{monster_id}/generate-image/mark-blocked/

    Transitions a QUEUED or RUNNING job to BLOCKED. Called by the Next.js
    pipeline when the banned-terms guard or moderation provider rejects the prompt.

    Body: { job_id, error_code, error_message }
    Returns: the updated MonsterImageGenerationJob.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Mark image generation job as blocked (content policy)",
        request=MarkJobBlockedSerializer,
        responses={200: MonsterImageGenerationJobSerializer, 404: None, 409: None},
    )
    def post(self, request: Request, monster_id) -> Response:
        monster = get_object_or_404(Monster, id=monster_id, owner=request.user)

        serializer = MarkJobBlockedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        job = _get_job_for_transition(request, monster, vd["job_id"])
        if job is None:
            return Response(
                {"error": {"code": "not_found", "message": "Job not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            updated_job = mark_job_blocked(
                job,
                error_code=vd["error_code"],
                safe_error_message=vd["error_message"],
            )
        except InvalidJobTransition as exc:
            return Response(
                {
                    "error": {
                        "code": "invalid_transition",
                        "message": str(exc),
                    }
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(MonsterImageGenerationJobSerializer(updated_job).data)
