"""PDF-only private object store. Never exposes original document URLs to clients."""
import io
import os
import uuid
from fastapi import HTTPException
from PIL import ImageDraw, ImageFont
import pypdfium2 as pdfium

MAX_BYTES = 25 * 1024 * 1024
MAX_PAGES = 400

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

def validate_pdf(blob):
    if not blob.startswith(b"%PDF-") or len(blob) > MAX_BYTES:
        raise HTTPException(422, "Only PDF files up to 25 MB are supported")
    try:
        doc = pdfium.PdfDocument(blob)
        pages = len(doc)
        doc.close()
    except Exception:
        raise HTTPException(422, "Invalid or unreadable PDF")
    if not 1 <= pages <= MAX_PAGES:
        raise HTTPException(422, "PDF must contain 1–400 pages")
    return pages

def put_private_pdf(blob):
    key = "library/" + uuid.uuid4().hex + ".pdf"
    if _use_s3():
        try:
            _put_private_object(key, blob, "application/pdf")
        except Exception:
            raise HTTPException(503, "Secure storage unavailable")
    else:
        root = _local_root()
        path = root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        # A random key prevents guessing; route auth is still required.
        with path.open("xb") as out:
            out.write(blob)
    return key

def get_private_pdf(key):
    if not key.startswith("library/") or not key.endswith(".pdf") or "/" in key[len("library/"):]:
        raise HTTPException(404, "Document not found")
    if _use_s3():
        try:
            response = _s3_client().get_object(Bucket=os.environ["S3_PRIVATE_BUCKET"], Key=key)
            return response["Body"].read(MAX_BYTES + 1)
        except Exception:
            raise HTTPException(503, "Protected document temporarily unavailable")
    path = _local_root() / key
    if not path.is_file():
        raise HTTPException(404, "Document not found")
    return path.read_bytes()

def render_watermarked_page(blob, page_number, username):
    try:
        doc = pdfium.PdfDocument(blob)
        if page_number < 1 or page_number > len(doc):
            doc.close()
            raise HTTPException(404, "Page not found")
        page = doc[page_number - 1]
        image = page.render(scale=1.35).to_pil().convert("RGB")
        page.close()
        doc.close()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "Unable to render page")
    draw = ImageDraw.Draw(image, "RGBA")
    label = "Olimpiada.al • " + username[:32]
    for y in range(90, image.height, 350):
        for x in range(30, image.width, 440):
            draw.text((x, y), label, fill=(45, 75, 70, 65))
    out = io.BytesIO()
    image.save(out, format="WEBP", quality=80, method=5)
    return out.getvalue()
