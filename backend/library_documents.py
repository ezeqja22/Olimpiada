"""Render private documents and stamp PDFs before attaching them to a response."""
from contextlib import closing
from io import BytesIO
from threading import Lock

import pypdfium2 as pdfium
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen.canvas import Canvas

MAX_FILE_SIZE = 25 * 1024 * 1024
MAX_PAGES = 1500
_pdfium = Lock()


def page_count(content):
    with _pdfium, pdfium.PdfDocument(content) as document:
        return len(document)


def render_page(content, number):
    output = BytesIO()
    with _pdfium, pdfium.PdfDocument(content) as document, closing(document[number - 1]) as page:
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
