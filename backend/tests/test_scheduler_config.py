"""Scheduler startup requires explicit configuration."""
import os
import unittest
from unittest.mock import patch
from inline_scheduler import inline_scheduler_enabled

class SchedulerConfigTests(unittest.TestCase):
    def test_inline_cron_disabled_by_default(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(inline_scheduler_enabled())

    def test_inline_cron_requires_explicit_opt_in(self):
        with patch.dict(os.environ, {"ENABLE_INLINE_SCHEDULER": "1"}):
            self.assertTrue(inline_scheduler_enabled())
        with patch.dict(os.environ, {"ENABLE_INLINE_SCHEDULER": "0"}):
            self.assertFalse(inline_scheduler_enabled())


if __name__ == "__main__":
    unittest.main()
