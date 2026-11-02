"""Low-level access checks with no external email, payment, storage or web services."""
import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace
from phase1_service import add_months, effective_plan, has_feature, PLANS

def user(role="student", plan="free", expires=None, trial=None, is_superuser=False):
    return SimpleNamespace(role=role, subscription_plan=plan,
                           subscription_expires_at=expires, trial_expires_at=trial,
                           is_superuser=is_superuser)

class SubscriptionTests(unittest.TestCase):
    def test_guest_and_free_denied(self):
        self.assertEqual(effective_plan(None), "guest")
        self.assertFalse(has_feature(None, "forum"))
        self.assertFalse(has_feature(user(), "forum"))
        self.assertFalse(has_feature(user(), "material"))

    def test_basic_access(self):
        u = user(plan="basic", expires=datetime.utcnow() + timedelta(days=7))
        self.assertTrue(has_feature(u, "forum"))
        self.assertFalse(has_feature(u, "material"))
        self.assertFalse(has_feature(u, "tutoring"))

    def test_medium_access(self):
        u = user(plan="medium", expires=datetime.utcnow() + timedelta(days=7))
        self.assertTrue(has_feature(u, "forum"))
        self.assertTrue(has_feature(u, "test"))
        self.assertFalse(has_feature(u, "tutoring"))

    def test_premium_access(self):
        u = user(plan="premium", expires=datetime.utcnow() + timedelta(days=7))
        self.assertTrue(has_feature(u, "tutoring"))

    def test_expired_subscription_denied(self):
        u = user(plan="premium", expires=datetime.utcnow() - timedelta(seconds=1))
        self.assertEqual(effective_plan(u), "free")

    def test_trial_medium_once_claimed(self):
        u = user(trial=datetime.utcnow() + timedelta(days=12))
        self.assertEqual(effective_plan(u), "medium")
        self.assertFalse(has_feature(u, "tutoring"))

    def test_staff_role_and_super_admin(self):
        self.assertTrue(has_feature(user(role="reviewer"), "tutoring"))
        self.assertTrue(has_feature(user(role="super_admin"), "tutoring"))
        self.assertTrue(has_feature(user(is_superuser=True), "tutoring"))

    def test_pricing(self):
        self.assertEqual(PLANS["basic"]["monthly_all"], 1000)
        self.assertEqual(PLANS["medium"]["monthly_all"], 2500)
        self.assertEqual(PLANS["premium"]["monthly_all"], 2500)

    def test_month_arithmetic(self):
        self.assertEqual(add_months(datetime(2026, 1, 31), 1), datetime(2026, 2, 28))
        self.assertEqual(add_months(datetime(2024, 1, 31), 1), datetime(2024, 2, 29))
