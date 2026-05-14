"""
Accounts app views.
"""

from django.db.models import Prefetch
from drf_spectacular.utils import extend_schema
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.monsters.models import Monster, MonsterImage

from .models import UserProfile
from .serializers import UserProfileSerializer, UserProfileWithMonstersSerializer


class MeView(GenericAPIView):
    """
    GET /api/me/ — return the authenticated user's profile (no monsters).

    Lightweight profile-only endpoint. Use POST /api/me/bootstrap/ when the
    full profile + monsters payload is needed (e.g. on initial page load).
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    @extend_schema(
        summary="Get current user profile",
        responses={200: UserProfileSerializer},
    )
    def get(self, request: Request) -> Response:
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class BootstrapMeView(GenericAPIView):
    """
    POST /api/me/bootstrap/ — create or fetch the current user's profile with monsters.

    Idempotent. The authentication class already calls get_or_create on first
    verified request; this endpoint gives the frontend a clean "finish login"
    hook to call explicitly after Supabase auth confirms.

    Returns the full UserProfileWithMonsters payload — profile fields plus the
    user's saved monsters (each with its most recent image or null) — so the
    frontend can hydrate global auth + monster state in a single round-trip.

    Monsters are prefetched with their images to avoid N+1 queries.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileWithMonstersSerializer

    @extend_schema(
        summary="Create or fetch UserProfile (with monsters) for the current Supabase user",
        description=(
            "Idempotent. Returns profile fields plus the user's saved monsters, "
            "each with their most recent MonsterImage (or null). "
            "The authentication class already creates the profile on first verified "
            "request, but this endpoint gives the frontend a clean 'finish login' "
            "hook to call explicitly after auth confirm."
        ),
        request=None,
        responses={200: UserProfileWithMonstersSerializer},
    )
    def post(self, request: Request) -> Response:
        # Re-fetch with prefetch_related to avoid N+1 on monsters → images.
        # request.user is already the verified UserProfile; we re-fetch by pk
        # so we can attach the prefetch cache before serialisation.
        user = UserProfile.objects.prefetch_related(
            Prefetch(
                "monsters",
                queryset=Monster.objects.prefetch_related(
                    Prefetch(
                        "images",
                        queryset=MonsterImage.objects.order_by("-created_at"),
                    )
                ),
            )
        ).get(pk=request.user.pk)

        serializer = self.get_serializer(user)
        return Response(serializer.data)
