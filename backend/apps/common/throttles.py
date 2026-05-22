"""
Reusable DRF throttle helpers.
"""

from rest_framework.throttling import ScopedRateThrottle


class ScopedMethodThrottleMixin:
    """
    Adds DRF scoped throttles only for selected HTTP methods.

    The project's global anon/user throttles still apply through
    ``super().get_throttles()``. Views opt into narrower mutation scopes by
    setting ``throttle_scope_by_method``.
    """

    throttle_scope_by_method: dict[str, str] = {}

    def get_throttles(self):
        throttles = super().get_throttles()
        method = self.request.method.upper()
        throttle_scope = self.throttle_scope_by_method.get(method)
        if throttle_scope:
            self.throttle_scope = throttle_scope
            throttles.append(ScopedRateThrottle())
        return throttles
