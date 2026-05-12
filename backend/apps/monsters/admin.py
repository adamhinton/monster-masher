from django.contrib import admin
from django.utils.html import format_html

from .models import Monster, MonsterImage, MonsterImageGenerationJob


# ── Inlines ──────────────────────────────────────────────────────────────────


class MonsterImageInline(admin.TabularInline):
    model = MonsterImage
    extra = 0
    can_delete = False
    show_change_link = True
    fields = ["id", "provider", "provider_model", "created_at", "image_preview"]
    readonly_fields = ["id", "provider", "provider_model", "created_at", "image_preview", "image_storage_path"]

    @admin.display(description="Preview")
    def image_preview(self, obj):
        if obj.public_image_url:
            return format_html(
                '<img src="{}" style="max-width:80px; max-height:80px;" />',
                obj.public_image_url,
            )
        return "(none)"


class MonsterImageGenerationJobInline(admin.TabularInline):
    model = MonsterImageGenerationJob
    extra = 0
    can_delete = False
    show_change_link = True
    fields = ["id", "status", "generation_mode", "created_at", "duration"]
    readonly_fields = ["id", "status", "generation_mode", "created_at", "duration"]

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


# ── ModelAdmins ───────────────────────────────────────────────────────────────


@admin.register(Monster)
class MonsterAdmin(admin.ModelAdmin):
    list_display = ["id", "owner", "display_name", "element", "created_at", "updated_at"]
    list_filter = ["created_at", "element"]
    search_fields = ["display_name", "owner__email"]
    list_select_related = ["owner"]
    inlines = [MonsterImageInline, MonsterImageGenerationJobInline]
    fieldsets = [
        (None, {"fields": ["id", "owner", "display_name"]}),
        ("Traits", {"fields": ["element", "habitat", "personality", "color_palette", "flavor_text"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at"], "classes": ["collapse"]}),
    ]

    def get_readonly_fields(self, request, obj=None):
        # owner is editable on creation but locked after that
        if obj is not None:
            return ["id", "created_at", "updated_at", "owner"]
        return ["id", "created_at", "updated_at"]


@admin.register(MonsterImage)
class MonsterImageAdmin(admin.ModelAdmin):
    list_display = ["id", "monster", "provider", "provider_model", "created_at", "image_preview"]
    list_filter = ["provider", "provider_model"]
    search_fields = ["monster__display_name", "monster__owner__email"]
    list_select_related = ["monster", "monster__owner"]
    readonly_fields = ["id", "created_at", "image_storage_path", "image_preview"]
    fieldsets = [
        (None, {"fields": ["id", "monster", "public_image_url", "image_preview"]}),
        ("Provider", {"fields": ["provider", "provider_model", "image_storage_path"]}),
        ("Timestamps", {"fields": ["created_at"], "classes": ["collapse"]}),
    ]

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
        "monster",
        "generation_mode",
        "should_email_when_done",
        "created_at",
        "duration",
        "sanitized_prompt_preview",
    ]
    list_filter = ["status", "generation_mode"]
    search_fields = ["owner__email", "monster__display_name"]
    list_select_related = ["owner", "monster"]
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
        "sanitized_prompt",
        "notification_error_code",
        "notification_error_message",
    ]
    fieldsets = [
        (None, {"fields": ["id", "owner", "monster", "status", "generation_mode"]}),
        ("Provider", {"fields": ["provider", "provider_model", "provider_request_id"]}),
        ("Prompt", {"fields": ["sanitized_prompt", "prompt_version", "prompt_hash"], "classes": ["collapse"]}),
        ("Notification", {"fields": ["should_email_when_done", "notified_at", "notification_error_code", "notification_error_message"]}),
        ("Error", {"fields": ["error_code", "safe_error_message"]}),
        ("Timestamps", {"fields": ["created_at", "started_at", "finished_at", "duration"], "classes": ["collapse"]}),
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
