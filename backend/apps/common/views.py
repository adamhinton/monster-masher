"""
Views for the common app.

Contains only the catch-all api_not_found view, which returns a standard
404 error response for any /api/ route that does not match a registered endpoint.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response


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
