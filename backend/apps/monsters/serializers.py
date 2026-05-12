from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Monster, MonsterImage, MonsterImageGenerationJob


class MonsterTraitsSerializer(serializers.Serializer):
    """
    Nested traits sub-object. Maps to flat columns on Monster.

    CharField defaults (trim_whitespace=True, allow_blank=False) enforce
    trimmed, non-blank values on all four fields.
    """

    element = serializers.CharField(
        max_length=20,
        help_text="Free-text element descriptor. Not an enum — frontend may suggest values but any text is accepted.",
    )
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
        extra_kwargs = {
            "image_storage_path": {
                "help_text": "Object storage path used for cleanup. Intentionally exposed per Step 2e decision.",
            },
        }


# ---------------------------------------------------------------------------
# MonsterImageGenerationJob serializers
# ---------------------------------------------------------------------------


class JobProviderInfoSerializer(serializers.Serializer):
    """
    Nested provider_info sub-object on MonsterImageGenerationJob.
    Maps to provider, provider_model, provider_request_id on the model.
    """

    provider = serializers.CharField(read_only=True)
    provider_model = serializers.CharField(read_only=True)
    provider_request_id = serializers.CharField(read_only=True)


class JobGenerationMetadataSerializer(serializers.Serializer):
    """
    Nested generation_metadata sub-object on MonsterImageGenerationJob.

    sanitized_prompt is intentionally excluded from the frontend-facing
    response (Step 2f decision). prompt_version and prompt_hash are safe
    identifiers useful for debugging/drift detection.
    """

    prompt_version = serializers.CharField(read_only=True)
    prompt_hash = serializers.CharField(read_only=True)


class JobNotifyWhenDoneSerializer(serializers.Serializer):
    """
    Nested notify_when_done sub-object on MonsterImageGenerationJob.

    notification_error is null when no notification error has occurred.
    When present, it carries only safe code/message — no internal details.
    """

    should_email_when_done = serializers.BooleanField(read_only=True)
    notified_at = serializers.DateTimeField(read_only=True, allow_null=True)
    notification_error = serializers.SerializerMethodField(
        help_text="Null when no notification error has occurred. Present only when email delivery failed.",
    )

    @extend_schema_field(
        {
            "type": "object",
            "nullable": True,
            "properties": {
                "code": {"type": "string"},
                "message": {"type": "string"},
            },
            "required": ["code", "message"],
        }
    )
    def get_notification_error(self, obj):
        if obj.notification_error_code or obj.notification_error_message:
            return {
                "code": obj.notification_error_code,
                "message": obj.notification_error_message,
            }
        return None


class JobErrorInfoSerializer(serializers.Serializer):
    """
    Nested error_info sub-object on MonsterImageGenerationJob.
    Only safe, user-facing error fields. No internal details.
    """

    code = serializers.CharField(source="error_code", read_only=True)
    message = serializers.CharField(source="safe_error_message", read_only=True)


class JobTimestampsSerializer(serializers.Serializer):
    """
    Nested timestamps sub-object on MonsterImageGenerationJob.
    Groups all lifecycle timestamps together.
    """

    started_at = serializers.DateTimeField(read_only=True, allow_null=True)
    finished_at = serializers.DateTimeField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class MonsterImageGenerationJobSerializer(serializers.ModelSerializer):
    """
    Read/response serializer for MonsterImageGenerationJob.

    Flat model columns are exposed as nested sub-objects to match
    the groupings annotated in models.py:

        provider_info     — provider, provider_model, provider_request_id
        generation_metadata — prompt_version, prompt_hash
                              (sanitized_prompt excluded per Step 2f)
        notify_when_done  — should_email_when_done, notified_at, notification_error
        error_info        — null unless job failed/blocked
        timestamps        — started_at, finished_at, created_at, updated_at
        image             — nested MonsterImage when succeeded, else null
    """

    provider_info = JobProviderInfoSerializer(source="*", read_only=True)
    generation_metadata = JobGenerationMetadataSerializer(source="*", read_only=True)
    notify_when_done = JobNotifyWhenDoneSerializer(source="*", read_only=True)
    error_info = serializers.SerializerMethodField(
        help_text="Null for queued/running/succeeded jobs. Present with code and message when status is failed or blocked.",
    )
    timestamps = JobTimestampsSerializer(source="*", read_only=True)
<<<<<<< HEAD
    image = MonsterImageSerializer(read_only=True)
=======
    image = MonsterImageSerializer(read_only=True, allow_null=True)
>>>>>>> image-gen-contract-foundation

    class Meta:
        model = MonsterImageGenerationJob
        fields = [
            "id",
            "monster",
            "status",
            "generation_mode",
            "provider_info",
            "generation_metadata",
            "notify_when_done",
            "error_info",
            "image",
            "timestamps",
        ]
        read_only_fields = [
            "id",
            "monster",
            "status",
            "generation_mode",
        ]
        extra_kwargs = {
            "monster": {
                "help_text": "UUID of the associated Monster, or null if the job failed before a Monster was created.",
            },
            "status": {
                "help_text": "Lifecycle state: queued → running → succeeded | failed | blocked.",
            },
            "generation_mode": {
                "help_text": "fake uses fixture images (no provider cost). real calls the configured image provider.",
            },
        }

    @extend_schema_field(
        {
            "type": "object",
            "nullable": True,
            "properties": {
                "code": {"type": "string"},
                "message": {"type": "string"},
            },
            "required": ["code", "message"],
        }
    )
    def get_error_info(self, obj):
        if obj.error_code or obj.safe_error_message:
            return {
                "code": obj.error_code,
                "message": obj.safe_error_message,
            }
        return None


class MonsterImageGenerationJobCreateSerializer(serializers.Serializer):
    """
    POST request serializer for MonsterImageGenerationJob.

    Owner is always set from request context. Status, provider, prompt,
    and all other internal fields are never accepted from client input.
    """

    should_email_when_done = serializers.BooleanField(required=False, default=False)
    monster_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        default=None,
        help_text="Optional: attach this job to an existing monster owned by the requesting user.",
    )


class MonsterImageGenerationJobNotificationUpdateSerializer(serializers.Serializer):
    """
    PATCH request serializer for the notification toggle endpoint.

    Only allows setting should_email_when_done. Owner, status, and all
    other job fields are structurally impossible to change via this serializer.
    """

    should_email_when_done = serializers.BooleanField()
