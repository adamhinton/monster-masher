"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path, re_path
from django.conf import settings

from core.views import health


def trigger_error(request):
    """Purposefully triggers a ZeroDivisionError to verify Sentry error capture is working."""
    division_by_zero = 1 / 0


urlpatterns = [
    path("admin/", admin.site.urls),
    # Matches both /health and /health/ — single pattern avoids drf-spectacular operationId collision
    re_path(r"^health/?$", health, name="health"),
    # All API routes are namespaced under /api/ — add new endpoints in apps/common/urls.py
    path("api/", include("apps.common.urls")),
]

# Sentry has a /sentry-debug endpoint that intentionally throws an error to show that its logging works
# This disables that endpoint in production so users can't maliciously mess with our server by hitting the endpoint
if settings.DEBUG:  # if environment is dev
    urlpatterns += [path("sentry-debug/", trigger_error)]
