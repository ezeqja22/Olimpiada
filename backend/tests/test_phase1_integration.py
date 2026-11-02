"""API security and payment review tests against a local SQLite database."""
import unittest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
import models
from database import SessionLocal, engine
from auth.utils import create_jwt
from main import app

class Phase1Integration(unittest.TestCase):
    sequence = 0

    @classmethod
    def setUpClass(cls):
        models.Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self):
        Phase1Integration.sequence += 1
        i = Phase1Integration.sequence
        self.db = SessionLocal()
        self.student = models.User(username=f"student_{i}", email=f"student{i}@example.org",
                                   password_hash="unused", role="student", is_verified=True,
                                   is_active=True, is_banned=False)
        self.admin = models.User(username=f"admin_{i}", email=f"admin{i}@example.org",
                                 password_hash="unused", role="admin", is_verified=True,
                                 is_active=True, is_banned=False, is_superuser=False)
        self.db.add_all([self.student, self.admin])
        self.db.commit()
        self.student_token = create_jwt(self.student.id, self.db)
        self.admin_token = create_jwt(self.admin.id, self.db)

    def tearDown(self):
        self.db.close()

    def headers(self, token):
        return {"Authorization": "Bearer " + token}

    def test_guest_can_only_discover(self):
        self.assertEqual(self.client.get("/public/forums").status_code, 200)
        self.assertEqual(self.client.get("/public/library").status_code, 200)
        self.assertEqual(self.client.get("/public/problem-of-week").status_code, 200)
        self.assertEqual(self.client.get("/auth/forums").status_code, 401)
        self.assertEqual(self.client.get("/admin/users").status_code, 401)

    def test_free_is_locked_trial_manual_only_once(self):
        token = self.student_token
        self.assertEqual(self.client.get("/auth/forums", headers=self.headers(token)).status_code, 402)
        self.assertEqual(self.client.get("/auth/problems/", headers=self.headers(token)).status_code, 402)
        start = self.client.post("/access/trial/start", headers=self.headers(token))
        self.assertEqual(start.status_code, 200, start.text)
        self.assertEqual(self.client.post("/access/trial/start", headers=self.headers(token)).status_code, 409)
        self.assertEqual(self.client.get("/auth/forums", headers=self.headers(token)).status_code, 200)

    def test_basic_cannot_open_materials(self):
        self.student.subscription_plan = "basic"
        self.student.subscription_expires_at = datetime.utcnow() + timedelta(days=31)
        self.db.commit()
        self.assertEqual(self.client.get("/auth/forums", headers=self.headers(self.student_token)).status_code, 200)
        self.assertEqual(self.client.get("/auth/problems/", headers=self.headers(self.student_token)).status_code, 402)
        self.assertEqual(self.client.get("/access/resources", headers=self.headers(self.student_token)).status_code, 402)

    def test_payment_review_only_once(self):
        payment = models.PaymentSubmission(user_id=self.student.id,plan="medium",months=2,
                                           amount_all=5000,receipt_public_id="private/test",
                                           status="pending",created_at=datetime.utcnow())
        self.db.add(payment)
        self.db.commit()
        url = "/access/admin/payments/" + str(payment.id) + "/review"
        self.assertEqual(self.client.post(url, json={"approve":True},headers=self.headers(self.student_token)).status_code, 403)
        r = self.client.post(url, json={"approve":True},headers=self.headers(self.admin_token))
        self.assertEqual(r.status_code, 200, r.text)
        self.db.refresh(self.student)
        self.assertEqual(self.student.subscription_plan, "medium")
        self.assertTrue(self.student.subscription_expires_at > datetime.utcnow() + timedelta(days=55))
        self.assertEqual(self.client.post(url,json={"approve":True},headers=self.headers(self.admin_token)).status_code, 409)

    def test_only_super_admin_assigns_roles(self):
        r = self.client.put("/admin/users/"+str(self.student.id),
                            json={"role":"teacher"}, headers=self.headers(self.admin_token))
        self.assertEqual(r.status_code,403, r.text)
        self.db.refresh(self.student)
        self.assertEqual(self.student.role, "student")

    def test_revoked_idle_session_rejected(self):
        session = self.db.query(models.UserSession).filter(
            models.UserSession.user_id == self.student.id).first()
        session.last_activity_at = datetime.utcnow()-timedelta(minutes=11)
        self.db.commit()
        r = self.client.get("/access/me", headers=self.headers(self.student_token))
        self.assertEqual(r.status_code,401,r.text)

if __name__=="__main__":
    unittest.main()
