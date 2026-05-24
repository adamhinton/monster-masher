"""
General error shape tests
Errors bubble up to /common, particularly for API routes that don't exist
"""

import json

from django.conf import settings
from django.core.cache import cache
from django.test import TestCase, override_settings


class ErrorShapeTests(TestCase):
    def test_unknown_api_route_returns_json_404(self):
        response = self.client.get("/api/doesnotexist/")
        self.assertEqual(response.status_code, 404)
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


class OpenAPISchemaTests(TestCase):
    """
    Tests for the /api/schema/ and /api/docs/ endpoints added in Phase 2.

    drf-spectacular does real introspection on each request — these tests are
    intentionally not mocked. They will be slightly slower than pure unit tests.
    """

    def test_schema_endpoint_returns_200(self):
        response = self.client.get("/api/schema/")
        self.assertEqual(response.status_code, 200)

    def test_schema_json_format_returns_200_with_openapi_key(self):
        response = self.client.get("/api/schema/?format=json")
        self.assertEqual(response.status_code, 200)
        # drf-spectacular returns application/vnd.oai.openapi+json for the JSON schema
        self.assertIn("json", response["Content-Type"])
        data = json.loads(response.content)
        self.assertIn("openapi", data)

    def test_docs_endpoint_returns_200(self):
        response = self.client.get("/api/docs/")
        self.assertEqual(response.status_code, 200)

    def test_health_path_in_schema(self):
        response = self.client.get("/api/schema/?format=json")
        data = json.loads(response.content)
        paths = data.get("paths", {})
        self.assertTrue(
            any("health" in path for path in paths),
            f"Expected a path containing 'health' in schema, got: {list(paths.keys())}",
        )

    def test_schema_invalid_format_query(self):
        """
        DRF raises NotAcceptable (406) when the requested format has no matching renderer.
        The schema endpoint should never return 200 for an unrecognised format.
        """
        response = self.client.get("/api/schema/?format=invalid")
        self.assertNotEqual(response.status_code, 200)

    def test_docs_html_content(self):
        response = self.client.get("/api/docs/")
        self.assertIn(b"swagger-ui", response.content)

    def test_schema_and_docs_paths_excluded_from_schema(self):
        """
        SPECTACULAR_SETTINGS["SERVE_INCLUDE_SCHEMA"] = False means the schema
        and docs endpoints must not appear as documented paths in the output.
        """
        response = self.client.get("/api/schema/?format=json")
        data = json.loads(response.content)
        paths = data.get("paths", {})
        self.assertNotIn("/schema/", paths)
        self.assertNotIn("/docs/", paths)

    def test_catch_all_excluded_from_schema(self):
        """
        api_not_found is decorated with @extend_schema(exclude=True) and must
        not appear as a documented endpoint.
        """
        response = self.client.get("/api/schema/?format=json")
        data = json.loads(response.content)
        paths = data.get("paths", {})
        for path in paths:
            self.assertNotIn(".*", path)


class ThrottleConfigurationTests(TestCase):
    def test_drf_default_throttles_are_configured(self):
        throttle_classes = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"]
        self.assertIn("rest_framework.throttling.AnonRateThrottle", throttle_classes)
        self.assertIn("rest_framework.throttling.UserRateThrottle", throttle_classes)
        self.assertIn("monster_create", settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"])


class AdminLoginRateLimitTests(TestCase):
    def setUp(self):
        cache.clear()

    @override_settings(
        ADMIN_LOGIN_THROTTLE_LIMIT=1,
        ADMIN_LOGIN_THROTTLE_WINDOW_SECONDS=60,
        STORAGES={
            "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
            "staticfiles": {
                "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
            },
        },
    )
    def test_admin_login_post_is_rate_limited_by_ip(self):
        first_response = self.client.post(
            "/admin/login/",
            {"username": "admin", "password": "wrong"},
            REMOTE_ADDR="203.0.113.10",
        )
        second_response = self.client.post(
            "/admin/login/",
            {"username": "admin", "password": "wrong"},
            REMOTE_ADDR="203.0.113.10",
        )

        self.assertNotEqual(first_response.status_code, 429)
        self.assertEqual(second_response.status_code, 429)
