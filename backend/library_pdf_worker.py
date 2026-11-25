"""Render private documents and stamp PDFs before attaching them to a response."""
from contextlib import closing
from io import BytesIO
import math

import pypdfium2 as pdfium
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen.canvas import Canvas

MAX_FILE_SIZE = 25 * 1024 * 1024
MAX_PAGES = 1500



def page_count(content):
    reader = PdfReader(BytesIO(content))
    if reader.is_encrypted:
        raise ValueError("Encrypted PDFs are not supported")
    with pdfium.PdfDocument(content) as document:
        count = len(document)
        if not 1 <= count <= MAX_PAGES:
            raise ValueError("Unsupported page count")
        for index in range(count):
            with closing(document[index]) as page:
                if any(not math.isfinite(n) or n <= 0 or n > 14400 for n in page.get_size()):
                    raise ValueError("Unsupported page dimensions")
        return count


def render_page(content, number):
    output = BytesIO()
    with pdfium.PdfDocument(content) as document, closing(document[number - 1]) as page:
        scale = min(2, 1600 / max(page.get_size()))
        with closing(page.render(scale=scale)) as bitmap:
            bitmap.to_pil().convert("RGB").save(output, "JPEG", quality=88)
    return output.getvalue()


def watermarked_pdf(content, user_id):
    reader = PdfReader(BytesIO(content))
    writer = PdfWriter()
    label = f"Olimpiada.al  |  ID {user_id}"
    for page in reader.pages:
        page.transfer_rotation_to_content()
        box = page.cropbox
        width, height = float(box.width), float(box.height)
        stamp = BytesIO()
        canvas = Canvas(stamp, pagesize=(width, height))
        canvas.setFillColorRGB(0.22, 0.32, 0.28, alpha=0.28)
        canvas.setFont("Helvetica-Bold", min(30, max(8, width / 18)))
        canvas.translate(width / 2, height / 2)
        canvas.rotate(30)
        canvas.drawCentredString(0, 0, label)
        canvas.showPage()
        canvas.save()
        stamp.seek(0)
        page.merge_translated_page(PdfReader(stamp).pages[0], float(box.left), float(box.bottom))
        writer.add_page(page, excluded_keys=("/Annots", "/AA"))

    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def main():
    import sys
    # Railway uses Linux. Fail closed if resource limits cannot be installed.
    if sys.platform.startswith("linux"):
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (384 * 1024 * 1024,) * 2)
        resource.setrlimit(resource.RLIMIT_CPU, (15, 15))
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    content = sys.stdin.buffer.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise ValueError("File too large")
    operation = sys.argv[1]
    if operation == "count":
        output = str(page_count(content)).encode("ascii")
    elif operation == "page":
        output = render_page(content, int(sys.argv[2]))
    elif operation == "watermark":
        output = watermarked_pdf(content, int(sys.argv[2]))
    else:
        raise ValueError("Unknown operation")
    if len(output) > 50 * 1024 * 1024:
        raise ValueError("Output too large")
    sys.stdout.buffer.write(output)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Never log document content or parser diagnostics containing its text.
        import sys
        sys.exit(2)
