"""Private submission attachments. Not an openly accessible URL or Cloudinary resource."""
import io
import os
import uuid
from fastapi import HTTPException
from PIL import Image
from private_storage import _use_s3, _s3_client, _local_root, _put_private_object

MAX_SUBMISSION_BYTES = 8 * 1024 * 1024
MIME = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

def validate_attachment(blob, mime):
    if not blob or len(blob) > MAX_SUBMISSION_BYTES or mime not in MIME:
        raise HTTPException(422, "PDF/JPG/PNG/WEBP only, up to 8MB")
    if mime == "application/pdf":
        if not blob.startswith(b"%PDF-"):
            raise HTTPException(422, "Invalid PDF header")
        # Untrusted content stays in private storage; reviewer downloads file manually.
    else:
        try:
            image = Image.open(io.BytesIO(blob))
            image.verify()
        except Exception:
            raise HTTPException(422, "Image invalid")
    return MIME[mime]

def put_submission(blob, mime):
    ext = validate_attachment(blob, mime)
    key = "weekly/" + uuid.uuid4().hex + "." + ext
    if _use_s3():
        try:
            _put_private_object(key, blob, mime)
        except Exception:
            raise HTTPException(503, "Private storage not available")
    else:
        path = _local_root() / key
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("xb") as out:
            out.write(blob)
    return key

def read_submission(key):
    if not key.startswith("weekly/") or "/" in key[7:]:
        raise HTTPException(404, "Attachment not found")
    if _use_s3():
        try:
            body = _s3_client().get_object(Bucket=os.environ["S3_PRIVATE_BUCKET"], Key=key)["Body"]
            return body.read(MAX_SUBMISSION_BYTES + 1)
        except Exception:
            raise HTTPException(503, "Private storage unavailable")
    path = _local_root() / key
    if not path.is_file():
        raise HTTPException(404, "Attachment not found")
    return path.read_bytes()

def attachment_type(key):
    extension = key.rsplit(".", 1)[-1]
    return {"pdf":"application/pdf", "jpg":"image/jpeg",
            "png":"image/png", "webp":"image/webp"}.get(extension, "application/octet-stream")
