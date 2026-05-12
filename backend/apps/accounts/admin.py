from django.contrib import admin
from django.utils.html import format_html

from .models import UserProfile


class MonsterInline(admin.TabularInline):
    # Imported inline to avoid circular import; monsters app imports accounts
    from apps.monsters.models import Monster as _Monster
    model = _Monster
    extra = 0
    can_delete = False
    show_change_link = True
    fields = ["id", "display_name", "element", "created_at", "latest_image_preview"]
    readonly_fields = ["id", "display_name", "element", "created_at", "latest_image_preview"]

    @admin.display(description="Latest image")
    def latest_image_preview(self, obj):
        image = obj.images.order_by("-created_at").first()
        if image and image.public_image_url:
            return format_html(
                '<img src="{}" style="max-width:60px; max-height:60px;" />',
                image.public_image_url,
            )
        return "(none)"


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ["email", "display_name", "supabase_user_id", "created_at"]
    search_fields = ["email", "display_name", "supabase_user_id"]
    readonly_fields = ["id", "supabase_user_id", "created_at", "updated_at"]
    inlines = [MonsterInline]
