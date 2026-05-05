"""
Accounts app views.
"""

from drf_spectacular.utils import extend_schema
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .serializers import UserProfileSerializer


class MeView(GenericAPIView):
    """
    Get the current user's profile.
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
    Idempotent endpoint to create/fetch the current user's profile.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    @extend_schema(
        summary="Create or fetch UserProfile for the current Supabase user",
        description=(
            "Idempotent. The authentication class already creates the profile on first "
            "verified request, but this endpoint gives the frontend a clean 'finish login' "
            "hook to call explicitly after auth confirm."
        ),
        request=None,
        responses={200: UserProfileSerializer},
    )
    def post(self, request: Request) -> Response:
        # The auth class already called get_or_create; request.user is the profile.
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
