"""Account access must be independent of legacy billing metadata."""
import unittest
from types import SimpleNamespace
from datetime import datetime, timedelta
from phase1_service import has_feature, LEARNING_FEATURES, require_staff
from fastapi import HTTPException

class AccountAccessTests(unittest.TestCase):
    def test_all_legacy_tiers_and_expirations_have_equal_access(self):
        for plan in ("free", "basic", "medium", "premium", "unknown"):
            for days in (-30, 30):
                u = SimpleNamespace(role="student", is_superuser=False, is_active=True,
                    is_banned=False, subscription_plan=plan,
                    subscription_expires_at=datetime.utcnow()+timedelta(days=days),
                    trial_expires_at=None)
                for feature in LEARNING_FEATURES:
                    with self.subTest(plan=plan,days=days,feature=feature):
                        self.assertTrue(has_feature(u,feature))
                with self.assertRaises(HTTPException): require_staff(u)

    def test_guest_disabled_and_banned_accounts_have_no_features(self):
        for u in (None, SimpleNamespace(is_active=False,is_banned=False),
                  SimpleNamespace(is_active=True,is_banned=True)):
            for feature in LEARNING_FEATURES:
                self.assertFalse(has_feature(u,feature))
