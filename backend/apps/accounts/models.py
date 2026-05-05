import uuid

from django.db import models


class UserProfile(models.Model):
    """
    UserProfile maps a verified Supabase user to a local Django app profile.

    Django does not own auth identity; Supabase does. This model just gives us
    a local row to attach app data (monsters, etc.) and a place to store the
    supabase_user_id that comes from verified JWTs.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supabase_user_id = models.UUIDField(unique=True, db_index=True)
    email = models.EmailField(blank=True)
    display_name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_profile"

    @property
    def is_authenticated(self) -> bool:
        """
        Required so DRF permission classes treat UserProfile as an authenticated user.

        This property is only ever reached when a valid Supabase token was verified.
        """
        return True

    def __str__(self) -> str:
        return self.email or str(self.supabase_user_id)
