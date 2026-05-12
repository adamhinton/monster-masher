from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Object-level permission that grants access only to the object's owner.

    The view must explicitly call check_object_permissions(request, obj).

    Note: views in the monsters app prefer returning 404 (not 403) for
    ownership failures.  They achieve this by filtering querysets on
    owner=request.user rather than relying on this class alone.  This class
    is provided as a reusable helper for cases where a 403 response is
    acceptable.
    """

    def has_object_permission(self, request, view, obj) -> bool:
        return obj.owner == request.user
