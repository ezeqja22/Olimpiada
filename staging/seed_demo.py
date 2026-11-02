"""Synthetic test records only. Refuses to run unless STAGING_MODE=1."""
import io
import os
import secrets
from datetime import datetime, timedelta, date
from PIL import Image, ImageDraw
from database import SessionLocal
from auth.utils import hash_password
from models import (User,Forum,ForumMembership,TeacherApplication,TeacherForumAssignment,
                    Problem,WeeklyChallenge,CourseItem,LibraryDocument)
from phase2_service import current_week_date,weekly_bounds
from private_pdf_storage import put_private_pdf, _local_root

if os.getenv("STAGING_MODE") != "1":
    raise SystemExit("Refusing to seed a non-staging database")

users = [
    ("admin", "admin"),
    ("free", "student"),
    ("basic", "student"),
    ("medium", "student"),
    ("premium", "student"),
    ("teacher", "teacher")
]
with SessionLocal() as db:
    if db.query(User).filter(User.email.like("demo-%@example.com")).first():
        print("Demo accounts already exist. Existing passwords and data are preserved.")
        raise SystemExit(0)

    created={}
    credentials=[]
    now=datetime.utcnow()
    for short,role in users:
        password=secrets.token_urlsafe(13)
        account=User(username="demo-"+short,email=f"demo-{short}@example.com",
                     password_hash=hash_password(password),role=role,
                     is_active=True,is_verified=True,is_banned=False,
                     preferred_language="sq")
        if short in ("basic","medium","premium"):
            account.subscription_plan=short
            account.subscription_expires_at=now+timedelta(days=40)
        db.add(account)
        db.flush()
        created[short]=account
        credentials.append((account.email,password))
    db.commit()

    basic=Forum(title="Forumi i Ushtrimeve Basic",description="Komente dhe ushtrime për Basic",
                creator_id=created["admin"].id,subject="Matematikë",required_plan="basic",
                is_private=False,is_approved=True)
    medium=Forum(title="Klasa e Algjebrës",description="Forum i mësuesit për abonentët Medium",
                 creator_id=created["admin"].id,subject="Matematikë",required_plan="medium",
                 is_private=False,is_approved=True)
    premium=Forum(title="Klasa Premium",description="Për abonentët Premium",
                  creator_id=created["admin"].id,subject="Matematikë",required_plan="premium",
                  is_private=False,is_approved=True)
    db.add_all([basic,medium,premium])
    db.flush()
    db.add(ForumMembership(forum_id=medium.id,user_id=created["teacher"].id,
                           role="member",is_active=True,is_banned=False))
    db.add(TeacherForumAssignment(teacher_id=created["teacher"].id,forum_id=medium.id,
                                  assigned_by=created["admin"].id,created_at=now))

    doc_img=Image.new("RGB",(640,400),"#ebf5f8")
    draw=ImageDraw.Draw(doc_img)
    draw.text((36,80),"SYNTHETIC TEST DOCUMENT",fill="#174862")
    draw.text((36,125),"Not a real ID. No personal data.",fill="#174862")
    buf=io.BytesIO();doc_img.save(buf,"JPEG",quality=75)
    photo_keys=[]
    private=_local_root()
    for key in ("id","portrait"):
        path=private/"teacher-review"/("demo-"+key+".jpg")
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(buf.getvalue())
        photo_keys.append("teacher-review/demo-"+key+".jpg")
    db.add(TeacherApplication(user_id=created["teacher"].id,first_name="Demo",
                              last_name="Teacher",birth_date=date(1990,6,10),
                              bio="Synthetic teacher profile for isolated staging only.",
                              subject="Mathematics",id_photo_key=photo_keys[0],
                              portrait_key=photo_keys[1],status="approved",
                              submitted_at=now,reviewed_by=created["admin"].id,
                              reviewed_at=now))
    problem=Problem(title="Problema e Javës — Demo",
                    description="Gjeni të gjithë numrat e plotë $x$ të tillë që $x^2-5x+6=0$.",
                    subject="Mathematics",level="School",author_id=created["admin"].id)
    db.add(problem);db.flush()
    monday=current_week_date()
    start,close=weekly_bounds(monday)
    db.add(WeeklyChallenge(week_date=monday.isoformat(),problem_id=problem.id,
                           starts_at=start,closes_at=close,
                           official_solution="Faktorizimi: $(x-2)(x-3)=0$, pra $x=2$ ose $x=3$.",
                           status="open" if now<close else "published",
                           published_at=close if now>=close else None,
                           created_by=created["admin"].id))
    db.add(CourseItem(kind="material",title="Identitetet bazë",subject="Mathematics",
                      instructions="Lexo materialin",body="$a^2-b^2=(a-b)(a+b)$",
                      published_at=now-timedelta(hours=1),created_by=created["admin"].id))
    db.add(CourseItem(kind="test",title="Test Algjebre — Demo",subject="Mathematics",
                      instructions="Test 15 minuta",body="Zgjidh $x^2-5x+6=0$.",
                      published_at=now-timedelta(minutes=2),due_at=now+timedelta(days=5),
                      duration_minutes=15,created_by=created["admin"].id))
    book=Image.new("RGB",(850,1100),"white")
    brush=ImageDraw.Draw(book)
    brush.text((65,120),"OLIMPIADA — DEMO BOOKLET",fill="black")
    brush.text((65,180),"Staging only. Synthetic educational content.",fill="black")
    brush.text((65,265),"Problem: Find all integer solutions of x^2 - 5x + 6 = 0.",fill="black")
    pdf=io.BytesIO();book.save(pdf,format="PDF",resolution=110.0)
    pdf_key=put_private_pdf(pdf.getvalue())
    db.add(LibraryDocument(title="Booklet Demo",category="booklet",subject="Mathematics",
                           level="school",year=2026,storage_key=pdf_key,page_count=1,
                           uploaded_by=created["admin"].id))
    db.commit()
    print("Synthetic demo accounts created. Passwords are shown ONLY here:")
    for email,password in credentials:
        print("    ",email,"=>",password)
    print("Docker-only test inbox: http://localhost:8025 (not available in no-Docker mode)")
