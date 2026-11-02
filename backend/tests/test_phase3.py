"""Phase 3 integration: teacher onboarding, classroom isolation, support and family consent."""
import io,os,unittest
from datetime import datetime,timedelta
from tempfile import TemporaryDirectory
from PIL import Image
from fastapi.testclient import TestClient
from database import SessionLocal,engine
from main import app
from auth.utils import create_jwt
from models import (Base,User,Forum,TeacherApplication,TeacherForumAssignment,
                    ParentStudentLink,SupportTicket,EmailTemplate,CourseItem,Notification)

def picture():
    b=io.BytesIO();Image.new("RGB",(40,40),(235,235,230)).save(b,"JPEG");return b.getvalue()

class Phase3Tests(unittest.TestCase):
    seq=0
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client=TestClient(app)
        cls.storage=TemporaryDirectory()
        cls.oldstorage=os.environ.get("PRIVATE_FILES_DIR")
        os.environ.pop("S3_PRIVATE_BUCKET",None)
        os.environ["PRIVATE_FILES_DIR"]=cls.storage.name
    @classmethod
    def tearDownClass(cls):
        cls.storage.cleanup()
        if cls.oldstorage is None:os.environ.pop("PRIVATE_FILES_DIR",None)
        else:os.environ["PRIVATE_FILES_DIR"]=cls.oldstorage
    def setUp(self):
        Phase3Tests.seq+=1
        i=Phase3Tests.seq
        self.db=SessionLocal()
        def user(role):
            u=User(username=f"p3_{role}_{i}",email=f"p3_{role}_{i}@example.org",
                   password_hash="unneeded",role=role,is_verified=True,is_active=True,is_banned=False)
            self.db.add(u);self.db.flush();return u
        self.student=user("student");self.parent=user("parent");self.admin=user("admin");self.reviewer=user("reviewer")
        self.teacher=User(username=f"p3_candidate_{i}",email=f"p3_candidate_{i}@example.org",
                          password_hash="unneeded",role="student",is_verified=True,is_active=True,is_banned=False)
        self.db.add(self.teacher);self.db.flush()
        self.a=Forum(title=f"Assigned_{i}",description="A",creator_id=self.admin.id,
                     required_plan="basic",is_private=False,is_approved=True)
        self.b=Forum(title=f"Not_assigned_{i}",description="B",creator_id=self.admin.id,
                     required_plan="basic",is_private=False,is_approved=True)
        self.db.add_all([self.a,self.b]);self.db.commit()
        self.tokens={u.id:create_jwt(u.id,self.db) for u in
                     (self.student,self.parent,self.admin,self.reviewer,self.teacher)}
    def tearDown(self):self.db.close()
    def h(self,user):return {"Authorization":"Bearer "+self.tokens[user.id]}
    def apply(self):
        data={"first_name":"Math","last_name":"Teacher","birth_date":"1994-05-07",
              "subject":"Mathematics","bio":"I have taught olympiad mathematics to pupils for many years."}
        files={"id_photo":("id.jpg",picture(),"image/jpeg"),
               "portrait":("portrait.jpg",picture(),"image/jpeg")}
        return self.client.post("/experience/teacher/apply",data=data,files=files,headers=self.h(self.teacher))

    def test_application_pending_then_admin_approval_and_class_isolation(self):
        r=self.apply();self.assertEqual(r.status_code,200,r.text)
        app_id=r.json()["id"]
        self.assertEqual(self.db.get(TeacherApplication,app_id).status,"pending")
        self.assertEqual(self.db.get(User,self.teacher.id).role,"student")
        self.assertEqual(self.client.get("/experience/admin/teachers",
                           headers=self.h(self.teacher)).status_code,403)
        self.assertEqual(self.client.get("/experience/admin/teachers/"+str(app_id)+"/image/id",
                           headers=self.h(self.teacher)).status_code,403)
        self.assertEqual(self.client.get("/experience/admin/teachers/"+str(app_id)+"/image/id",
                           headers=self.h(self.admin)).status_code,200)
        r=self.client.post("/experience/admin/teachers/"+str(app_id)+"/review",
                           json={"approve":True},headers=self.h(self.admin))
        self.assertEqual(r.status_code,200,r.text)
        self.db.refresh(self.teacher);self.assertEqual(self.teacher.role,"teacher")
        r=self.client.post("/experience/admin/teacher-assignments",
                           json={"teacher_id":self.teacher.id,"forum_id":self.a.id},
                           headers=self.h(self.admin))
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(self.client.get("/auth/forums/"+str(self.a.id),
                           headers=self.h(self.teacher)).status_code,200)
        self.assertEqual(self.client.get("/auth/forums/"+str(self.b.id),
                           headers=self.h(self.teacher)).status_code,403)
        self.assertEqual(self.client.get("/auth/problems/",headers=self.h(self.teacher)).status_code,403)
        self.assertEqual(self.client.get("/admin/users",headers=self.h(self.teacher)).status_code,403)
        self.assertEqual(self.client.get("/core/library/catalog").status_code,200)
        self.assertEqual(self.client.get("/experience/teacher/classes",
                           headers=self.h(self.teacher)).status_code,200)

    def test_site_content_editor_admin_only_and_public_bilingual_copy(self):
        from unittest.mock import patch
        endpoint = "/experience/admin/content/home_intro"
        payload = {"title_sq":"Sfidat e tua", "title_en":"Your challenges",
                   "subtitle_sq":"Eksploro materialet dhe forumin.",
                   "subtitle_en":"Explore exercises and discussions.",
                   "image_url":"", "button_url":""}
        self.assertEqual(self.client.put(endpoint,json=payload,headers=self.h(self.student)).status_code,403)
        self.assertEqual(self.client.put(endpoint,json=payload,headers=self.h(self.reviewer)).status_code,403)
        saved = self.client.put(endpoint,json=payload,headers=self.h(self.admin))
        self.assertEqual(saved.status_code,200,saved.text)
        response = self.client.get("/experience/content")
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json()["home_intro"]["title_sq"],"Sfidat e tua")
        self.assertEqual(response.json()["home_intro"]["title_en"],"Your challenges")
        self.assertEqual(self.client.put("/experience/admin/content/unknown_section",
                         json=payload,headers=self.h(self.admin)).status_code,422)
        for invalid in ["javascript:alert(1)","//bad.example/image.jpg", "/\\\\evil.png"]:
            attempt = {**payload,"image_url":invalid}
            self.assertEqual(self.client.put(endpoint,json=attempt,
                             headers=self.h(self.admin)).status_code,422)
        attempt = {**payload,"button_url":"//bad.example"}
        self.assertEqual(self.client.put(endpoint,json=attempt,
                         headers=self.h(self.admin)).status_code,422)
        with patch.dict(os.environ,{"STAGING_MODE":"1",
                                   "STAGING_PUBLIC_API_URL":"http://127.0.0.1:8001"}):
            uploaded=self.client.post("/experience/admin/branding/upload",
                                      files={"file":("test.jpg",picture(),"image/jpeg")},
                                      headers=self.h(self.admin))
            self.assertEqual(uploaded.status_code,200,uploaded.text)
            local_url=uploaded.json()["url"]
            self.assertTrue(local_url.startswith("http://127.0.0.1:8001/experience/staging/branding/"))
            image_saved=self.client.put(endpoint,json={**payload,"image_url":local_url},
                                         headers=self.h(self.admin))
            self.assertEqual(image_saved.status_code,200,image_saved.text)
            from urllib.parse import urlparse
            loaded=self.client.get(urlparse(local_url).path)
            self.assertEqual(loaded.status_code,200)
            self.assertEqual(loaded.headers["content-type"],"image/jpeg")

    def test_student_cannot_become_teacher_by_submitting(self):
        self.assertEqual(self.apply().status_code,200)
        self.assertEqual(self.apply().status_code,409)
        self.assertEqual(self.db.get(User,self.teacher.id).role,"student")

    def test_faq_and_support_are_public_but_admin_review_is_private(self):
        self.assertEqual(self.client.get("/experience/faq").status_code,200)
        r=self.client.post("/experience/support/tickets",
                           json={"name":"Student","email":"any@example.org","category":"technical",
                                 "subject":"Login broken","message":"Please help me sign in to my account."})
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(self.client.get("/experience/admin/tickets",
                           headers=self.h(self.student)).status_code,403)
        self.assertEqual(self.client.get("/experience/admin/tickets",
                           headers=self.h(self.admin)).status_code,200)

    def test_parent_and_student_must_both_accept_reports(self):
        new=self.client.post("/experience/admin/parent-links",
                             json={"parent_id":self.parent.id,"student_id":self.student.id},
                             headers=self.h(self.admin))
        self.assertEqual(new.status_code,200,new.text)
        id=new.json()["id"]
        blocked=self.client.post("/experience/admin/parent-reports/"+str(id),
                                 data={"report":"Student has improved a great deal."},
                                 headers=self.h(self.admin))
        self.assertEqual(blocked.status_code,403)
        accepted=self.client.post("/experience/parent/links/"+str(id)+"/accept",
                                  headers=self.h(self.parent))
        self.assertEqual(accepted.status_code,200)
        self.assertEqual(self.db.get(ParentStudentLink,id).status,"parent_accepted")
        self.assertEqual(self.client.post("/experience/admin/parent-reports/"+str(id),
                         data={"report":"Confidential progress report."},
                         headers=self.h(self.admin)).status_code,403)
        approved=self.client.post("/experience/student/parent-links/"+str(id)+"/approve?approve=true",
                                  headers=self.h(self.student))
        self.assertEqual(approved.status_code,200)
        self.assertEqual(self.db.get(ParentStudentLink,id).status,"approved")

    def test_branding_and_templates_require_staff(self):
        data={"title_sq":"Provo Olimpiadën","title_en":"Try Olympiads",
              "subtitle_sq":"Një vend për të mësuar","subtitle_en":"A place to learn",
              "image_url":"https://res.cloudinary.com/example/hero.webp","button_url":"/weekly"}
        denied=self.client.put("/experience/admin/content/hero",json=data,
                               headers=self.h(self.student))
        self.assertEqual(denied.status_code,403)
        result=self.client.put("/experience/admin/content/hero",json=data,
                               headers=self.h(self.admin))
        self.assertEqual(result.status_code,200,result.text)
        self.assertEqual(self.client.get("/experience/content").json()["hero"]["title_sq"],data["title_sq"])
        self.assertEqual(self.client.get("/experience/admin/templates",
                           headers=self.h(self.student)).status_code,403)
        self.assertEqual(self.client.get("/experience/admin/templates",
                           headers=self.h(self.admin)).status_code,200)
        invalid=self.client.put("/experience/admin/templates/new_homework",
          json={"key":"new_homework","subject_sq":"Hello {{unsafe}}","subject_en":"Hello",
                "body_sq":"Test body","body_en":"Test body","active":True},headers=self.h(self.admin))
        self.assertEqual(invalid.status_code,422,invalid.text)


    def test_paid_student_cannot_read_unassigned_private_classroom(self):
        self.student.subscription_plan = "medium"
        self.student.subscription_expires_at = datetime.utcnow() + timedelta(days=14)
        private_forum = Forum(title="Private class",description="Private",
                              creator_id=self.admin.id,is_private=True,
                              is_approved=True,required_plan="medium")
        self.db.add(private_forum)
        self.db.flush()
        item = CourseItem(kind="test",title="Hidden Exam",subject="Mathematics",
                          forum_id=private_forum.id,body="SECRET_PRIVATE_MATH",
                          published_at=datetime.utcnow()-timedelta(minutes=2),
                          due_at=datetime.utcnow()+timedelta(hours=1),
                          duration_minutes=40,created_by=self.admin.id)
        self.db.add(item)
        self.db.commit()
        catalog = self.client.get("/core/courses/items",headers=self.h(self.student))
        self.assertEqual(catalog.status_code,200,catalog.text)
        self.assertFalse(any(r["id"]==item.id for r in catalog.json()))
        attempt = self.client.post(f"/core/courses/items/{item.id}/start",headers=self.h(self.student))
        self.assertEqual(attempt.status_code,403,attempt.text)
        submission = self.client.post(f"/core/courses/items/{item.id}/submit",
                         json={"answers":"guessed"},headers=self.h(self.student))
        self.assertEqual(submission.status_code,403,submission.text)

    def test_email_template_deactivation_prevents_both_notice_and_email(self):
        from phase3_service import enqueue_notice
        disabled=EmailTemplate(key="new_homework",subject_sq="Do not send",
                               subject_en="Do not send",body_sq="Blocked notice",
                               body_en="Blocked notice",active=False)
        self.db.add(disabled)
        self.db.commit()
        before=self.db.query(Notification).filter_by(user_id=self.student.id).count()
        result=enqueue_notice(self.db,self.student,"new_homework",{"name":"Student","title":"Task"})
        self.assertFalse(result)
        self.db.commit()
        after=self.db.query(Notification).filter_by(user_id=self.student.id).count()
        self.assertEqual(after,before)


    def test_language_preference_localizes_notifications(self):
        from unittest.mock import patch
        from phase3_service import enqueue_notice
        saved=self.client.put("/experience/language",json={"language":"en"},
                              headers=self.h(self.student))
        self.assertEqual(saved.status_code,200,saved.text)
        self.db.refresh(self.student)
        self.assertEqual(self.student.preferred_language,"en")
        self.assertEqual(self.client.get("/experience/language",
                          headers=self.h(self.student)).json()["language"],"en")
        invalid=self.client.put("/experience/language",json={"language":"de"},
                                 headers=self.h(self.student))
        self.assertEqual(invalid.status_code,422)
        with patch("phase3_service.email_service.send_notification_email",return_value=True) as mail:
            result=enqueue_notice(self.db,self.student,"new_test",
                                  {"name":"Student","title":"Algebra","link":"/courses"})
            self.assertTrue(result)
            self.db.commit()
            self.assertEqual(mail.call_count,1)
            self.assertTrue(mail.call_args.args[1].startswith("New test"))
            self.assertIn("Hello",mail.call_args.args[2])
        record=self.db.query(Notification).filter_by(user_id=self.student.id,type="new_test").first()
        self.assertTrue(record and record.title.startswith("New test"))


    def test_reviewer_cannot_access_admin_teacher_ids_templates_or_parent_reports(self):
        paths=("/experience/admin/teachers", "/experience/admin/templates",
               "/experience/admin/faq", "/experience/admin/parent-links",
               "/experience/admin/tickets")
        for path in paths:
            denied=self.client.get(path,headers=self.h(self.reviewer))
            self.assertEqual(denied.status_code,403,(path,denied.text))
        form={"title_sq":"Një titull","title_en":"A title"}
        denied=self.client.put("/experience/admin/content/hero",
                               json=form,headers=self.h(self.reviewer))
        self.assertEqual(denied.status_code,403,denied.text)

    def test_teacher_can_publish_only_in_assigned_class_and_cannot_admin_forum(self):
        r=self.apply();self.assertEqual(r.status_code,200,r.text)
        application_id=r.json()["id"]
        review=self.client.post("/experience/admin/teachers/"+str(application_id)+"/review",
            json={"approve":True},headers=self.h(self.admin))
        self.assertEqual(review.status_code,200,review.text)
        assigned=self.client.post("/experience/admin/teacher-assignments",
            json={"teacher_id":self.teacher.id,"forum_id":self.a.id},headers=self.h(self.admin))
        self.assertEqual(assigned.status_code,200,assigned.text)
        self.db.refresh(self.teacher)
        self.assertEqual(self.client.get("/auth/forums/"+str(self.b.id),
            headers=self.h(self.teacher)).status_code,403)
        # Teacher does not inherit forum moderator actions even when assigned a classroom.
        critical=(f"/auth/forums/{self.a.id}/members/{self.student.id}/ban",
                  f"/auth/forums/{self.a.id}/invite",
                  f"/auth/forums/{self.a.id}/messages/1/pin")
        for path in critical:
            response=self.client.post(path,json={},headers=self.h(self.teacher))
            self.assertEqual(response.status_code,403,(path,response.text))
        now=datetime.utcnow()
        payload={"kind":"homework","title":"Private class homework","subject":"Mathematics",
                 "instructions":"Homework","body":"Find all solutions",
                 "published_at":(now-timedelta(minutes=1)).isoformat(),
                 "due_at":(now+timedelta(hours=2)).isoformat()}
        denied=self.client.post("/core/courses/admin/items",
            json={**payload,"forum_id":self.b.id},headers=self.h(self.teacher))
        self.assertEqual(denied.status_code,403,denied.text)
        allowed=self.client.post("/core/courses/admin/items",
            json={**payload,"forum_id":self.a.id},headers=self.h(self.teacher))
        self.assertEqual(allowed.status_code,200,allowed.text)
        item_id=allowed.json()["id"]
        self.assertEqual(self.db.get(CourseItem,item_id).forum_id,self.a.id)

    def test_scheduled_notices_respect_paid_forum_tiers_and_do_not_duplicate(self):
        from unittest.mock import patch
        from models import ForumMembership, ContentEventDelivery
        from phase3_jobs import send_due_learning_notices
        self.student.subscription_plan="medium"
        self.student.subscription_expires_at=datetime.utcnow()+timedelta(days=15)
        self.a.required_plan="premium"
        self.db.add(ForumMembership(forum_id=self.a.id,user_id=self.student.id,
                                    role="member",is_active=True,is_banned=False))
        item=CourseItem(kind="homework",title="Premium-only homework",subject="Math",
                        instructions="Solve",body="Hidden prompt",
                        forum_id=self.a.id,created_by=self.admin.id,
                        published_at=datetime.utcnow()-timedelta(minutes=3))
        self.db.add(item);self.db.commit()
        with patch("phase3_jobs.enqueue_notice") as notice:
            # Other Phase 3 tests share this ephemeral test DB and may have due items.
            own=lambda: self.db.query(ContentEventDelivery).filter_by(
                event_key="course:"+str(item.id),recipient_user_id=self.student.id).count()
            send_due_learning_notices(self.db)
            self.assertEqual(own(),0)
            self.a.required_plan="medium"
            self.db.commit()
            send_due_learning_notices(self.db)
            self.assertEqual(own(),1)
            send_due_learning_notices(self.db)
            self.assertEqual(own(),1)
            relevant=[call for call in notice.call_args_list
                      if call.args[1].id==self.student.id and
                      call.args[3].get("title")=="Premium-only homework"]
            self.assertEqual(len(relevant),1)

    def test_admin_can_hide_all_faq_without_default_entries_appearing(self):
        from models import FaqEntry
        faq=FaqEntry(category="Privacy",
                     question_sq="A mund të çaktivizohen pyetjet?",
                     answer_sq="Po, administratori mund t'i çaktivizojë.",
                     question_en="Can FAQ items be disabled?",
                     answer_en="Yes, an admin can disable them.",
                     active=False,position=500)
        self.db.add(faq);self.db.commit()
        response=self.client.get("/experience/faq")
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json(),[])

if __name__=="__main__":unittest.main()
