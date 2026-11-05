"""Shared private object storage for submissions, teacher review and branding."""
import os
from fastapi import HTTPException


def _s3_client():
    import boto3
    from botocore.config import Config

    endpoint = os.getenv("S3_ENDPOINT_URL") or None
    kwargs = dict(
        endpoint_url=endpoint,
        region_name=os.getenv("S3_REGION") or "eu-central-1",
        aws_access_key_id=os.getenv("S3_ACCESS_KEY_ID") or None,
        aws_secret_access_key=os.getenv("S3_SECRET_ACCESS_KEY") or None,
    )
    if endpoint:
        # Supabase's S3 endpoint requires path-style bucket addressing.
        kwargs["config"] = Config(s3={"addressing_style": "path"})
    return boto3.client("s3", **kwargs)


def _put_private_object(key, body, content_type):
    """Upload from the server only; never expose S3 credentials to a browser."""
    from urllib.parse import urlsplit

    endpoint = os.getenv("S3_ENDPOINT_URL") or ""
    hostname = (urlsplit(endpoint).hostname or "").lower()
    options = dict(
        Bucket=os.environ["S3_PRIVATE_BUCKET"],
        Key=key,
        Body=body,
        ContentType=content_type,
    )
    if not hostname.endswith(".storage.supabase.co"):
        # AWS S3 supports this header; Supabase Storage's S3 API does not.
        options["ServerSideEncryption"] = "AES256"
    _s3_client().put_object(**options)

def _use_s3():
    return bool(os.getenv("S3_PRIVATE_BUCKET"))

def _local_root():
    root = os.getenv("PRIVATE_FILES_DIR")
    if not root:
        raise HTTPException(503, "Private storage not configured. Configure S3_PRIVATE_BUCKET or persistent PRIVATE_FILES_DIR.")
    from pathlib import Path
    path = Path(root).expanduser().resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path

