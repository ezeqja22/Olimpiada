"""Public olympiad and library catalogues, with staff-managed content."""
from typing import Annotated, Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pypdf.errors import PdfReadError
from pydantic import BaseModel, Field, StringConstraints, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth.dependencies import get_verified_user
from database import get_db
from library_documents import MAX_FILE_SIZE, MAX_PAGES, page_count, render_page, watermarked_pdf
from models import LibraryDocument, LibraryFile, OlympiadGuide, User
from phase1_service import require_feature, require_staff

router = APIRouter()
Kind = Literal["book", "magazine", "booklet", "training"]
PRIVATE = {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=250)]


class GuideForm(BaseModel):
    slug: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: ShortText
    acronym: str = Field(min_length=2, max_length=30)
    subject: str = Field(min_length=2, max_length=80)
    scope: Literal["national", "regional", "international"]
    audience: str = Field(min_length=2, max_length=180)
    importance: str = Field(min_length=12, max_length=2500)
    history: str = Field(min_length=12, max_length=2500)
    steps: list[ShortText] = Field(min_length=1, max_length=10)
    source_url: str = Field(max_length=500)
    local_url: str | None = Field(default=None, max_length=500)
    published: bool = False

    @field_validator("source_url", "local_url")
    @classmethod
    def safe_url(cls, value):
        if value is not None:
            url = urlsplit(value)
            if url.scheme != "https" or not url.hostname or url.username or url.password:
                raise ValueError("Përdor një adresë HTTPS.")
        return value


class LibraryForm(BaseModel):
    title: ShortText
    kind: Kind
    subject: ShortText = Field(max_length=100)
    discipline: ShortText = Field(max_length=100)
    level: ShortText = Field(max_length=30)
    author: str = Field(default="", max_length=250)
    description: str = Field(default="", max_length=3000)
    visible: bool = True


def guide_payload(row):
    return {"id": row.id, **{field: getattr(row, field) for field in GuideForm.model_fields}}


@router.get("/public/olympiads")
def public_guides(db: Session = Depends(get_db)):
    return [guide_payload(row) for row in db.query(OlympiadGuide).filter_by(published=True)
            .order_by(OlympiadGuide.subject, OlympiadGuide.name).all()]


