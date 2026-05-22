"""
Small request-level guards that sit outside DRF.
"""

from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest, HttpResponse


class AdminLoginRateLimitMiddleware:
    """
    Rate limit POSTs to the Django admin login endpoint by client IP.

    DRF throttles do not cover Django admin views, so this guard handles the
    admin login form before authentication work happens.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest):
        if request.method == "POST" and request.path.rstrip("/") == "/admin/login":
            client_ip = _client_ip(request)
            cache_key = f"admin-login-throttle:{client_ip}"
            limit = settings.ADMIN_LOGIN_THROTTLE_LIMIT
            window_seconds = settings.ADMIN_LOGIN_THROTTLE_WINDOW_SECONDS

            current_count = cache.get(cache_key, 0)
            if current_count >= limit:
                response = HttpResponse("Too many login attempts.", status=429)
                response["Retry-After"] = str(window_seconds)
                return response

            if current_count == 0:
                cache.set(cache_key, 1, timeout=window_seconds)
            else:
                try:
                    cache.incr(cache_key)
                except ValueError:
                    cache.set(cache_key, 1, timeout=window_seconds)

        return self.get_response(request)


def _client_ip(request: HttpRequest) -> str:
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")
