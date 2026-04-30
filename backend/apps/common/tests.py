"""
General error shape tests
Errors bubble up to /common, particularly for API routes that don't exist
"""

from django.test import TestCase


class ErrorShapeTests(TestCase):
    def test_unknown_api_route_returns_json_404(self):
        response = self.client.get("/api/doesnotexist/")
        self.assertEqual(response.status_code, 405)
        data = response.json()
        self.assertEqual(data["error"]["code"], "not_found")

    def test_error_response_has_required_keys(self):
        response = self.client.get("/api/doesnotexist/")
        error = response.json()["error"]
        self.assertIn("code", error)
        self.assertIn("message", error)
        self.assertIn("details", error)

    def test_health_post_returns_405_json(self):
        """
        Rejects POST /health; can only GET /health
        """
        response = self.client.post("/health/")
        self.assertEqual(response.status_code, 405)
        data = response.json()
        self.assertEqual(data["error"]["code"], "method_not_allowed")
        self.assertIn("message", data["error"])
        self.assertIn("details", data["error"])
