from django.http import JsonResponse
from django.views.decorators.http import require_GET
import sentry_sdk


@require_GET
def health(request):
    sentry_sdk.capture_message(
        f"Health endpoint hit: {request.method} {request.path}",
        level="info",
    )
    return JsonResponse({"status": "ok"})
