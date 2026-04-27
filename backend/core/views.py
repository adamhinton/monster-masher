from django.http import JsonResponse
from django.views.decorators.http import require_GET
from sentry_sdk import logger as sentry_logger


@require_GET
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

    return JsonResponse({"status": "ok"})
