from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.monsters.serializers import MonsterSerializer

from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "supabase_user_id",
            "email",
            "display_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = (
            "id",
            "supabase_user_id",
            "email",
            "display_name",
            "created_at",
            "updated_at",
        )


class UserProfileWithMonstersSerializer(UserProfileSerializer):
    """
    Extended UserProfile serializer that nests the user's saved monsters (with images).

    Used by POST /api/me/bootstrap/ so the frontend can hydrate the full initial
    auth state — profile + monsters — in a single request.

    The monsters list is ordered by creation date (newest first), matching the
    Monster model's default ordering.  Each monster's ``image`` field is the
    most recently created MonsterImage, or null if none exists yet.

    This serializer is intentionally read-only; monster mutations go through the
    dedicated /api/monsters/* endpoints.
    """

    monsters = serializers.SerializerMethodField()

    @extend_schema_field(MonsterSerializer(many=True))
    def get_monsters(self, obj: UserProfile):
        """Return all monsters for this user, serialised with images."""
        return MonsterSerializer(obj.monsters.all(), many=True).data

    class Meta(UserProfileSerializer.Meta):
        fields = UserProfileSerializer.Meta.fields + ["monsters"]
