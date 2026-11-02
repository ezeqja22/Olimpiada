"""Idempotent publication notices. Schedule every minute with weekly cron."""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import (User,CourseItem,ContentEventDelivery,ForumMembership,Forum,WeeklyChallenge,WeeklySubmission)
from phase2_service import can_enter_forum
from phase1_service import has_feature
from phase3_service import enqueue_notice

def send_due_learning_notices(db:Session,now=None):
    now=now or datetime.utcnow()
    items=db.query(CourseItem).filter(CourseItem.published_at<=now,
                                        CourseItem.published_at>=now-timedelta(days=3),
                                        CourseItem.kind.in_(("homework","test"))).all()
    created=0
    for item in items:
        if item.forum_id:
            users=[r[0] for r in db.query(ForumMembership.user_id).filter_by(
                forum_id=item.forum_id,is_active=True,is_banned=False).all()]
            targets=db.query(User).filter(User.id.in_(users),User.is_active.is_(True)).all()
        else:
            targets=db.query(User).filter(User.is_active.is_(True),User.role.in_(("student","user"))).all()
        for u in targets:
            if not has_feature(u,"material"):continue
            if item.forum_id and not can_enter_forum(u,db.get(Forum,item.forum_id),db):
                continue
            event="course:"+str(item.id)
            if db.query(ContentEventDelivery).filter_by(event_key=event,recipient_user_id=u.id).first():
                continue
            # UniqueConstraint guarantees that a repeated scheduled execution doesn't duplicate notices.
            db.add(ContentEventDelivery(event_key=event,recipient_user_id=u.id,created_at=now))
            enqueue_notice(db,u,"new_homework" if item.kind=="homework" else "new_test",
                            {"name":u.username,"title":item.title,"link":"/courses"})
            db.commit()
            created+=1
            if created>=30:
                return created
    return created
