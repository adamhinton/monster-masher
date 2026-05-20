from django.urls import path

from .views import BootstrapMeView, ImageGensRemainingView, MeView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("me/bootstrap/", BootstrapMeView.as_view(), name="me-bootstrap"),
    # User can only do a certain number of free image generations, so this endpoint lets the frontend check how many they have left and gate image generation features accordingly.
    path(
        "me/image-gens-remaining/",
        ImageGensRemainingView.as_view(),
        name="me-image-gens-remaining",
    ),
]
