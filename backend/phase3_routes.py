"""Phase 3 teacher, support, FAQ, email-template, notification and branding routes."""
from datetime import date, datetime
from fastapi import APIRouter, Depends, Form, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database import get_db
from auth.dependencies import get_current_user, get_verified_user
from models import (User, TeacherApplication, TeacherForumAssignment, Forum, TeacherSubject,
    SiteContentBlock, EmailTemplate, EmailDeliveryLog, ParentStudentLink,
    CourseItem, CourseAttempt, ContentEventDelivery)
from phase1_service import require_staff, is_staff
from phase2_service import can_enter_forum
from phase3_service import (
    TEMPLATE_DEFAULTS,validate_template,enqueue_notice,render)
from pydantic import ConfigDict

router=APIRouter(prefix="/experience",tags=["phase3"])

def require_admin(user):
    # Reviewers cannot manage teacher applications,
    # parent reports, branding, support or email broadcast.
    if user.role not in ("admin", "super_admin") and not user.is_superuser:
        raise HTTPException(403, "Admin role required")
    return user


class Decision(BaseModel):
    approve: bool
    note: str = Field(default="",max_length=1000)
class AssignmentData(BaseModel):
    teacher_id: int
    forum_id: int
class BlockData(BaseModel):
    title_sq: str = Field(default="",max_length=250)
    title_en: str = Field(default="",max_length=250)
    subtitle_sq: str = Field(default="",max_length=2500)
    subtitle_en: str = Field(default="",max_length=2500)
    image_url: str = Field(default="",max_length=2000)
    button_url: str = Field(default="",max_length=500)
class TemplateData(BaseModel):
    key: str = Field(pattern=r"^[a-z][a-z0-9_]{2,79}$")
    subject_sq: str = Field(min_length=3,max_length=250)
    subject_en: str = Field(min_length=3,max_length=250)
    body_sq: str = Field(min_length=5,max_length=12000)
    body_en: str = Field(min_length=5,max_length=12000)
    active: bool = True
class ProgressData(BaseModel):
    parent_id: int
    student_id: int
class EventData(BaseModel):
    title: str = Field(min_length=5,max_length=200)
    forum_id: int
    link: str = Field(default="",max_length=350)


class LanguageChoice(BaseModel):
    language: str = Field(pattern=r"^(sq|en)$")

@router.get("/language")
def get_language(user:User=Depends(get_current_user)):
    return {"language":user.preferred_language or "sq"}

@router.put("/language")
def set_language(data:LanguageChoice,user:User=Depends(get_current_user),
                 db:Session=Depends(get_db)):
    user.preferred_language=data.language
    db.commit()
    return {"language":user.preferred_language}

class TeacherApplicationData(BaseModel):
    first_name: str = Field(min_length=2, max_length=90)
    last_name: str = Field(min_length=2, max_length=90)
    birth_date: date
    bio: str = Field(min_length=25, max_length=6000)
    subject: str = Field(min_length=2, max_length=100)

