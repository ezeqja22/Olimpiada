"""Bounded PDF operations; native parsers never run inside an API worker."""
import os
from pathlib import Path
import subprocess
import sys

MAX_FILE_SIZE = 25 * 1024 * 1024
MAX_PAGES = 1500
PDF_TIMEOUT_SECONDS = 20
WORKER = Path(__file__).with_name("library_pdf_worker.py")


def _process(operation, content, argument=0):
    if len(content) > MAX_FILE_SIZE:
        raise ValueError("PDF exceeds the upload limit")
    # Do not pass database, cloud or signing credentials into a PDF parser.
    env = {key: value for key, value in os.environ.items()
           if key.upper() in {"SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP", "LANG"}}
    try:
        result = subprocess.run(
            [sys.executable, "-I", str(WORKER), operation, str(argument)],
            input=content, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            timeout=PDF_TIMEOUT_SECONDS, env=env,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
    except subprocess.TimeoutExpired as exc:
        raise ValueError("PDF processing time limit exceeded") from exc
    if result.returncode or not result.stdout or len(result.stdout) > 50 * 1024 * 1024:
        raise ValueError("PDF could not be processed within resource limits")
    return result.stdout


def page_count(content):
    return int(_process("count", content))


def render_page(content, number):
    return _process("page", content, number)


def watermarked_pdf(content, user_id):
    return _process("watermark", content, user_id)
