from datetime import datetime,timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import FastAPI
from fastapi.testclient import TestClient
from database import get_db
from auth.dependencies import get_verified_user,get_current_user
from auth.routes import router as auth_router
from phase2_routes import router
from models import Base,User,Draft,CourseItem,CourseAttempt

@pytest.fixture
def local_app():
    engine=create_engine('sqlite://',poolclass=StaticPool,connect_args={'check_same_thread':False})
    Base.metadata.create_all(engine)
    factory=sessionmaker(bind=engine)
    app=FastAPI();app.include_router(router);app.include_router(auth_router,prefix='/auth')
    with factory() as db:
        users=[User(username='[UX-TEST]'+str(i),email=f'ux-test-{i}@example.org',password_hash='unused',role='student',is_verified=True,is_active=True,is_banned=False) for i in (1,2)]
        db.add_all(users);db.commit()
        for u in users:db.refresh(u);db.expunge(u)
    current=[users[0]]
    def db_session():
        with factory() as db:yield db
    app.dependency_overrides[get_db]=db_session
    app.dependency_overrides[get_verified_user]=lambda:current[0]
    app.dependency_overrides[get_current_user]=lambda:current[0]
    try:
        with TestClient(app) as client:yield client,factory,current,users
    finally:
        Base.metadata.drop_all(engine)
        from sqlalchemy import inspect
        assert not inspect(engine).get_table_names()
        engine.dispose()

def test_resumed_draft_updates_and_stays_private(local_app):
    client,factory,current,users=local_app
    payload=dict(title='[UX-TEST] draft',description=r'\\frac{1}{2}',subject='Mathematics',tags='algebra')
    created=client.post('/auth/drafts',json=payload);assert created.status_code==200,created.text
    ident=created.json()['id']
    updated=client.put(f'/auth/drafts/{ident}',json={**payload,'title':'[UX-TEST] revised'})
    assert updated.status_code==200,updated.text
    with factory() as db:assert db.query(Draft).count()==1
    current[0]=users[1]
    assert client.get(f'/auth/drafts/{ident}').status_code==404
    assert client.put(f'/auth/drafts/{ident}',json=payload).status_code==404
    current[0]=users[0]
    assert client.get(f'/auth/drafts/{ident}').json()['description']==payload['description']

def test_learning_feedback_only_exposes_own_attempt(local_app):
    client,factory,current,users=local_app
    with factory() as db:
        item=CourseItem(kind='test',title='[UX-TEST] timed',subject='Math',body='PRIVATE TEST',published_at=datetime.utcnow()-timedelta(days=1),duration_minutes=30,created_by=users[1].id)
        db.add(item);db.flush()
        db.add(CourseAttempt(item_id=item.id,student_id=users[1].id,answers='PRIVATE ANSWER',score=100,feedback='OTHER FEEDBACK',graded_at=datetime.utcnow()))
        db.commit();ident=item.id
    row=client.get('/core/courses/items').json()[0]
    assert row['my_attempt'] is None and row['body'] is None
    assert 'OTHER FEEDBACK' not in str(row)
    started=client.post(f'/core/courses/items/{ident}/start');assert started.status_code==200
    submitted=client.post(f'/core/courses/items/{ident}/submit',json={'answers':'[UX-TEST] answer'});assert submitted.status_code==200
    with factory() as db:
        attempt=db.query(CourseAttempt).filter_by(student_id=users[0].id).one();attempt.score=72;attempt.feedback='Good reasoning';attempt.graded_at=datetime.utcnow();db.commit()
    row=client.get('/core/courses/items').json()[0]
    assert row['my_attempt']['score']==72 and row['my_attempt']['feedback']=='Good reasoning'
    assert 'answers' not in row['my_attempt']


@pytest.mark.parametrize('site_role', ['student', 'admin', 'moderator', 'reviewer', 'super_admin'])
def test_reply_deletion_resolves_membership_for_all_roles(local_app, site_role):
    from models import Forum, ForumMembership, ForumMessage, ForumReply
    client, factory, current, users = local_app
    current[0].role = site_role
    with factory() as db:
        forum = Forum(title='[UX-TEST] discussion', creator_id=users[1].id, is_private=False, is_approved=True)
        db.add(forum); db.flush()
        db.add(ForumMembership(forum_id=forum.id, user_id=users[0].id, role='member', is_active=True))
        message = ForumMessage(forum_id=forum.id, author_id=users[1].id, content='Question', message_type='text')
        db.add(message); db.flush()
        own = ForumReply(forum_id=forum.id, parent_message_id=message.id, author_id=users[0].id, content='Own answer')
        other = ForumReply(forum_id=forum.id, parent_message_id=message.id, author_id=users[1].id, content='Other answer')
        db.add_all([own, other]); db.commit()
        forum_id, own_id, other_id = forum.id, own.id, other.id
    url = f'/auth/forums/{forum_id}/replies/'
    assert client.delete(url + str(own_id)).status_code == 200
    assert client.delete(url + str(other_id)).status_code == 403
    with factory() as db:
        assert db.get(ForumReply, own_id).is_deleted
        assert not db.get(ForumReply, other_id).is_deleted
        membership = db.query(ForumMembership).filter_by(forum_id=forum_id, user_id=users[0].id).one()
        membership.role = 'creator'; db.commit()
    assert client.delete(url + str(other_id)).status_code == 200
