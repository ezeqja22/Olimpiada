"""Process-local PDF admission and byte-bounded private cache.

Authorization must be checked before looking up cache entries. Limits apply per
worker; deployment-wide quotas require a shared gateway/store, not this module.
"""
from collections import OrderedDict
from contextlib import contextmanager
from threading import BoundedSemaphore, Lock
from time import monotonic
from fastapi import HTTPException

class PrivateCache:
    def __init__(self, max_bytes=64*1024*1024, ttl=180):
        self.max_bytes=max_bytes; self.ttl=ttl; self.size=0; self.items=OrderedDict(); self.lock=Lock()
    def get(self,key):
        with self.lock:
            row=self.items.pop(key,None)
            if row is None:return None
            expiry,value=row
            if expiry<=monotonic():self.size-=len(value);return None
            self.items[key]=row
            return value
    def put(self,key,value):
        if len(value)>self.max_bytes:return
        with self.lock:
            old=self.items.pop(key,None)
            if old:self.size-=len(old[1])
            while self.items and self.size+len(value)>self.max_bytes:
                _,old=self.items.popitem(last=False);self.size-=len(old[1])
            self.items[key]=(monotonic()+self.ttl,value);self.size+=len(value)

cache=PrivateCache()
slots=BoundedSemaphore(2)
rate_lock=Lock()
windows={}

def pdf_rate(user_id,kind):
    now=monotonic()
    with rate_lock:
        expired=[key for key,(start,_) in windows.items() if now-start>=60]
        for key in expired:del windows[key]
        key=(user_id,kind)
        start,count=windows.get(key,(now,0))
        if count >= (3 if kind=='download' else 90):
            raise HTTPException(429,'Please wait before requesting more PDF pages or downloads.',headers={'Retry-After':'60'})
        if key not in windows and len(windows)>=4096:
            raise HTTPException(503,'PDF service is busy. Please retry.',headers={'Retry-After':'5'})
        windows[key]=(start,count+1)

@contextmanager
def pdf_slot():
    if not slots.acquire(blocking=False):
        raise HTTPException(503,'PDF service is busy. Please retry.',headers={'Retry-After':'2'})
    try:yield
    finally:slots.release()

@contextmanager
def pdf_work(user_id,kind):
    pdf_rate(user_id,kind)
    with pdf_slot():
        yield


class LibraryUploadLimit:
    """Bound multipart input before FastAPI spools it, including chunked requests."""
    limit = 26 * 1024 * 1024  # 25 MiB PDF plus bounded multipart metadata.

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if (scope["type"] != "http" or scope.get("method") not in {"POST", "PUT"}
                or not scope.get("path", "").startswith("/core/library/admin")):
            return await self.app(scope, receive, send)
        from starlette.responses import JSONResponse
        headers = dict(scope.get("headers", []))
        try:
            length = int(headers.get(b"content-length", b"0"))
        except ValueError:
            return await JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)(scope, receive, send)
        if length > self.limit:
            return await JSONResponse({"detail": "PDF upload is too large"}, status_code=413)(scope, receive, send)
        received = 0

        async def bounded_receive():
            nonlocal received
            message = await receive()
            received += len(message.get("body", b""))
            if received > self.limit:
                raise HTTPException(413, "PDF upload is too large")
            return message

        await self.app(scope, bounded_receive, send)
