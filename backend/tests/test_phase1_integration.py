"""API security and account access tests against a local SQLite database."""
import os
import unittest
from unittest.mock import patch
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
import models
from database import SessionLocal, engine
from auth.utils import create_jwt, hash_password
from phase1_jobs import anonymize_inactive_accounts
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

    def test_inactive_account_cleanup_requires_opt_in(self):
        stale = datetime.utcnow() - timedelta(days=366)
        self.student.created_at = self.student.last_activity_at = stale
        self.student.password_hash = hash_password("ExamplePassword123!")
        self.db.commit()
        email = self.student.email
        with patch.dict(os.environ):
            os.environ.pop("ENABLE_INACTIVE_ACCOUNT_CLEANUP", None)
            self.assertEqual(anonymize_inactive_accounts(self.db), 0)
            response = self.client.post("/auth/login", json={
                "email": email, "password": "ExamplePassword123!",
            })
            self.assertEqual(response.status_code, 200, response.text)
            self.db.refresh(self.student)
            self.assertTrue(self.student.is_active)

            self.student.last_activity_at = self.student.last_login = stale
            self.db.commit()
            os.environ["ENABLE_INACTIVE_ACCOUNT_CLEANUP"] = "1"
            self.assertEqual(anonymize_inactive_accounts(self.db), 1)
            self.db.refresh(self.student)
            self.assertFalse(self.student.is_active)
            self.assertNotEqual(self.student.email, email)

    def test_free_users_can_read_only_their_own_drafts(self):
        owner = self.student
        other = models.User(username="other_draft_reader", email="reader@example.org",
                            password_hash="unused", role="student", is_verified=True)
        self.db.add(other)
        self.db.commit()
        def draft(user):
            return models.Draft(author_id=user.id, title="Unpublished problem",
                                description="Private draft text", subject="Math")
        own, foreign = draft(owner), draft(other)
        self.db.add_all([own, foreign])
        self.db.commit()
        headers = self.headers(self.student_token)
        url = "/auth/drafts"
        listed = self.client.get(url, headers=headers)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual([item["id"] for item in listed.json()], [own.id])
        detail = self.client.get(f"{url}/{own.id}", headers=headers)
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["description"], own.description)
        self.assertEqual(self.client.get(f"{url}/{foreign.id}", headers=headers).status_code, 404)
        self.assertEqual(self.client.get(f"{url}/{own.id}").status_code, 401)
        self.assertEqual(self.client.delete(f"{url}/{foreign.id}", headers=headers).status_code, 404)
        self.assertEqual(self.client.delete(f"{url}/{own.id}", headers=headers).status_code, 200)

    def test_guest_can_only_discover(self):
        self.assertEqual(self.client.get("/public/forums").status_code, 200)
        self.assertEqual(self.client.get("/public/library").status_code, 404)
        self.assertEqual(self.client.get("/public/problem-of-week").status_code, 200)
        self.assertEqual(self.client.get("/auth/forums").status_code, 401)
        self.assertEqual(self.client.get("/admin/users").status_code, 401)

    def test_accounts_access_learning_without_subscription(self):
        headers = self.headers(self.student_token)
        for plan in ("free", "basic", "medium", "premium"):
            self.student.subscription_plan = plan
            self.student.subscription_expires_at = datetime.utcnow() - timedelta(days=1)
            self.db.commit()
            for path in ("/auth/forums", "/auth/problems/", "/access/resources", "/core/courses/items"):
                with self.subTest(plan=plan,path=path):
                    r=self.client.get(path,headers=headers)
                    self.assertEqual(r.status_code,200,r.text)
        access=self.client.get("/access/me",headers=headers).json()
        self.assertNotIn("plan",access)
        self.assertNotIn("subscription_expires_at",access)
        self.assertEqual(set(access["features"]),{"forum","meet","material","test","tutoring"})

    def test_retired_billing_endpoints_do_not_mutate_accounts(self):
        for token in (self.student_token,self.admin_token):
            for method,path in (("GET","/access/plans"),("POST","/access/trial/start"),
                ("POST","/access/payments"),("GET","/access/payments/mine"),
                ("GET","/access/admin/payments"),("POST","/access/admin/payments/1/review"),
                ("PUT","/core/forums/1/tier")):
                r=self.client.request(method,path,headers=self.headers(token),json={"plan":"premium","approve":True})
                self.assertEqual(r.status_code,404,(path,r.text))
        self.db.refresh(self.student)
        self.assertEqual(self.student.subscription_plan,"free")
        self.assertIsNone(self.student.subscription_expires_at)
        self.assertIsNone(self.student.trial_used_at)

    def test_notifications_are_owner_only(self):
        own=models.Notification(user_id=self.student.id,type="follow",title="Own",message="Own")
        foreign=models.Notification(user_id=self.admin.id,type="follow",title="Private",message="Private")
        self.db.add_all([own,foreign]); self.db.commit()
        headers=self.headers(self.student_token)
        listed=self.client.get("/auth/notifications",headers=headers)
        self.assertEqual(listed.status_code,200,listed.text)
        self.assertIn(own.id,[n["id"] for n in listed.json()])
        self.assertNotIn(foreign.id,[n["id"] for n in listed.json()])
        self.assertEqual(self.client.put(f"/auth/notifications/{foreign.id}/read",headers=headers).status_code,404)
        self.assertEqual(self.client.put(f"/auth/notifications/{own.id}/read",headers=headers).status_code,200)

    def test_admin_can_search_users_by_username_and_email(self):
        url = "/admin/users"
        for query in (self.student.username, self.student.email):
            with self.subTest(query=query):
                result = self.client.get(url, params={"search": query},
                                         headers=self.headers(self.admin_token))
                self.assertEqual(result.status_code, 200, result.text)
                ids = [user["id"] for user in result.json()["users"]]
                self.assertIn(self.student.id, ids)
                self.assertNotIn(self.admin.id, ids)

        denied = self.client.get(url, params={"search": self.student.email},
                                 headers=self.headers(self.student_token))
        self.assertEqual(denied.status_code, 403)

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
