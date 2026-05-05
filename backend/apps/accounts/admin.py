from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ["email", "display_name", "supabase_user_id", "created_at"]
    search_fields = ["email", "display_name", "supabase_user_id"]
    readonly_fields = ["id", "supabase_user_id", "created_at", "updated_at"]
