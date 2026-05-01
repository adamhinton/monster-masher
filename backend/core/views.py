"""
Views for the core app.

Currently contains only the /health endpoint, which is used by Render for
uptime monitoring and by the frontend smoke test to confirm the API is reachable.
"""

from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response
from sentry_sdk import logger as sentry_logger
from drf_spectacular.utils import extend_schema, inline_serializer


@extend_schema(
    summary="Health check",
    description="Returns ok when the server is running. Unauthenticated.",
    responses={
        200: inline_serializer(
            name="HealthResponse",
            fields={"status": serializers.CharField()},
        )
    },
)
@api_view(["GET"])
def health(request):
    user_agent = request.headers.get("User-Agent", "")

    # I want to log when /health is hit
    # But, Render hits it every five seconds, so ignore that because it would clog up the logging
    if user_agent != "Render/1.0":
        sentry_logger.info(
            "Health endpoint hit (not by Render)",
            attributes={
                "endpoint": request.path,
                "method": request.method,
                "user_agent": user_agent,
            },
        )

    return Response({"status": "ok"})
