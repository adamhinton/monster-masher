"""
Tests for the /health endpoint.
This endpoint is very simple as of 4.30.26, just returns {status: "ok"}
"""

from django.test import TestCase, override_settings


class HealthEndpointTests(TestCase):
    def test_health_returns_200(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)

    def test_health_returns_ok_status(self):
        response = self.client.get("/health")
        self.assertEqual(response.json(), {"status": "ok"})

    def test_health_post_not_allowed(self):
        """
        /health endpoint allows only GET, not POST
        """
        response = self.client.post("/health")
        self.assertEqual(response.status_code, 405)

    @override_settings(
        REST_FRAMEWORK={
            "DEFAULT_THROTTLE_CLASSES": [
                "rest_framework.throttling.AnonRateThrottle",
                "rest_framework.throttling.UserRateThrottle",
            ],
            "DEFAULT_THROTTLE_RATES": {
                "anon": "1/minute",
                "user": "1/minute",
            },
        }
    )
    def test_health_is_not_throttled(self):
        """Health endpoint should never be throttled, because Render pings it every five seconds for uptime monitoring."""
        first = self.client.get("/health")
        second = self.client.get("/health")
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)


class HealthEndpointTrailingSlashTests(TestCase):
    """
    Mirrors HealthEndpointTests for /health/ — both forms are matched by the same
    re_path pattern and must behave identically.
    """

    def test_health_trailing_slash_returns_200(self):
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)

    def test_health_trailing_slash_returns_ok_status(self):
        response = self.client.get("/health/")
        self.assertEqual(response.json(), {"status": "ok"})

    def test_health_trailing_slash_post_not_allowed(self):
        response = self.client.post("/health/")
        self.assertEqual(response.status_code, 405)
