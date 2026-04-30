from django.apps import AppConfig


class CommonConfig(AppConfig):
    """
    Shared conventions and utilities used across Django apps.

    This app has no models, no migrations, and no URLs of its own.
    It owns the custom exception handler, standard error response helpers,
    and the catch-all 404 view for unknown /api/ routes.
    """

    name = "apps.common"
