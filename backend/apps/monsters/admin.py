from django.contrib import admin
from django.utils.html import format_html

from .models import Monster, MonsterImage, MonsterImageGenerationJob


@admin.register(Monster)
class MonsterAdmin(admin.ModelAdmin):
    list_display = ["id", "owner", "display_name", "created_at", "updated_at"]
    list_filter = ["created_at"]
    search_fields = ["display_name", "owner__email"]
    readonly_fields = ["id", "created_at", "updated_at", "owner"]


@admin.register(MonsterImage)
class MonsterImageAdmin(admin.ModelAdmin):
    list_display = ["id", "monster", "provider", "created_at", "image_preview"]
    readonly_fields = ["id", "created_at", "image_storage_path", "image_preview"]

    @admin.display(description="Preview")
    def image_preview(self, obj):
        if obj.public_image_url:
            return format_html(
                '<img src="{}" style="max-width:80px; max-height:80px;" />',
                obj.public_image_url,
            )
        return "(none)"


@admin.register(MonsterImageGenerationJob)
class MonsterImageGenerationJobAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "status",
        "owner",
        "generation_mode",
        "should_email_when_done",
        "created_at",
        "duration",
        "sanitized_prompt_preview",
    ]
    list_filter = ["status", "generation_mode"]
    search_fields = ["owner__email"]
    readonly_fields = [
        "id",
        "owner",
        "monster",
        "provider",
        "provider_model",
        "generation_mode",
        "created_at",
        "started_at",
        "finished_at",
        "duration",
        "error_code",
        "safe_error_message",
    ]

    @admin.display(description="Duration")
    def duration(self, obj):
        if obj.started_at and obj.finished_at:
            delta = obj.finished_at - obj.started_at
            total_seconds = int(delta.total_seconds())
            minutes, seconds = divmod(total_seconds, 60)
            if minutes:
                return f"{minutes}m {seconds}s"
            return f"{seconds}s"
        return "(pending)"

    @admin.display(description="Prompt preview")
    def sanitized_prompt_preview(self, obj):
        if obj.sanitized_prompt:
            return obj.sanitized_prompt[:100]
        return ""
