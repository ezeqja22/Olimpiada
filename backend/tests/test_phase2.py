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

    def test_teacher_has_normal_site_access_without_leaking_other_tests(self):
        teacher=models.User(username="p2teacher"+str(self.counter),
                            email="p2teacher"+str(self.counter)+"@example.org",
                            password_hash="unused",role="teacher",is_verified=True,
                            is_active=True,is_banned=False)
        self.db.add(teacher);self.db.flush()
        public=models.Forum(title="Public math",description="Open for all",
                            creator_id=self.admin.id,is_private=False,is_approved=True)
        private=models.Forum(title="Private math",description="Invite only",
                             creator_id=self.admin.id,is_private=True,is_approved=True)
        self.db.add_all([public,private]);self.db.flush()
        now=datetime.utcnow()
        public_test=models.CourseItem(kind="test",title="Someone else's test",
            subject="Mathematics",instructions="Do not preview",body="HIDDEN_TEST_BODY",
            published_at=now-timedelta(minutes=2),due_at=now+timedelta(days=1),
            duration_minutes=15,created_by=self.admin.id,forum_id=public.id)
        private_material=models.CourseItem(kind="material",title="Private material",
            subject="Mathematics",instructions="Private",body="PRIVATE_CONTENT",
            published_at=now-timedelta(minutes=2),created_by=self.admin.id,
            forum_id=private.id)
        self.db.add_all([public_test,private_material]);self.db.commit()
        headers=self.headers(create_jwt(teacher.id,self.db))
        self.assertEqual(self.client.get(f"/auth/forums/{public.id}",headers=headers).status_code,200)
        self.assertEqual(self.client.get(f"/auth/forums/{private.id}",headers=headers).status_code,403)
        catalog=self.client.get("/core/courses/items",headers=headers)
        self.assertEqual(catalog.status_code,200,catalog.text)
        rows={item["id"]: item for item in catalog.json()}
        self.assertIn(public_test.id,rows)
        self.assertIsNone(rows[public_test.id]["body"])
        self.assertNotIn(private_material.id,rows)
        management=self.client.get("/core/courses/admin/items",headers=headers)
        self.assertEqual(management.status_code,200,management.text)
        self.assertNotIn(public_test.id,{item["id"] for item in management.json()})

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
                                json={"approve":True,"score":8},headers=self.headers(self.admin_token))
        self.assertEqual(review.status_code,200,review.text)
        self.assertEqual(self.client.get("/core/weekly/rankings").json()["rankings"], [])
        self.assertEqual(self.client.post(
            f"/core/weekly/admin/submissions/{sub.json()['id']}/review",
            json={"approve":True,"score":11}, headers=self.headers(self.admin_token)).status_code,422)
        w.closes_at=now-timedelta(seconds=1)
        self.db.commit()
        weekly=self.client.get(f"/core/weekly/rankings?week={w.week_date}").json()
        self.assertEqual([(x["rank"],x["points"]) for x in weekly["rankings"]],[(1,8)])
        self.assertEqual(self.client.get("/core/weekly/rankings").json()["rankings"],weekly["rankings"])
        result=run_weekly_transitions(self.db)
        self.assertGreaterEqual(result["published"],1)
        r=self.client.get("/core/weekly")
        self.assertEqual(r.json()["challenge"]["official_solution"],"CONFIDENTIAL_ANSWER_1")
        self.assertTrue(any(u["user_id"]==self.student.id for u in r.json()["challenge"]["winners"]))

    def test_library_only_delivers_images_and_watermarked_training_pdfs(self):
        from io import BytesIO
        import json
        from pypdf import PdfReader
        from reportlab.pdfgen.canvas import Canvas

        pdf = BytesIO()
        canvas = Canvas(pdf)
        for number in range(2):
            canvas.drawString(50, 500, f"Training page {number}")
            canvas.showPage()
        canvas.save()
        data = {"title":"Training notes","subject":"Math","level":"Intermediate",
                "kind":"book","discipline":"Combinatorics"}
        file = {"file":("book.pdf",pdf.getvalue(),"application/pdf")}
        student = self.headers(self.student_token)
        admin = self.headers(self.admin_token)
        url = "/core/library/admin/upload"
        self.assertEqual(self.client.post(url,headers=student,data={"metadata":json.dumps(data)},files=file).status_code,403)
        result = self.client.post(url,headers=admin,data={"metadata":json.dumps(data)},files=file)
        self.assertEqual(result.status_code,201,result.text)
        doc_id = result.json()["id"]
        catalog = self.client.get("/public/library").json()
        doc = next(row for row in catalog if row["id"] == doc_id)
        self.assertEqual(doc["page_count"],2)
        self.assertNotIn("storage_key",doc)
        self.assertNotIn("content",doc)
        url = f"/core/library/{doc_id}"
        self.assertIn(self.client.get(url+"/pages/1").status_code,(401,403))
        page = self.client.get(url+"/pages/1",headers=student)
        self.assertEqual(page.status_code,200,page.text if page.status_code != 200 else "")
        self.assertEqual(page.headers["Content-Type"],"image/jpeg")
        self.assertEqual(page.headers["Cache-Control"],"private, no-store")
        self.assertEqual(self.client.get(url+"/download",headers=student).status_code,403)
        data["kind"] = "training"
        edited = self.client.put(f"/core/library/admin/{doc_id}",headers=admin,data={"metadata":json.dumps(data)})
        self.assertEqual(edited.status_code,200,edited.text)
        download = self.client.get(url+"/download",headers=student)
        self.assertEqual(download.status_code,200)
        pages = PdfReader(BytesIO(download.content)).pages
        self.assertEqual(len(pages),2)
        self.assertTrue(all(f"Olimpiada.al  |  ID {self.student.id}" in p.extract_text() for p in pages))
        data["visible"] = False
        self.client.put(f"/core/library/admin/{doc_id}",headers=admin,data={"metadata":json.dumps(data)})
        self.assertEqual(self.client.get(url+"/pages/1",headers=student).status_code,404)

    def test_olympiad_drafts_are_admin_only(self):
        data = dict(slug="test-olympiad",name="Test Olympiad",acronym="TO",subject="Physics",
                    scope="international",audience="Pupils",importance="The most interesting test",
                    history="This is a test history",steps=["Apply through school"],
                    source_url="https://example.org",published=False)
        url = "/core/olympiads/admin"
        self.assertEqual(self.client.post(url,headers=self.headers(self.student_token),json=data).status_code,403)
        admin = self.headers(self.admin_token)
        result = self.client.post(url,headers=admin,json=data)
        self.assertEqual(result.status_code,201,result.text)
        self.assertEqual(self.client.get("/public/olympiads").json(),[])
        data["published"] = True
        result = self.client.put(f"{url}/{result.json()['id']}",headers=admin,json=data)
        self.assertEqual(result.status_code,200,result.text)
        self.assertEqual(self.client.get("/public/olympiads").json()[0]["slug"],data["slug"])

    def test_timezone_dst(self):
        start,close=weekly_bounds(datetime(2026,3,23).date())
        self.assertEqual((close-start).total_seconds()/3600,155)
        start,close=weekly_bounds(datetime(2026,10,19).date())
        self.assertEqual((close-start).total_seconds()/3600,157)


    def test_retired_attachment_endpoints_are_absent(self):
        self.assertEqual(self.client.post("/core/weekly/1/submit-file",headers=self.headers(self.student_token)).status_code,404)
        self.assertEqual(self.client.get("/core/weekly/admin/submissions/1/attachment",headers=self.headers(self.admin_token)).status_code,404)

if __name__=="__main__":
    unittest.main()
