"""
URL patterns for the monsters app.

All routes are mounted under /api/ via apps.common.urls.
"""

from django.urls import path

from .views import (
    ImageGenerationJobCreateView,
    ImageGenerationJobDetailView,
    ImageGenerationJobMarkBlockedView,
    ImageGenerationJobMarkFailedView,
    ImageGenerationJobMarkRunningView,
    ImageGenerationJobMarkSucceededView,
    ImageGenerationJobNotificationView,
    MonsterDetailView,
    MonsterListCreateView,
)

urlpatterns = [
    # Monster endpoints
    path("monsters/", MonsterListCreateView.as_view(), name="monster-list-create"),
    path(
        "monsters/<uuid:monster_id>/",
        MonsterDetailView.as_view(),
        name="monster-detail",
    ),
    # Image generation job endpoints
    path(
        "image-generation-jobs/",
        ImageGenerationJobCreateView.as_view(),
        name="job-list-create",
    ),
    path(
        "image-generation-jobs/<uuid:job_id>/",
        ImageGenerationJobDetailView.as_view(),
        name="job-detail",
    ),
    path(
        "image-generation-jobs/<uuid:job_id>/notification/",
        ImageGenerationJobNotificationView.as_view(),
        name="job-notification",
    ),
    # Trusted-server transition stubs (return 501 until Step B6)
    path(
        "image-generation-jobs/<uuid:job_id>/mark-running/",
        ImageGenerationJobMarkRunningView.as_view(),
        name="job-mark-running",
    ),
    path(
        "image-generation-jobs/<uuid:job_id>/mark-succeeded/",
        ImageGenerationJobMarkSucceededView.as_view(),
        name="job-mark-succeeded",
    ),
    path(
        "image-generation-jobs/<uuid:job_id>/mark-failed/",
        ImageGenerationJobMarkFailedView.as_view(),
        name="job-mark-failed",
    ),
    path(
        "image-generation-jobs/<uuid:job_id>/mark-blocked/",
        ImageGenerationJobMarkBlockedView.as_view(),
        name="job-mark-blocked",
    ),
]
