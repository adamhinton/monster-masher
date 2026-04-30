"""
Tests for the /health endpoint.
This endpoint is very simple as of 4.30.26, just returns {status: "ok"}
"""

from django.test import TestCase


class HealthEndpointTests(TestCase):
    def test_health_returns_200(self):
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)

    def test_health_returns_ok_status(self):
        response = self.client.get("/health/")
        self.assertEqual(response.json(), {"status": "ok"})

    def test_health_post_not_allowed(self):
        """
        /health endpoint allows only GET, not POST
        """
        response = self.client.post("/health/")
        self.assertEqual(response.status_code, 405)
