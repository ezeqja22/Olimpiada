"""One-shot release check inside backend-staging. Uses the deployed HTTP API."""
import io
import json
import os
import secrets
from datetime import date, datetime, timedelta

import httpx
from pypdf import PdfWriter
from sqlalchemy import text
from auth.utils import hash_password
from database import SessionLocal, engine
from models import (LibraryDocument, LibraryFile, Problem, User, UserSession,
                    WeeklyChallenge, WeeklySubmission)

def check():
    assert os.environ["RAILWAY_ENVIRONMENT_ID"] == "75c8fa64-c641-43af-a149-afe2308513ba"
    assert os.environ["RAILWAY_SERVICE_ID"] == "bf2c9d30-379e-45be-96ec-45c404cbb30b"
    assert engine.url.host == "postgres.railway.internal"
    origin = "https://science-pioneers-394kqgx57-enio-zeqjas-projects.vercel.app"
    tag = "uxgate-" + secrets.token_hex(5)
    ids = {}
    logins = {}
    ids_by_model = []
    with httpx.Client(base_url="https://backend-staging-staging-068c.up.railway.app", headers={"Origin": origin}, timeout=25) as client:
        def call(method, path, status, **kw):
            r = client.request(method, path, **kw)
            assert r.status_code == status, (method, path, r.status_code)
            assert r.headers.get("access-control-allow-origin") == origin
            return r
        try:
            with SessionLocal.begin() as db:
                assert db.execute(text("select version_num from public.alembic_version")).scalar_one() == "88f2703"
                for role in ("admin", "student"):
                    password = secrets.token_urlsafe(32)
                    name = tag + "-" + role
                    u = User(username=name,email=name+"@example.org",password_hash=hash_password(password),role=role,is_verified=True,is_active=True,is_banned=False)
                    db.add(u)
                    db.flush()
                    ids[role] = u.id
                    logins[role] = dict(email=u.email,password=password)
                p = Problem(title="[UX-TEST] "+tag,description="Synthetic",subject="Math",author_id=ids["admin"])
                db.add(p)
                db.flush()
                ids["problem"] = p.id
                # Unused historical Monday avoids displacing the current weekly challenge.
                week = date(2000,1,3) + timedelta(weeks=secrets.randbelow(900))
                assert not db.query(WeeklyChallenge.id).filter_by(week_date=week.isoformat()).first()
                start = datetime.combine(week,datetime.min.time())
                c = WeeklyChallenge(week_date=week.isoformat(),problem_id=p.id,starts_at=start,closes_at=start+timedelta(days=6),official_solution=tag,status="closed",created_by=ids["admin"])
                db.add(c)
                db.flush()
                sub = WeeklySubmission(challenge_id=c.id,student_id=ids["student"],answer_text=tag)
                db.add(sub)
                db.flush()
                ids.update(challenge=c.id,submission=sub.id)
            auth = {role: {"Authorization":"Bearer "+call("POST","/auth/login",200,json=data).json()["token"]} for role,data in logins.items()}
            pdf = PdfWriter()
            pdf.add_blank_page(width=144,height=200)
            buf = io.BytesIO()
            pdf.write(buf)
            meta = dict(title=tag,kind="book",subject="Math",discipline="Geometry",level="School",visible=True)
            doc = call("POST","/core/library/admin/upload",201,headers=auth["admin"],data={"metadata":json.dumps(meta)},files={"file":("test.pdf",buf.getvalue(),"application/pdf")}).json()
            ids["document"] = doc["id"]
            page = call("GET",f"/core/library/{doc['id']}/pages/1",200,headers=auth["student"])
            assert page.content.startswith(b"\xff\xd8") and "no-store" in page.headers["cache-control"]
            print("Protected JPEG read PASS", len(page.content), flush=True)
            publish = f"/core/weekly/admin/{ids['challenge']}/publish"
            call("POST",publish,409,headers=auth["admin"])
            reviewed = call("POST",f"/core/weekly/admin/submissions/{ids['submission']}/review",200,headers=auth["admin"],json={"approve":True,"score":8,"note":""}).json()
            assert reviewed["score"] == 8 and reviewed["status"] == "approved"
            ranks="/core/weekly/rankings?week="+week.isoformat()
            call("GET",ranks,404)
            assert call("POST",publish,200,headers=auth["admin"]).json()["status"]=="published"
            row, = call("GET",ranks,200).json()["rankings"]
            assert row["username"]==tag+"-student" and row["points"]==8 and row["rank"]==1
            print("Weekly pending gate, grading, publication and ranking PASS",flush=True)
        finally:
            with SessionLocal.begin() as db:
                # Also recover the exact upload if its successful HTTP response was lost.
                members=[i for role,i in ids.items() if role in ("student","admin")]
                docs=[d.id for d in db.query(LibraryDocument.id).filter_by(uploaded_by=ids.get("admin"),title=tag)]
                sessions=[s.id for s in db.query(UserSession.id).filter(UserSession.user_id.in_(members))]
                ids_by_model=[(LibraryFile,LibraryFile.document_id,docs),(LibraryDocument,LibraryDocument.id,docs),(WeeklySubmission,WeeklySubmission.id,[ids.get("submission")]),(WeeklyChallenge,WeeklyChallenge.id,[ids.get("challenge")]),(Problem,Problem.id,[ids.get("problem")]),(UserSession,UserSession.id,sessions),(User,User.id,members)]
                for model,key,values in ids_by_model:
                    db.query(model).filter(key.in_(values)).delete(synchronize_session=False)
            with SessionLocal() as db:
                assert all(db.query(model).filter(key.in_(values)).count()==0 for model,key,values in ids_by_model)
            print("Cleanup verified, zero remaining",ids,flush=True)

if __name__ == "__main__":
    check()
