"""Stage 2 FAQ/support regression tests against in-memory SQLite only."""
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth.dependencies import get_verified_user
from database import get_db
from help_models import FaqEntry, HelpBase, SupportTicket
from help_routes import LEGACY_SEED_QUESTIONS, router
from models import Notification, User


FAQ = {
    "category": "General", "question_sq": "Si funksionon faqja?",
    "answer_sq": "Përdor platformën lirisht.",
    "question_en": "How does this website work?",
    "answer_en": "Anyone can browse the public content.",
    "position": 1, "active": True,
}
TICKET = {
    "name": "Sample Visitor", "email": "test@example.com", "category": "technical",
    "subject": "Login fails", "message": "I cannot use the login button today.",
}


class HelpRoutesTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                                    poolclass=StaticPool)
        User.__table__.create(self.engine)
        Notification.__table__.create(self.engine)
        HelpBase.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        with self.Session() as db:
            db.add_all([
                User(id=1, username="admin", email="admin@example.com", password_hash="test",
                     is_active=True, is_verified=True, role="admin"),
                User(id=2, username="student", email="student@example.com", password_hash="test",
                     is_active=True, is_verified=True, role="user"),
            ])
            db.commit()

        self.app = FastAPI()
        self.app.include_router(router)

        def test_db():
            with self.Session() as db:
                yield db

        self.app.dependency_overrides[get_db] = test_db
        self.current_user_id = 1

        def acting_user():
            with self.Session() as db:
                return db.get(User, self.current_user_id)

        self.app.dependency_overrides[get_verified_user] = acting_user
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def test_admin_can_publish_faq_and_public_can_read_it(self):
        response = self.client.post("/experience/admin/faq", json=FAQ)
        self.assertEqual(response.status_code, 201, response.text)
        public = self.client.get("/experience/faq")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(len(public.json()), 1)
        self.assertEqual(public.json()[0]["question_en"], FAQ["question_en"])

    def test_regular_user_cannot_manage_faq_or_tickets(self):
        self.current_user_id = 2
        self.assertEqual(self.client.get("/experience/admin/faq").status_code, 403)
        self.assertEqual(self.client.post("/experience/admin/faq", json=FAQ).status_code, 403)
        self.assertEqual(self.client.get("/experience/admin/tickets").status_code, 403)

    def test_old_seed_is_hidden_until_rewritten(self):
        question, answer = next(iter(LEGACY_SEED_QUESTIONS.items()))
        with self.Session() as db:
            db.add(FaqEntry(**{**FAQ, "question_en": question, "answer_en": answer}))
            db.commit()
        self.assertEqual(self.client.get("/experience/faq").json(), [])
        rows = self.client.get("/experience/admin/faq").json()
        self.assertTrue(rows[0]["needs_review"])
        rewritten = {**FAQ, "question_en": question, "answer_en": "Subscriptions are not enabled."}
        self.assertEqual(self.client.put(f"/experience/admin/faq/{rows[0]['id']}", json=rewritten).status_code, 200)
        self.assertEqual(len(self.client.get("/experience/faq").json()), 1)

    def test_inactive_questions_remain_hidden(self):
        self.client.post("/experience/admin/faq", json={**FAQ, "active": False})
        self.assertEqual(self.client.get("/experience/faq").json(), [])

    def test_support_accepts_public_ticket_and_notifies_admin(self):
        response = self.client.post("/experience/support/tickets", json=TICKET)
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["status"], "open")
        with self.Session() as db:
            self.assertEqual(db.query(SupportTicket).count(), 1)
            self.assertEqual(db.query(Notification).filter(Notification.user_id == 1).count(), 1)
        self.assertEqual(len(self.client.get("/experience/admin/tickets").json()), 1)

    def test_per_email_limit_and_input_validation(self):
        for _ in range(3):
            self.assertEqual(self.client.post("/experience/support/tickets", json=TICKET).status_code, 201)
        self.assertEqual(self.client.post("/experience/support/tickets", json=TICKET).status_code, 429)
        self.assertEqual(self.client.post("/experience/support/tickets", json={**TICKET, "message": "short"}).status_code, 422)

    def test_reply_email_is_escaped_and_not_duplicated(self):
        ticket_id = self.client.post("/experience/support/tickets", json=TICKET).json()["ticket_id"]
        payload = {"status": "resolved", "response": "Thanks <script>alert(1)</script>"}
        with patch("email_service.email_service.send_notification_email", return_value=True) as send:
            response = self.client.put(f"/experience/admin/tickets/{ticket_id}", json=payload)
            self.assertTrue(response.json()["email_delivered"])
            self.assertIn("&lt;script&gt;", send.call_args.args[2])
            response = self.client.put(f"/experience/admin/tickets/{ticket_id}", json=payload)
            self.assertIsNone(response.json()["email_delivered"])
            self.assertEqual(send.call_count, 1)


if __name__ == "__main__":
    unittest.main()
