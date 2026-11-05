import unittest
from fastapi.testclient import TestClient
from main import app, allowed_origins

class CorsErrorsTests(unittest.TestCase):
    def test_auth_failure_is_readable_only_by_allowed_frontend(self):
        client = TestClient(app)
        for path in ("/auth/me", "/auth/drafts", "/admin/users"):
            response = client.get(path, headers={"Origin": allowed_origins[0]})
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.headers.get("access-control-allow-origin"), allowed_origins[0])
            denied = client.get(path, headers={"Origin": "https://untrusted.example"})
            self.assertEqual(denied.status_code, 401)
            self.assertNotIn("access-control-allow-origin", denied.headers)
