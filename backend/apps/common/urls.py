"""
URL patterns for the common app.

This file is the root of the /api/ namespace. Future app-specific
URLs (accounts, monsters, etc.) will be included here above the catch-all.

The re_path catch-all at the bottom ensures unknown /api/* paths return a
consistent JSON 404 rather than Django's HTML debug page.
"""

from django.urls import path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.common.views import api_not_found

urlpatterns = [
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # Future app routes go here above the catch-all.
    re_path(r"^.*$", api_not_found),  # Any routes that are not found get handled here
]