@router.post("/teacher/apply")
def teacher_apply(data: TeacherApplicationData,
                  user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    first_name, last_name, birth_date, bio, subject = (
        data.first_name, data.last_name, data.birth_date, data.bio, data.subject)
    if user.role not in ("student","user"):
        raise HTTPException(403,"Only student accounts can apply")
    if birth_date >= date.today() or len(bio.strip())<25:
        raise HTTPException(422,"Enter a valid birth date and experience description (25+ characters)")
    if min(len(first_name.strip()),len(last_name.strip()),len(subject.strip()))<2:
        raise HTTPException(422,"Name, surname and subject are required")
    existing=db.query(TeacherApplication).filter_by(user_id=user.id).first()
    if existing:
        raise HTTPException(409,"Teacher application already submitted")
    request=TeacherApplication(user_id=user.id,first_name=first_name.strip()[:90],
        last_name=last_name.strip()[:90],birth_date=birth_date,bio=bio.strip()[:6000],
        subject=subject.strip()[:100],id_photo_key="",portrait_key="",
        status="pending",submitted_at=datetime.utcnow())
    db.add(request);db.commit()
    return {"id":request.id,"status":"pending"}

@router.get("/teacher/me")
def my_teacher_request(user: User = Depends(get_current_user),db: Session = Depends(get_db)):
    a=db.query(TeacherApplication).filter_by(user_id=user.id).first()
    return {"status":a.status if a else "not_applied","review_note":a.review_note if a else ""}

@router.get("/admin/teachers")
def teacher_queue(user: User = Depends(get_verified_user),db: Session = Depends(get_db)):
    require_admin(user)
    return [{"id":a.id,"user_id":a.user_id,"first_name":a.first_name,
             "last_name":a.last_name,"birth_date":a.birth_date,"bio":a.bio,
             "subject":a.subject,"status":a.status,"submitted_at":a.submitted_at,
             "review_note":a.review_note}
             for a in db.query(TeacherApplication).order_by(TeacherApplication.submitted_at.desc()).limit(150).all()]

@router.post("/admin/teachers/{app_id}/review")
def review_teacher(app_id:int,data:Decision,user:User=Depends(get_verified_user),
                   db:Session=Depends(get_db)):
    require_admin(user)
    a=db.query(TeacherApplication).filter_by(id=app_id).with_for_update().first()
    if not a:raise HTTPException(404,"Application not found")
    if a.status!="pending":raise HTTPException(409,"Already reviewed")
    account=db.query(User).filter_by(id=a.user_id).with_for_update().one()
    a.status="approved" if data.approve else "rejected"
    a.reviewed_at=datetime.utcnow();a.reviewed_by=user.id;a.review_note=data.note
    if data.approve:
        account.role="teacher"
        account.bio=a.bio[:250]
        if not db.query(TeacherSubject).filter_by(teacher_id=account.id,subject=a.subject).first():
            db.add(TeacherSubject(teacher_id=account.id,subject=a.subject))
    db.commit()
    return {"id":a.id,"status":a.status}

@router.post("/admin/teacher-assignments")
def assign_teacher(data:AssignmentData,user:User=Depends(get_verified_user),
                   db:Session=Depends(get_db)):
    require_admin(user)
    a=db.query(TeacherApplication).filter_by(user_id=data.teacher_id,status="approved").first()
    teacher=db.get(User,data.teacher_id)
    if not a or not teacher or teacher.role!="teacher" or not db.get(Forum,data.forum_id):
        raise HTTPException(422,"Approved teacher and existing forum required")
    if db.query(TeacherForumAssignment).filter_by(teacher_id=data.teacher_id,forum_id=data.forum_id).first():
        raise HTTPException(409,"Already assigned")
    from models import ForumMembership
    db.add(TeacherForumAssignment(teacher_id=data.teacher_id,forum_id=data.forum_id,
                                  assigned_by=user.id))
    membership=db.query(ForumMembership).filter_by(forum_id=data.forum_id,user_id=data.teacher_id).first()
    if membership:
        membership.is_active=True
        membership.is_banned=False
        membership.role="member"
    else:
        db.add(ForumMembership(forum_id=data.forum_id,user_id=data.teacher_id,
                               is_active=True,is_banned=False,role="member"))
    db.commit();return {"ok":True}

@router.get("/teacher/classes")
def my_classes(user:User=Depends(get_verified_user),db:Session=Depends(get_db)):
    if user.role!="teacher":
        raise HTTPException(403,"Teacher only")
    a=db.query(TeacherApplication).filter_by(user_id=user.id,status="approved").first()
    if not a:raise HTTPException(403,"Teacher not approved")
    ids=[i[0] for i in db.query(TeacherForumAssignment.forum_id).filter_by(teacher_id=user.id).all()]
    return [{"id":f.id,"title":f.title,"subject":f.subject}
            for f in db.query(Forum).filter(Forum.id.in_(ids)).all()]

# Fixed allowlist: editors can only modify copy/media in reviewed public sections.
# Registered page headers share the existing site_content_blocks table (no migration).
CONTENT_KEYS={
    "hero","home_intro","home_feature_weekly","home_feature_forums",
    "home_feature_courses",
    "home_feature_support","competition","community","home_mentors",
    "home_founders","home_founder_klevisa","home_founder_enio",
    "partner","cta","page_explore","page_weekly",
    "page_forums","page_courses",
    "page_tutoring","page_faq","page_support","page_teacher_application"
}
@router.get("/content")
def public_content(db:Session=Depends(get_db)):
    return {row.key:{"title_sq":row.title_sq,"title_en":row.title_en,
                     "subtitle_sq":row.subtitle_sq,"subtitle_en":row.subtitle_en,
                     "image_url":row.image_url,"button_url":row.button_url}
            for row in db.query(SiteContentBlock).filter(SiteContentBlock.key.in_(CONTENT_KEYS)).all()}

@router.put("/admin/content/{key}")
def edit_content(key:str,data:BlockData,user:User=Depends(get_verified_user),db:Session=Depends(get_db)):
    require_admin(user)
    if key not in CONTENT_KEYS:raise HTTPException(422,"Unknown section")
    image = data.image_url.strip()
    safe_relative = image.startswith("/") and not image.startswith("//") and chr(92) not in image
    from urllib.parse import urlsplit
    parts = urlsplit(image)
    safe_https = parts.scheme == "https" and bool(parts.netloc) and not parts.username and not parts.password
    if image and not (safe_relative or safe_https):
        raise HTTPException(422,"Image must use HTTPS or a local path")
    link = data.button_url.strip()
    if link and (not link.startswith("/") or link.startswith("//") or chr(92) in link):
        raise HTTPException(422,"Buttons must link to internal pages")
    data.image_url = image
    data.button_url = link
    block=db.get(SiteContentBlock,key)
    if not block:block=SiteContentBlock(key=key);db.add(block)
    for k,v in data.model_dump().items():setattr(block,k,v)
    block.updated_at=datetime.utcnow();db.commit()
    return {"key":key,"ok":True}

@router.get("/admin/templates")
def templates(user:User=Depends(get_verified_user),db:Session=Depends(get_db)):
    require_admin(user)
    custom={t.key:t for t in db.query(EmailTemplate).all()}
    keys=set(TEMPLATE_DEFAULTS)|set(custom)
    result=[]
    for key in sorted(keys):
        a=custom.get(key);default=TEMPLATE_DEFAULTS.get(key,("","","",""))
        result.append({"key":key,"subject_sq":a.subject_sq if a else default[0],
                      "subject_en":a.subject_en if a else default[1],
                      "body_sq":a.body_sq if a else default[2],
                      "body_en":a.body_en if a else default[3],
                      "active":a.active if a else True})
    return result

@router.put("/admin/templates/{key}")
def save_template(key:str,data:TemplateData,user:User=Depends(get_verified_user),
                  db:Session=Depends(get_db)):
    require_admin(user)
    if key!=data.key:raise HTTPException(422,"Template key mismatch")
    for value in (data.subject_sq,data.subject_en,data.body_sq,data.body_en):validate_template(value)
    item=db.query(EmailTemplate).filter_by(key=key).first()
    if not item:item=EmailTemplate(key=key);db.add(item)
    for field,value in data.model_dump(exclude={"key"}).items():setattr(item,field,value)
    item.updated_by=user.id;db.commit()
    return {"key":key,"ok":True}

@router.post("/admin/forum-meetings")
def announce_meeting(data:EventData,user:User=Depends(get_verified_user),db:Session=Depends(get_db)):
    require_admin(user)
    forum=db.get(Forum,data.forum_id)
    if not forum:raise HTTPException(404,"Forum not found")
    # Selection is explicit and restricted to active forum members; avoid emailing all users.
    from models import ForumMembership
    memberships=db.query(ForumMembership).filter_by(forum_id=forum.id,is_active=True,is_banned=False).all()
    recipients=[db.get(User,m.user_id) for m in memberships]
    sent=0
    for recipient in recipients:
        if not recipient or not recipient.is_active:continue
        enqueue_notice(db,recipient,"forum_meeting",{"name":recipient.username,"forum_name":forum.title,
                 "title":data.title,"link":data.link or "/forum/"+str(forum.id)})
        sent+=1
    db.commit()
    return {"recipients":sent}

@router.post("/admin/parent-links")
def create_parent_link(data:ProgressData,user:User=Depends(get_verified_user),db:Session=Depends(get_db)):
    require_admin(user)
    parent=db.get(User,data.parent_id);student=db.get(User,data.student_id)
    if not parent or not student or not parent.is_verified or not student.is_verified:
        raise HTTPException(422,"Verified parent and student accounts required")
    if parent.id==student.id:raise HTTPException(422,"Accounts must differ")
    if db.query(ParentStudentLink).filter_by(parent_id=parent.id,student_id=student.id).first():
        raise HTTPException(409,"Link already exists")
    db.add(ParentStudentLink(parent_id=parent.id,student_id=student.id,created_at=datetime.utcnow()))
    db.commit()
    link=db.query(ParentStudentLink).filter_by(parent_id=parent.id,student_id=student.id).first()
    return {"id":link.id,"status":"pending_parent_acceptance"}

@router.get("/admin/parent-links")
def admin_parent_links(user:User=Depends(get_verified_user),db:Session=Depends(get_db)):
    require_admin(user)
    return [{"id":l.id,"parent_id":l.parent_id,"student_id":l.student_id,
             "status":l.status} for l in db.query(ParentStudentLink)
            .order_by(ParentStudentLink.id.desc()).limit(200).all()]

@router.get("/parent/links")
def parent_links(user:User=Depends(get_verified_user),db:Session=Depends(get_db)):
    links=db.query(ParentStudentLink).filter_by(parent_id=user.id).all()
    return [{"id":l.id,"student_id":l.student_id,"status":l.status} for l in links]

@router.post("/parent/links/{link_id}/accept")
def accept_parent(link_id:int,user:User=Depends(get_verified_user),db:Session=Depends(get_db)):
    link=db.query(ParentStudentLink).filter_by(id=link_id,parent_id=user.id).first()
    if not link:raise HTTPException(404,"Link not found")
    if link.status!="pending":raise HTTPException(409,"Link already handled")
    link.status="parent_accepted";db.commit();return {"status":"parent_accepted"}

@router.get("/student/parent-links")
def student_links(user:User=Depends(get_verified_user),db:Session=Depends(get_db)):
    return [{"id":l.id,"parent_id":l.parent_id,"status":l.status}
            for l in db.query(ParentStudentLink).filter_by(student_id=user.id).all()]

@router.post("/student/parent-links/{link_id}/approve")
def approve_parent(link_id:int,approve:bool,user:User=Depends(get_verified_user),
                   db:Session=Depends(get_db)):
    link=db.query(ParentStudentLink).filter_by(id=link_id,student_id=user.id).first()
    if not link:raise HTTPException(404,"Link not found")
    if link.status!="parent_accepted":raise HTTPException(409,"Parent must accept first")
    link.status="approved" if approve else "rejected"
    db.commit();return {"status":link.status}

@router.post("/admin/parent-reports/{link_id}")
def send_parent_report(link_id:int,report:str=Form(...),user:User=Depends(get_verified_user),
                       db:Session=Depends(get_db)):
    require_admin(user)
    link=db.get(ParentStudentLink,link_id)
    if not link or link.status!="approved":raise HTTPException(403,"Parent has not accepted this link")
    parent=db.get(User,link.parent_id);student=db.get(User,link.student_id)
    if not parent or not parent.is_verified:raise HTTPException(422,"Verified parent required")
    if not (10<=len(report)<=3500):raise HTTPException(422,"Report must be 10-3500 characters")
    sent=enqueue_notice(db,parent,"parent_progress",{
        "name":parent.username,"child_name":student.username,"result":report,"link":"/profile"})
    db.commit();return {"delivered":sent,"in_app":True}


class MeetData(BaseModel):
    forum_id: int
    title: str = Field(min_length=4,max_length=180)
    meet_url: str = Field(max_length=300)
    starts_at: datetime

class GradeData(BaseModel):
    score: int = Field(ge=0,le=100)
    feedback: str = Field(default="",max_length=4000)

def assigned_teacher(user,forum_id,db):
    if user.role!="teacher":
        raise HTTPException(403,"Only teachers can use this route")
    if not can_enter_forum(user,db.get(Forum,forum_id),db):
        raise HTTPException(403,"Teacher not assigned to this class")

@router.post("/teacher/meetings")
def create_meeting(data:MeetData,user:User=Depends(get_verified_user),db:Session=Depends(get_db)):
    from urllib.parse import urlparse
    from models import ForumMessage, ForumMembership
    assigned_teacher(user,data.forum_id,db)
    parsed=urlparse(data.meet_url)
    if parsed.scheme!="https" or parsed.hostname!="meet.google.com":
        raise HTTPException(422,"Only official https://meet.google.com/ links are allowed")
    if data.starts_at < datetime.utcnow():
        raise HTTPException(422,"Meeting must be in the future (UTC)")
    # Reuse current forum message system instead of inventing a duplicate meeting feed.
    message=ForumMessage(forum_id=data.forum_id,author_id=user.id,message_type="text",
                         content=f"{data.title} — {data.starts_at.isoformat()} UTC — {data.meet_url}")
    db.add(message);db.flush()
    members=db.query(ForumMembership).filter_by(forum_id=data.forum_id,
                                                is_active=True,is_banned=False).all()
    forum=db.get(Forum,data.forum_id)
    for member in members:
        recipient=db.get(User,member.user_id)
        if recipient and recipient.id!=user.id and recipient.is_active:
            enqueue_notice(db,recipient,"forum_meeting",
                           {"name":recipient.username,"forum_name":forum.title,
                            "title":data.title,"link":"/forum/"+str(forum.id)})
    db.commit();return {"message_id":message.id}

@router.get("/teacher/courses/{item_id}/submissions")
def teacher_submissions(item_id:int,user:User=Depends(get_verified_user),db:Session=Depends(get_db)):
    item=db.get(CourseItem,item_id)
    if not item or not item.forum_id:raise HTTPException(404,"Class assignment not found")
    assigned_teacher(user,item.forum_id,db)
    return [{"attempt_id":a.id,"student_id":a.student_id,"answers":a.answers,
             "submitted_at":a.submitted_at,"score":a.score,"feedback":a.feedback}
             for a in db.query(CourseAttempt).filter_by(item_id=item_id)
             .filter(CourseAttempt.submitted_at.isnot(None)).all()]

@router.post("/teacher/submissions/{attempt_id}/grade")
def grade_submission(attempt_id:int,data:GradeData,user:User=Depends(get_verified_user),
                     db:Session=Depends(get_db)):
    a=db.query(CourseAttempt).filter_by(id=attempt_id).with_for_update().first()
    item=db.get(CourseItem,a.item_id) if a else None
    if not item or not item.forum_id or not a.submitted_at:
        raise HTTPException(404,"Submitted assignment not found")
    assigned_teacher(user,item.forum_id,db)
    a.score=data.score;a.feedback=data.feedback;a.graded_at=datetime.utcnow()
    student=db.get(User,a.student_id)
    if student:enqueue_notice(db,student,"new_result",
                              {"name":student.username,"title":item.title,
                               "result":f"{data.score}/100 — {data.feedback}","link":"/courses"})
    db.commit();return {"attempt_id":a.id,"score":a.score}

@router.get("/teacher/courses")
def teacher_course_list(user:User=Depends(get_verified_user),db:Session=Depends(get_db)):
    if user.role!="teacher":raise HTTPException(403,"Teacher access required")
    assignments=db.query(TeacherForumAssignment.forum_id).filter_by(teacher_id=user.id).all()
    return [{"id":i.id,"title":i.title,"kind":i.kind,"forum_id":i.forum_id}
            for i in db.query(CourseItem).filter(CourseItem.forum_id.in_([v[0] for v in assignments])).all()]


class TemplateDispatch(BaseModel):
    recipient_user_ids: list[int] = Field(min_length=1,max_length=25)
    fields: dict[str,str] = Field(default_factory=dict)

@router.post("/admin/templates/{key}/send")
def send_selected_template(key:str,data:TemplateDispatch,user:User=Depends(get_verified_user),
                           db:Session=Depends(get_db)):
    require_admin(user)
    from phase3_service import ALLOWED_TOKENS
    if set(data.fields)-ALLOWED_TOKENS or len(set(data.recipient_user_ids))!=len(data.recipient_user_ids):
        raise HTTPException(422,"Invalid recipients or placeholders")
    if any(len(str(v))>1000 for v in data.fields.values()):
        raise HTTPException(422,"Field exceeds allowed length")
    allowed_keys={t.key for t in db.query(EmailTemplate).filter_by(active=True).all()}|set(TEMPLATE_DEFAULTS)
    if key not in allowed_keys:raise HTTPException(404,"Template is not active")
    count=0
    for id in data.recipient_user_ids:
        recipient=db.get(User,id)
        if not recipient or not recipient.is_active or not recipient.is_verified:
            raise HTTPException(422,f"Recipient #{id} is not active and verified")
    for id in data.recipient_user_ids:
        recipient=db.get(User,id)
        values={**data.fields,"name":recipient.username}
        enqueue_notice(db,recipient,key,values)
        count+=1
    db.commit()
    return {"recipients":count}

@router.get("/teachers")
def public_teacher_directory(db:Session=Depends(get_db)):
    """Only admin-approved teacher profiles are public."""
    profiles=db.query(TeacherApplication).filter_by(status="approved").order_by(
        TeacherApplication.id.desc()).limit(24).all()
    return [{"user_id":a.user_id,"first_name":a.first_name,
             "last_name":a.last_name,"subject":a.subject,"bio":a.bio[:450]}
            for a in profiles if db.get(User,a.user_id) and db.get(User,a.user_id).role=="teacher"]
