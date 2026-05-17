"""
URL patterns for the monsters app.

All routes are mounted under /api/ via apps.common.urls.

All image-generation-job endpoints live under
  /monsters/{monster_id}/generate-image/
so that the monster context is always explicit in the URL.
"""

from django.urls import path

from .views import (
    ImageGenerationJobCreateView,
    ImageGenerationJobDetailView,
    ImageGenerationJobNotificationView,
    MonsterDetailView,
    MonsterGenerateImageMarkBlockedView,
    MonsterGenerateImageMarkFailedView,
    MonsterGenerateImageMarkRunningView,
    MonsterGenerateImageMarkSucceededView,
    MonsterListCreateView,
)

urlpatterns = [
    # Monster CRUD
    path("monsters/", MonsterListCreateView.as_view(), name="monster-list-create"),
    path(
        "monsters/<uuid:monster_id>/",
        MonsterDetailView.as_view(),
        name="monster-detail",
    ),
    # Image generation job lifecycle — all nested under monsters/{monster_id}/generate-image/
    path(
        "monsters/<uuid:monster_id>/generate-image/jobs/",
        ImageGenerationJobCreateView.as_view(),
        name="monster-generate-image-jobs",
    ),
    path(
        "monsters/<uuid:monster_id>/generate-image/jobs/<uuid:job_id>/",
        ImageGenerationJobDetailView.as_view(),
        name="monster-generate-image-job-detail",
    ),
    path(
        "monsters/<uuid:monster_id>/generate-image/jobs/<uuid:job_id>/notification/",
        ImageGenerationJobNotificationView.as_view(),
        name="monster-generate-image-job-notification",
    ),
    # Trusted-server transition endpoints
    path(
        "monsters/<uuid:monster_id>/generate-image/mark-running/",
        MonsterGenerateImageMarkRunningView.as_view(),
        name="monster-generate-image-mark-running",
    ),
    path(
        "monsters/<uuid:monster_id>/generate-image/mark-succeeded/",
        MonsterGenerateImageMarkSucceededView.as_view(),
        name="monster-generate-image-mark-succeeded",
    ),
    path(
        "monsters/<uuid:monster_id>/generate-image/mark-failed/",
        MonsterGenerateImageMarkFailedView.as_view(),
        name="monster-generate-image-mark-failed",
    ),
    path(
        "monsters/<uuid:monster_id>/generate-image/mark-blocked/",
        MonsterGenerateImageMarkBlockedView.as_view(),
        name="monster-generate-image-mark-blocked",
    ),
]
