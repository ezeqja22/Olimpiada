"""Verify that denied requests still include CORS headers for our frontend."""
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app, allowed_origins


class CorsErrorsTests(unittest.TestCase):
    def test_rejected_auth_response_allows_only_configured_origins(self):
        client = TestClient(app)
        # This test checks middleware, not database-backed site settings.
        with patch("main.get_settings_service", None):
            allowed = client.get("/auth/me", headers={"Origin": allowed_origins[0]})
            untrusted = client.get(
                "/auth/me", headers={"Origin": "https://untrusted.example"}
            )
        self.assertIn(allowed.status_code, (401, 403))
        self.assertEqual(
            allowed.headers.get("access-control-allow-origin"), allowed_origins[0]
        )

        self.assertIn(untrusted.status_code, (401, 403))
        self.assertNotIn("access-control-allow-origin", untrusted.headers)
