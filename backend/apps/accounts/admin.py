from django.conf import settings
from django.contrib import admin
from django.contrib import messages
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
    readonly_fields = [
        "id",
        "display_name",
        "element",
        "created_at",
        "latest_image_preview",
    ]

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
    actions = ["seed_fake_monsters_action"]

    @admin.action(description="Seed 3 fake monsters for selected users")
    def seed_fake_monsters_action(self, request, queryset):
        if not settings.ENABLE_DEV_ADMIN_ACTIONS:
            self.message_user(
                request,
                "seed_fake_monsters is disabled. Set ENABLE_DEV_ADMIN_ACTIONS=True to enable it.",
                level=messages.ERROR,
            )
            return

        from apps.monsters.management.commands.seed_fake_monsters import (
            FAKE_IMAGE_FIXTURE_URL,
            FAKE_PROVIDER,
            FAKE_PROVIDER_MODEL,
            _FAKE_ELEMENTS,
            _FAKE_HABITATS,
            _FAKE_PALETTES,
            _FAKE_PERSONALITIES,
        )
        from apps.monsters.models import (
            Monster,
            MonsterImage,
            MonsterImageGenerationMode,
        )
        from apps.monsters.services.generation_jobs import (
            create_generation_job,
            mark_job_running,
            mark_job_succeeded,
        )

        NUM_MONSTERS = 3
        total_created = 0

        for user_profile in queryset:
            for i in range(NUM_MONSTERS):
                idx = i % len(_FAKE_ELEMENTS)
                monster = Monster.objects.create(
                    owner=user_profile,
                    display_name=f"Fake Monster {i + 1}",
                    element=_FAKE_ELEMENTS[idx],
                    habitat=_FAKE_HABITATS[idx],
                    personality=_FAKE_PERSONALITIES[idx],
                    color_palette=_FAKE_PALETTES[idx],
                    flavor_text="A fake monster created via admin action.",
                )
                monster_image = MonsterImage.objects.create(
                    monster=monster,
                    public_image_url=FAKE_IMAGE_FIXTURE_URL,
                    image_storage_path="",
                    provider=FAKE_PROVIDER,
                    provider_model=FAKE_PROVIDER_MODEL,
                )
                job = create_generation_job(
                    owner=user_profile,
                    generation_mode=MonsterImageGenerationMode.FAKE,
                    provider=FAKE_PROVIDER,
                    provider_model=FAKE_PROVIDER_MODEL,
                    sanitized_prompt="fake monster prompt",
                    prompt_version="fake-v1",
                )
                job.monster = monster
                job.save()
                mark_job_running(job)
                mark_job_succeeded(job, monster_image)
                total_created += 1

        self.message_user(
            request,
            f"Created {total_created} fake monster(s) across {queryset.count()} user(s).",
            level=messages.SUCCESS,
        )
