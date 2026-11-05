"""Non-network regressions for private S3 compatibility and scheduler defaults."""
import os
import unittest
from unittest.mock import patch, MagicMock

import private_storage as storage
from inline_scheduler import inline_scheduler_enabled


class PrivateS3CompatibilityTests(unittest.TestCase):
    def test_submission_reads_use_shared_s3_client(self):
        from io import BytesIO
        from private_submission_storage import read_submission
        with patch.dict(os.environ,{"S3_PRIVATE_BUCKET":"private-tests"}), patch("private_submission_storage._s3_client") as factory:
            factory.return_value.get_object.return_value={"Body":BytesIO(b"private answer")}
            self.assertEqual(read_submission("weekly/answer.pdf"),b"private answer")
            factory.return_value.get_object.assert_called_once_with(Bucket="private-tests",Key="weekly/answer.pdf")

    def test_supabase_s3_upload_omits_unsupported_encryption_header(self):
        env = {
            "S3_PRIVATE_BUCKET": "olimpiada-private",
            "S3_ENDPOINT_URL": "https://project.storage.supabase.co/storage/v1/s3",
        }
        with patch.dict(os.environ, env), patch.object(storage, "_s3_client") as factory:
            storage._put_private_object("weekly/example.pdf", b"%PDF-1.4", "application/pdf")
        kwargs = factory.return_value.put_object.call_args.kwargs
        self.assertEqual(kwargs["Bucket"], "olimpiada-private")
        self.assertEqual(kwargs["Key"], "weekly/example.pdf")
        self.assertNotIn("ServerSideEncryption", kwargs)

    def test_aws_s3_upload_preserves_encryption_header(self):
        env = {
            "S3_PRIVATE_BUCKET": "private-tests",
            "S3_ENDPOINT_URL": "https://s3.eu-central-1.amazonaws.com",
        }
        with patch.dict(os.environ, env), patch.object(storage, "_s3_client") as factory:
            storage._put_private_object("weekly/example.pdf", b"%PDF-1.4", "application/pdf")
        kwargs = factory.return_value.put_object.call_args.kwargs
        self.assertEqual(kwargs["ServerSideEncryption"], "AES256")

    def test_custom_s3_endpoint_uses_path_style(self):
        env = {
            "S3_ENDPOINT_URL": "https://project.storage.supabase.co/storage/v1/s3",
            "S3_REGION": "eu-north-1",
        }
        with patch.dict(os.environ, env), patch("boto3.client") as factory:
            storage._s3_client()
        kwargs = factory.call_args.kwargs
        self.assertEqual(kwargs["region_name"], "eu-north-1")
        self.assertEqual(kwargs["config"].s3["addressing_style"], "path")

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