@router.get("/core/olympiads/admin")
def list_guides(user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    require_staff(user)
    return [guide_payload(row) for row in db.query(OlympiadGuide).order_by(OlympiadGuide.name).all()]


@router.post("/core/olympiads/admin", status_code=201)
def create_guide(data: GuideForm, user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    require_staff(user)
    return save_guide(data, db)


@router.put("/core/olympiads/admin/{guide_id}")
def update_guide(guide_id: int, data: GuideForm, user: User = Depends(get_verified_user),
                 db: Session = Depends(get_db)):
    require_staff(user)
    return save_guide(data, db, guide_id)


def save_guide(data, db, guide_id=None):
    existing = db.query(OlympiadGuide).filter_by(slug=data.slug).first()
    if existing and existing.id != guide_id:
        raise HTTPException(409, "Ky identifikues përdoret nga një olimpiadë tjetër.")
    guide = db.get(OlympiadGuide, guide_id) if guide_id is not None else OlympiadGuide()
    if guide is None:
        raise HTTPException(404, "Olimpiada nuk u gjet.")
    for field, value in data.model_dump().items():
        setattr(guide, field, value)
    db.add(guide)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Ky identifikues përdoret nga një olimpiadë tjetër.")
    return guide_payload(guide)


def library_payload(doc, has_file):
    return {"id": doc.id, "title": doc.title, "subject": doc.subject, "discipline": doc.discipline,
            "level": doc.level, "kind": doc.kind, "author": doc.author, "description": doc.description,
            "page_count": doc.page_count, "available": has_file, "visible": doc.visible}


def list_documents(db, visible_only=False):
    query = db.query(LibraryDocument, LibraryFile.document_id).outerjoin(LibraryFile)
    if visible_only:
        query = query.filter(LibraryDocument.visible.is_(True), LibraryFile.document_id.is_not(None))
    return [library_payload(doc, file_id is not None) for doc, file_id in
            query.order_by(LibraryDocument.created_at.desc(), LibraryDocument.id.desc()).all()]


@router.get("/public/library")
@router.get("/core/library/catalog")
def library_catalog(db: Session = Depends(get_db)):
    return list_documents(db, visible_only=True)


@router.get("/core/library/admin")
def admin_library(user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    require_staff(user)
    return list_documents(db)


def read_pdf(file):
    data = file.file.read(MAX_FILE_SIZE + 1)
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(413, "PDF-ja nuk mund të kalojë 25 MB.")
    if not data.startswith(b"%PDF-"):
        raise HTTPException(422, "Ngarko një skedar PDF.")
    try:
        count = page_count(data)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(422, "PDF-ja është dëmtuar ose e mbrojtur.") from exc
    if not 1 <= count <= MAX_PAGES:
        raise HTTPException(422, "PDF-ja duhet të ketë nga 1 deri në 1500 faqe.")
    return data, count


@router.post("/core/library/admin/upload", status_code=201)
def upload_document(metadata: Annotated[str, Form()], file: Annotated[UploadFile, File()],
                    user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    require_staff(user)
    return save_document(metadata, file, user, db)


@router.put("/core/library/admin/{document_id}")
def update_document(document_id: int, metadata: Annotated[str, Form()],
                    file: Annotated[UploadFile | None, File()] = None,
                    user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    require_staff(user)
    return save_document(metadata, file, user, db, document_id)


def save_document(metadata, file, user, db, document_id=None):
    try:
        data = LibraryForm.model_validate_json(metadata)
    except ValueError as exc:
        raise HTTPException(422, "Plotëso titullin, lëndën, disiplinën dhe nivelin.") from exc
    if document_id is None and file is None:
        raise HTTPException(422, "Ngarko PDF-në e dokumentit.")
    doc = (db.query(LibraryDocument).filter_by(id=document_id).with_for_update().first()
           if document_id is not None
           else LibraryDocument(category=data.kind, storage_key="database", uploaded_by=user.id))
    if not doc:
        raise HTTPException(404, "Dokumenti nuk u gjet.")
    has_file = doc.id is not None and db.query(LibraryFile.document_id).filter_by(document_id=doc.id).first() is not None
    for field, value in data.model_dump().items():
        setattr(doc, field, value)
    if file:
        content, doc.page_count = read_pdf(file)
        doc.storage_key = "database"
        db.add(doc)
        db.flush()
        if has_file:
            db.query(LibraryFile).filter_by(document_id=doc.id).update({LibraryFile.content: content})
        else:
            db.add(LibraryFile(document_id=doc.id, content=content))
    db.commit()
    return library_payload(doc, has_file or file is not None)


def readable_document(document_id, user, db):
    require_feature(user, "material")
    result = db.query(LibraryDocument, LibraryFile.content).outerjoin(LibraryFile).filter(
        LibraryDocument.id == document_id, LibraryDocument.visible.is_(True)).first()
    if result is None:
        raise HTTPException(404, "Dokumenti nuk u gjet.")
    return result


@router.get("/core/library/{document_id}/pages/{page}")
def document_page(document_id: int, page: int, user: User = Depends(get_verified_user),
                  db: Session = Depends(get_db)):
    doc, source = readable_document(document_id, user, db)
    if not 1 <= page <= doc.page_count:
        raise HTTPException(404, "Faqja nuk u gjet.")
    if source is None:
        raise HTTPException(404, "Skedari nuk është i disponueshëm.")
    try:
        image = render_page(source, page)
    except (ValueError, RuntimeError, IndexError) as exc:
        raise HTTPException(422, "Faqja nuk u hap.") from exc
    return Response(image, media_type="image/jpeg", headers=PRIVATE)


@router.get("/core/library/{document_id}/download")
def download_training(document_id: int, user: User = Depends(get_verified_user),
                      db: Session = Depends(get_db)):
    doc, source = readable_document(document_id, user, db)
    if doc.kind != "training":
        raise HTTPException(403, "Ky material lexohet në platformë.")
    if source is None:
        raise HTTPException(404, "Skedari nuk është i disponueshëm.")
    try:
        content = watermarked_pdf(source, user.id)
    except (PdfReadError, ValueError, RuntimeError, OSError) as exc:
        raise HTTPException(422, "PDF-ja nuk mund të përpunohej.") from exc
    return Response(content, media_type="application/pdf", headers={
        **PRIVATE, "Content-Disposition": f'attachment; filename="olimpiada-material-{doc.id}.pdf"'
    })
