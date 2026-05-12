from rest_framework import serializers

from .models import Monster, MonsterImage


class MonsterTraitsSerializer(serializers.Serializer):
    """
    Nested traits sub-object. Maps to flat columns on Monster.

    CharField defaults (trim_whitespace=True, allow_blank=False) enforce
    trimmed, non-blank values on all four fields.
    """

    element = serializers.CharField(max_length=20)
    habitat = serializers.CharField(max_length=60)
    personality = serializers.CharField(max_length=60)
    color_palette = serializers.CharField(max_length=80)


class MonsterSerializer(serializers.ModelSerializer):
    """
    Read/response serializer for Monster.

    Exposes traits as a nested object even though they are stored as flat
    columns on the model. source="*" passes the whole instance to the nested
    serializer so each trait field reads from the instance attribute directly.
    """

    traits = MonsterTraitsSerializer(source="*", read_only=True)

    class Meta:
        model = Monster
        fields = [
            "id",
            "display_name",
            "traits",
            "flavor_text",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MonsterCreateSerializer(serializers.Serializer):
    """
    POST request serializer for Monster.

    Owner is always set from request context. Never accepted from client input.
    """

    display_name = serializers.CharField(max_length=80)
    traits = MonsterTraitsSerializer()
    flavor_text = serializers.CharField(
        max_length=500, required=False, allow_blank=True, default=""
    )

    def create(self, validated_data: dict) -> Monster:
        traits_data = validated_data.pop("traits")
        owner = self.context["request"].user
        return Monster.objects.create(owner=owner, **traits_data, **validated_data)


class MonsterUpdateSerializer(serializers.Serializer):
    """
    PATCH request serializer for Monster.

    All fields are optional so any subset can be updated.
    If traits is provided, all four trait fields within it are required.
    Owner cannot be changed.
    """

    display_name = serializers.CharField(max_length=80, required=False)
    traits = MonsterTraitsSerializer(required=False)
    flavor_text = serializers.CharField(
        max_length=500, required=False, allow_blank=True
    )

    def update(self, instance: Monster, validated_data: dict) -> Monster:
        traits_data = validated_data.pop("traits", None)
        if traits_data is not None:
            for field, value in traits_data.items():
                setattr(instance, field, value)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class MonsterImageSerializer(serializers.ModelSerializer):
    """
    Read/response serializer for MonsterImage.

    Exposes safe image display metadata. image_storage_path is intentionally
    included per explicit decision (see Step 2e).
    No image bytes, no base64, no raw provider response.
    """

    class Meta:
        model = MonsterImage
        fields = [
            "id",
            "public_image_url",
            "image_storage_path",
            "provider",
            "provider_model",
            "created_at",
        ]
        read_only_fields = fields
