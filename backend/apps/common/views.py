"""
Views for the common app.

Contains only the catch-all api_not_found view, which returns a standard
404 error response for any /api/ route that does not match a registered endpoint.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema


@extend_schema(
    exclude=True
)  # Excluded from OpenAPI schema — catch-all should not appear as a documented endpoint
@api_view(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
def api_not_found(request, *args, **kwargs):
    return Response(
        {
            "error": {
                "code": "not_found",
                "message": "The requested endpoint does not exist.",
                "details": {},
            }
        },
        status=404,
    )
