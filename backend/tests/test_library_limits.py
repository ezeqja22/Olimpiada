from unittest.mock import patch
import pytest
from fastapi import HTTPException
from library_limits import PrivateCache, pdf_work, windows, slots

def test_cache_is_byte_bounded_and_expires():
    cache=PrivateCache(max_bytes=5,ttl=10)
    with patch('library_limits.monotonic',return_value=0):
        cache.put('a',b'123');cache.put('b',b'456')
        assert cache.get('a') is None
        assert cache.get('b')==b'456'
        assert cache.size<=5
    with patch('library_limits.monotonic',return_value=11):
        assert cache.get('b') is None
        assert cache.size==0

def test_admission_releases_slots_after_exception_and_rejects_saturation():
    windows.clear()
    with pytest.raises(ValueError):
        with pdf_work(123456,'page'):raise ValueError('synthetic failure')
    assert slots.acquire(blocking=False)
    assert slots.acquire(blocking=False)
    try:
        with pytest.raises(HTTPException) as caught:
            with pdf_work(123456,'page'):pass
        assert caught.value.status_code==503
    finally:slots.release();slots.release();windows.clear()

def test_download_rate_limit():
    windows.clear()
    try:
        for _ in range(3):
            with pdf_work(123456,'download'):pass
        with pytest.raises(HTTPException) as caught:
            with pdf_work(123456,'download'):pass
        assert caught.value.status_code==429
    finally:windows.clear()


def test_pdf_worker_rejects_encrypted_malformed_and_oversized_geometry():
    from io import BytesIO
    from pypdf import PdfWriter
    from library_documents import page_count, render_page, watermarked_pdf
    writer = PdfWriter(); writer.add_blank_page(width=200, height=300)
    output = BytesIO(); writer.write(output)
    assert page_count(output.getvalue()) == 1
    assert render_page(output.getvalue(), 1).startswith(b"\xff\xd8")
    writer.encrypt("synthetic")
    encrypted = BytesIO(); writer.write(encrypted)
    with pytest.raises(ValueError): page_count(encrypted.getvalue())
    with pytest.raises(ValueError): page_count(b"%PDF-invalid")
    huge = PdfWriter(); huge.add_blank_page(width=20000, height=20000)
    output = BytesIO(); huge.write(output)
    with pytest.raises(ValueError): page_count(output.getvalue())


def test_pdf_worker_timeout_and_failure_are_contained():
    import subprocess
    from library_documents import page_count
    with patch("library_documents.subprocess.run", side_effect=subprocess.TimeoutExpired("worker", 20)):
        with pytest.raises(ValueError, match="time limit"): page_count(b"%PDF-test")
    with patch("library_documents.subprocess.run", return_value=subprocess.CompletedProcess([], 2, b"")):
        with pytest.raises(ValueError, match="resource limits"): page_count(b"%PDF-test")


def test_upload_limit_checks_declared_and_chunked_sizes():
    import asyncio
    from library_limits import LibraryUploadLimit
    seen = []
    async def downstream(scope, receive, send):
        seen.append(await receive())
        await receive()
    middleware = LibraryUploadLimit(downstream); middleware.limit = 5
    async def run(headers):
        messages = iter([{"type":"http.request", "body":b"123", "more_body":True},
                         {"type":"http.request", "body":b"456", "more_body":False}])
        sent = []
        async def receive(): return next(messages)
        async def send(message): sent.append(message)
        await middleware({"type":"http", "method":"POST", "path":"/core/library/admin/upload", "headers":headers}, receive, send)
        return sent
    assert asyncio.run(run([(b"content-length",b"6")]))[0]["status"] == 413
    assert not seen
    with pytest.raises(HTTPException) as exc: asyncio.run(run([]))
    assert exc.value.status_code == 413
