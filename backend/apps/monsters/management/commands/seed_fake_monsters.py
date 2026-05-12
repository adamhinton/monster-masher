"""
Management command: seed_fake_monsters

Creates fake Monster, MonsterImage, and MonsterImageGenerationJob rows for a
given user, purely for development and smoke-testing purposes.

No real AI provider is called. All generated images use a known fixture URL.

Usage:
    python manage.py seed_fake_monsters --email user@example.com --num-monsters 3

Guards:
    The command is disabled unless ENABLE_DEV_ADMIN_ACTIONS=True is set in the
    environment. It will raise CommandError immediately if that setting is False.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import UserProfile
from apps.monsters.models import Monster, MonsterImage
from apps.monsters.services.generation_jobs import (
    create_generation_job,
    mark_job_running,
    mark_job_succeeded,
)
from apps.monsters.models import MonsterImageGenerationMode

# A deterministic, publicly accessible placeholder image used as the fixture URL
# so that fake monsters display something visible in the admin without calling
# any real provider.
FAKE_IMAGE_FIXTURE_URL = (
    "https://placehold.co/512x512/2d2d2d/ffffff/png?text=Fake+Monster"
)
FAKE_PROVIDER = "fake"
FAKE_PROVIDER_MODEL = "fake-fixture-v1"

_FAKE_ELEMENTS = ["fire", "water", "earth", "air", "shadow", "lightning"]
_FAKE_HABITATS = [
    "volcanic cave",
    "deep ocean",
    "ancient forest",
    "storm peak",
    "shadow realm",
    "thunderplain",
]
_FAKE_PERSONALITIES = ["fierce", "playful", "cunning", "stoic", "mischievous", "noble"]
_FAKE_PALETTES = [
    "crimson and black",
    "ocean blue and silver",
    "forest green and brown",
    "gold and white",
    "purple and midnight",
    "yellow and grey",
]


class Command(BaseCommand):
    help = "Seed fake monsters for a given user (dev/smoke-testing only)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            required=True,
            type=str,
            help="Email address of the UserProfile to seed monsters for.",
        )
        parser.add_argument(
            "--num-monsters",
            required=True,
            type=int,
            help="Number of fake monsters to create.",
        )

    def handle(self, *args, **options):
        if not settings.ENABLE_DEV_ADMIN_ACTIONS:
            raise CommandError(
                "seed_fake_monsters is disabled. "
                "Set ENABLE_DEV_ADMIN_ACTIONS=True in your environment to enable it."
            )

        email = options["email"]
        num_monsters = options["num_monsters"]

        if num_monsters < 1:
            raise CommandError("--num-monsters must be at least 1.")

        try:
            user_profile = UserProfile.objects.get(email=email)
        except UserProfile.DoesNotExist:
            raise CommandError(
                f"No UserProfile found with email '{email}'. "
                "The user must have logged in at least once so their profile exists."
            )

        created_ids = []

        for i in range(num_monsters):
            idx = i % len(_FAKE_ELEMENTS)

            monster = Monster.objects.create(
                owner=user_profile,
                display_name=f"Fake Monster {i + 1}",
                element=_FAKE_ELEMENTS[idx],
                habitat=_FAKE_HABITATS[idx],
                personality=_FAKE_PERSONALITIES[idx],
                color_palette=_FAKE_PALETTES[idx],
                flavor_text="A fake monster created for development and smoke-testing.",
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
            # Link monster to the job now that we have the monster id.
            job.monster = monster
            job.save()

            mark_job_running(job)
            mark_job_succeeded(job, monster_image)

            created_ids.append(str(monster.id))

        # self.stdout.write(
        #     self.style.SUCCESS(
        #         f"Created {num_monsters} fake monster(s) for {email}:\n"
        #         + "\n".join(f"  monster_id={mid}" for mid in created_ids)
        #     )
        # )
