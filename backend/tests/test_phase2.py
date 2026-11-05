"""Phase 2 regression tests: membership, test timing and weekly embargo."""
import unittest
from datetime import datetime, timedelta
from tempfile import TemporaryDirectory
from pathlib import Path
import os
from fastapi.testclient import TestClient
from database import SessionLocal, engine
import models
from main import app
from auth.utils import create_jwt
from phase2_service import weekly_bounds, run_weekly_transitions

class CoreTests(unittest.TestCase):
    counter = 0

    @classmethod
    def setUpClass(cls):
        models.Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self):
        CoreTests.counter += 1
        i = CoreTests.counter
        self.db = SessionLocal()
        self.student = models.User(username="p2student"+str(i),email="p2student"+str(i)+"@example.org",
                                  password_hash="unused",role="student",is_verified=True,is_active=True,
                                  is_banned=False)
        self.admin = models.User(username="p2admin"+str(i),email="p2admin"+str(i)+"@example.org",
                                password_hash="unused",role="admin",is_verified=True,is_active=True,
                                is_banned=False)
        self.db.add_all([self.student, self.admin])
        self.db.commit()
        self.student_token = create_jwt(self.student.id,self.db)
        self.admin_token = create_jwt(self.admin.id,self.db)

    def tearDown(self):
        self.db.close()

    def headers(self,token):
        return {"Authorization":"Bearer "+token}

    def test_forum_access_uses_membership_and_bans_not_tiers(self):
        forum=models.Forum(title="Forum",description="Discussion",creator_id=self.admin.id,
                           is_private=False,is_approved=True,required_plan="premium")
        self.db.add(forum);self.db.commit()
        headers=self.headers(self.student_token)
        catalog=self.client.get("/core/forums/catalog",headers=headers)
        row=next(f for f in catalog.json() if f["id"]==forum.id)
        self.assertTrue(row["accessible"])
        self.assertNotIn("required_plan",row)
        url="/auth/forums/"+str(forum.id)
        self.assertEqual(self.client.get(url,headers=headers).status_code,200)
        forum.is_private=True; self.db.commit()
        self.assertEqual(self.client.get(url,headers=headers).status_code,403)
        member=models.ForumMembership(forum_id=forum.id,user_id=self.student.id,
                                      role="member",is_active=True,is_banned=False)
        self.db.add(member);self.db.commit()
        self.assertEqual(self.client.get(url,headers=headers).status_code,200)
        member.is_banned=True;self.db.commit()
        self.assertEqual(self.client.get(url,headers=headers).status_code,403)

    def test_student_can_create_and_edit_own_forum_like_master(self):
        headers=self.headers(self.student_token)
        r=self.client.post("/auth/forums",json={"title":"Student forum","description":"Discussion","is_private":False},headers=headers)
        self.assertEqual(r.status_code,200,r.text)
        fid=r.json()["id"]
        r=self.client.put(f"/auth/forums/{fid}",json={"title":"Updated title"},headers=headers)
        self.assertEqual(r.status_code,200,r.text)
        other=models.Forum(title="Other owner",description="Private",creator_id=self.admin.id,is_private=False,is_approved=True)
        self.db.add(other);self.db.commit()
        r=self.client.put(f"/auth/forums/{other.id}",json={"title":"Not mine"},headers=headers)
        self.assertEqual(r.status_code,403,r.text)

    def test_scheduled_test_content_hidden_until_start(self):
        now=datetime.utcnow()
        item=models.CourseItem(kind="test",title="Exam",subject="Mathematics",instructions="Timer",
                               body="SECRET_EXAM_42",published_at=now-timedelta(minutes=1),
                               due_at=now+timedelta(hours=2),duration_minutes=30,created_by=self.admin.id)
        self.db.add(item);self.db.commit()
        r=self.client.get("/core/courses/items",headers=self.headers(self.student_token))
        self.assertEqual(r.status_code,200,r.text)
        self.assertIsNone(next(x for x in r.json() if x["id"]==item.id)["body"])
        start=self.client.post("/core/courses/items/"+str(item.id)+"/start",
                               headers=self.headers(self.student_token))
        self.assertEqual(start.status_code,200,start.text)
        self.assertEqual(start.json()["body"],"SECRET_EXAM_42")
        attempt=self.db.query(models.CourseAttempt).filter_by(
            item_id=item.id,student_id=self.student.id).first()
        attempt.started_at=now-timedelta(minutes=40)
        self.db.commit()
        late=self.client.post("/core/courses/items/"+str(item.id)+"/submit",
                              json={"answers":"42"},headers=self.headers(self.student_token))
        self.assertEqual(late.status_code,409,late.text)

    def test_weekly_solution_private_until_publish(self):
        now=datetime.utcnow()
        p=models.Problem(title="Weekly test",description="Solve x + 1 = 2",
                         author_id=self.admin.id,subject="Mathematics",level="School")
        self.db.add(p);self.db.flush()
        w=models.WeeklyChallenge(week_date="2030-05-06",problem_id=p.id,
                                 starts_at=now-timedelta(seconds=30),closes_at=now+timedelta(days=1),
                                 official_solution="CONFIDENTIAL_ANSWER_1",status="open",
                                 created_by=self.admin.id)
        self.db.add(w);self.db.commit()
        r=self.client.get("/core/weekly")
        self.assertEqual(r.status_code,200,r.text)
        self.assertIsNone(r.json()["challenge"]["official_solution"])
        sub=self.client.post("/core/weekly/"+str(w.id)+"/submit",json={"answer":"x=1"},
                             headers=self.headers(self.student_token))
        self.assertEqual(sub.status_code,200,sub.text)
        review=self.client.post("/core/weekly/admin/submissions/"+str(sub.json()["id"])+"/review",
                                json={"approve":True},headers=self.headers(self.admin_token))
        self.assertEqual(review.status_code,200,review.text)
        w.closes_at=now-timedelta(seconds=1)
        self.db.commit()
        result=run_weekly_transitions(self.db)
        self.assertGreaterEqual(result["published"],1)
        r=self.client.get("/core/weekly")
        self.assertEqual(r.json()["challenge"]["official_solution"],"CONFIDENTIAL_ANSWER_1")
        self.assertTrue(any(u["user_id"]==self.student.id for u in r.json()["challenge"]["winners"]))

    def test_pdf_catalog_no_private_keys_and_reader_requires_login(self):
        doc=models.LibraryDocument(title="Scan",category="olympiad_scan",subject="Mathematics",
                                   level="advanced",olympiad="IMO",year=2026,
                                   storage_key="library/private-123.pdf",page_count=1,uploaded_by=self.admin.id)
        self.db.add(doc);self.db.commit()
        r=self.client.get("/core/library/catalog")
        self.assertEqual(r.status_code,200,r.text)
        item=next(x for x in r.json() if x["id"]==doc.id)
        self.assertNotIn("storage_key",item)
        self.assertNotIn("page_count",item)
        self.assertEqual(self.client.get("/core/library/"+str(doc.id)+"/pages/1").status_code,401)
        from unittest.mock import patch
        with patch("phase2_routes.get_private_pdf",return_value=b"fake-pdf"), patch("phase2_routes.render_watermarked_page",return_value=b"RIFFtest"):
            page=self.client.get("/core/library/"+str(doc.id)+"/pages/1",headers=self.headers(self.student_token))
            self.assertEqual(page.status_code,200,page.text)

    def test_timezone_dst(self):
        start,close=weekly_bounds(datetime(2026,3,23).date())
        self.assertEqual((close-start).total_seconds()/3600,155)
        start,close=weekly_bounds(datetime(2026,10,19).date())
        self.assertEqual((close-start).total_seconds()/3600,157)


    def test_weekly_attachment_is_private(self):
        from PIL import Image
        from tempfile import TemporaryDirectory
        from io import BytesIO
        now=datetime.utcnow()
        p=models.Problem(title="Attachment challenge",description="Show work",
                         author_id=self.admin.id,subject="Mathematics")
        self.db.add(p);self.db.flush()
        w=models.WeeklyChallenge(week_date="2033-05-02",problem_id=p.id,
                                starts_at=now-timedelta(hours=1),
                                closes_at=now+timedelta(hours=4),
                                official_solution="Private answer",status="open",
                                created_by=self.admin.id)
        self.db.add(w);self.db.commit()
        img=BytesIO();Image.new("RGB",(16,16),"white").save(img,format="PNG")
        with TemporaryDirectory() as folder:
            before=os.environ.get("PRIVATE_FILES_DIR")
            os.environ["PRIVATE_FILES_DIR"]=folder
            try:
                r=self.client.post("/core/weekly/"+str(w.id)+"/submit-file",
                    data={"answer":"Attached"},files={"file":("solution.png",img.getvalue(),"image/png")},
                    headers=self.headers(self.student_token))
                self.assertEqual(r.status_code,200,r.text)
                attachment="/core/weekly/admin/submissions/"+str(r.json()["id"])+"/attachment"
                denied=self.client.get(attachment,headers=self.headers(self.student_token))
                self.assertEqual(denied.status_code,403,denied.text)
                allowed=self.client.get(attachment,headers=self.headers(self.admin_token))
                self.assertEqual(allowed.status_code,200,allowed.text[:100])
                self.assertEqual(allowed.headers["content-type"],"image/png")
                self.assertEqual(self.client.get(attachment).status_code,401)
            finally:
                if before is None:os.environ.pop("PRIVATE_FILES_DIR",None)
                else:os.environ["PRIVATE_FILES_DIR"]=before

    def test_private_pdf_canvas_page_watermark(self):
        from PIL import Image
        from tempfile import TemporaryDirectory
        from io import BytesIO
        self.db.commit()
        pdf=BytesIO();Image.new("RGB",(200,200),"white").save(pdf,format="PDF")
        with TemporaryDirectory() as folder:
            previous=os.environ.get("PRIVATE_FILES_DIR")
            os.environ["PRIVATE_FILES_DIR"]=folder
            try:
                r=self.client.post("/core/library/admin/upload",
                    data={"title":"Sample scan","category":"olympiad_scan","subject":"Mathematics","level":"advanced","year":"2026"},
                    files={"file":("sample.pdf",pdf.getvalue(),"application/pdf")},
                    headers=self.headers(self.admin_token))
                self.assertEqual(r.status_code,200,r.text)
                id=r.json()["id"]
                page=self.client.get("/core/library/"+str(id)+"/pages/1",
                    headers=self.headers(self.student_token))
                self.assertEqual(page.status_code,200,page.text[:150] if page.status_code!=200 else "")
                self.assertEqual(page.headers["content-type"],"image/webp")
                self.assertTrue(page.content.startswith(b"RIFF"))
                self.assertEqual(page.headers["cache-control"],"private, no-store, max-age=0")
            finally:
                if previous is None:os.environ.pop("PRIVATE_FILES_DIR",None)
                else:os.environ["PRIVATE_FILES_DIR"]=previous

if __name__=="__main__":
    unittest.main()
