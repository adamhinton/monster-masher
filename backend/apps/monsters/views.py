"""
Monster and image generation job views.

Ownership is enforced by filtering all querysets and get_object_or_404 calls
on owner=request.user, which causes non-owner access to return 404, not 403
(per Step 5c requirement).  No endpoint accepts owner_id as input from the
client; ownership always comes from the verified request.user.
"""

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.monsters.models import (
    Monster,
    MonsterImageGenerationJob,
    MonsterImageGenerationMode,
    MonsterImageGenerationStatus,
)
from apps.monsters.serializers import (
    MonsterCreateSerializer,
    MonsterImageGenerationJobCreateSerializer,
    MonsterImageGenerationJobNotificationUpdateSerializer,
    MonsterImageGenerationJobSerializer,
    MonsterSerializer,
    MonsterUpdateSerializer,
)
from apps.monsters.services.generation_jobs import create_generation_job

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


# ---------------------------------------------------------------------------
# Image generation job views
# ---------------------------------------------------------------------------


class ImageGenerationJobCreateView(GenericAPIView):
    """
    POST /api/image-generation-jobs/ — create a generation job.

    Uses create_generation_job() service.  Defaults to fake mode for the
    contract phase; real provider wiring happens in a later step.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MonsterImageGenerationJobCreateSerializer

    @extend_schema(
        summary="Create an image generation job",
        request=MonsterImageGenerationJobCreateSerializer,
        responses={201: MonsterImageGenerationJobSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = MonsterImageGenerationJobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        monster_id = vd.get("monster_id")
        monster = None
        if monster_id:
            monster = get_object_or_404(Monster, id=monster_id, owner=request.user)

        job = create_generation_job(
            owner=request.user,
            generation_mode=MonsterImageGenerationMode.FAKE,
            provider="fake",
            provider_model="fake-fixture-v1",
            should_email_when_done=vd["should_email_when_done"],
        )

        if monster is not None:
            job.monster = monster
            job.save()

        return Response(
            MonsterImageGenerationJobSerializer(job).data,
            status=status.HTTP_201_CREATED,
        )


class ImageGenerationJobDetailView(GenericAPIView):
    """
    GET /api/image-generation-jobs/{job_id}/ — retrieve a generation job.

    Returns 404 (not 403) when the job does not exist or belongs to another
    user.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MonsterImageGenerationJobSerializer

    @extend_schema(
        summary="Get an image generation job",
        responses={200: MonsterImageGenerationJobSerializer},
    )
    def get(self, request: Request, job_id) -> Response:
        job = get_object_or_404(
            MonsterImageGenerationJob, id=job_id, owner=request.user
        )
        return Response(MonsterImageGenerationJobSerializer(job).data)


class ImageGenerationJobNotificationView(GenericAPIView):
    """
    PATCH /api/image-generation-jobs/{job_id}/notification/ — toggle email
    notification preference.

    Returns 400 if the job is already in a terminal state (succeeded, failed,
    or blocked) because the notification window has closed.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MonsterImageGenerationJobNotificationUpdateSerializer

    @extend_schema(
        summary="Toggle email notification preference for a job",
        request=MonsterImageGenerationJobNotificationUpdateSerializer,
        responses={200: MonsterImageGenerationJobSerializer, 400: None},
    )
    def patch(self, request: Request, job_id) -> Response:
        job = get_object_or_404(
            MonsterImageGenerationJob, id=job_id, owner=request.user
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
# Trusted-server transition stubs (Step 5g)
# These return 501 until the trust boundary is designed in Step B6.
# Registering them now ensures OpenAPI includes them in the schema.
# ---------------------------------------------------------------------------

_STUB_501 = Response(
    {"detail": "Not implemented. Reserved for trusted server use."},
    status=status.HTTP_501_NOT_IMPLEMENTED,
)


class _TransitionStubView(APIView):
    """
    Base class for trusted-server transition stubs.

    All stubs return 501 until Step B6 implements real trust-boundary logic.
    Do not add user-accessible logic here — these must remain server-only.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, job_id) -> Response:
        return Response(
            {"detail": "Not implemented. Reserved for trusted server use."},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )


class ImageGenerationJobMarkRunningView(_TransitionStubView):
    @extend_schema(
        summary="[Stub] Mark job as running",
        description="Not yet implemented. Reserved for trusted-server use only.",
        request=None,
        responses={501: None},
    )
    def post(self, request: Request, job_id) -> Response:
        return super().post(request, job_id)


class ImageGenerationJobMarkSucceededView(_TransitionStubView):
    @extend_schema(
        summary="[Stub] Mark job as succeeded",
        description="Not yet implemented. Reserved for trusted-server use only.",
        request=None,
        responses={501: None},
    )
    def post(self, request: Request, job_id) -> Response:
        return super().post(request, job_id)


class ImageGenerationJobMarkFailedView(_TransitionStubView):
    @extend_schema(
        summary="[Stub] Mark job as failed",
        description="Not yet implemented. Reserved for trusted-server use only.",
        request=None,
        responses={501: None},
    )
    def post(self, request: Request, job_id) -> Response:
        return super().post(request, job_id)


class ImageGenerationJobMarkBlockedView(_TransitionStubView):
    @extend_schema(
        summary="[Stub] Mark job as blocked",
        description="Not yet implemented. Reserved for trusted-server use only.",
        request=None,
        responses={501: None},
    )
    def post(self, request: Request, job_id) -> Response:
        return super().post(request, job_id)
