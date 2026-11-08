"""Loopback-only UX browser harness. Never import this from production.
Creates an empty SQLite database, random in-memory credentials, and local-only fixtures.
All mail adapters are disabled. POST /__ux/cleanup verifies every table is empty.
"""
import os,sys,secrets,json
from pathlib import Path
from datetime import datetime,timedelta
root=Path(__file__).resolve().parents[1]
state=root/'staging'/'.local-state';state.mkdir(exist_ok=True)
dbfile=state/('ux-browser-'+secrets.token_hex(6)+'.sqlite3')
os.environ.update(DATABASE_URL='sqlite:///'+str(dbfile),SECRET_KEY=secrets.token_urlsafe(48),STAGING_MODE='1',FRONTEND_ORIGINS='http://127.0.0.1:5178',ENABLE_INLINE_SCHEDULER='0',ENABLE_INACTIVE_ACCOUNT_CLEANUP='0')
for key in ('RESEND_API_KEY','SMTP_PASSWORD','SMTP_USERNAME','SMTP_SERVER','SMTP_HOST','SENDGRID_API_KEY'):os.environ.pop(key,None)
sys.path.insert(0,str(root/'backend'))
from database import engine,SessionLocal
import models
from main import app
from email_service import email_service
from help_models import HelpBase
from auth.utils import hash_password
from sqlalchemy import text,inspect
from fastapi import Request,HTTPException
# No scheduler or external notifications in this isolated process.
app.router.on_startup.clear()
for name in dir(email_service):
    if name.startswith('send_') or name.startswith('_send_'):setattr(email_service,name,lambda *args,**kwargs:False)
models.Base.metadata.create_all(engine);HelpBase.metadata.create_all(engine)
credentials={}

def local(request):
    if request.client.host not in ('127.0.0.1','::1'):raise HTTPException(403)
    if engine.url.drivername!='sqlite' or Path(engine.url.database)!=dbfile:raise RuntimeError('Not the isolated browser database')

def clean():
    ledger={}
    names=inspect(engine).get_table_names()
    with engine.begin() as c:
        for name in names:
            columns=[x['name'] for x in inspect(engine).get_columns(name)]
            key='id' if 'id' in columns else columns[0]
            ledger[name]=[str(row[0]) for row in c.execute(text(f'SELECT "{key}" FROM "{name}"'))]
        for name in names:c.execute(text(f'DELETE FROM "{name}"'))
        assert all(c.execute(text(f'SELECT COUNT(*) FROM "{name}"')).scalar()==0 for name in names)
    with (state/'ux-cleanup-ledger.jsonl').open('a',encoding='utf-8') as f:f.write(json.dumps({'removed_ids':ledger,'remaining':0})+'\n')
    credentials.clear()
    return {'remaining':0,'removed_counts':{k:len(v) for k,v in ledger.items() if v}}

@app.post('/__ux/fixture')
def fixture(request:Request):
    local(request);clean()
    with SessionLocal() as db:
        for role in ('admin','student'):
            password=secrets.token_urlsafe(24);email=f'ux-test-{role}@example.org'
            user=models.User(username='[UX-TEST] '+role,email=email,password_hash=hash_password(password),role=role,is_verified=True,is_active=True,is_banned=False)
            db.add(user);db.flush();credentials[role]={'email':email,'password':password,'id':user.id}
        admin=credentials['admin']['id']
        forum=models.Forum(title='[UX-TEST] Algebra community',description='Practice and discuss mathematics.',creator_id=admin,is_private=False,is_approved=True,subject='Mathematics',level='School',max_members=100)
        db.add(forum);db.flush()
        db.add(models.ForumMembership(forum_id=forum.id,user_id=admin,role='creator',is_active=True,is_banned=False))
        db.add(models.CourseItem(title='[UX-TEST] Reasoning test',kind='test',subject='Mathematics',instructions='Explain your reasoning.',body='What is 2 + 2?',duration_minutes=30,published_at=datetime.utcnow()-timedelta(days=1),created_by=admin))
        db.commit()
    return {'ready':True}

@app.get('/__ux/credentials/{role}')
def get_credentials(role:str,request:Request):
    local(request)
    return credentials[role]

@app.post('/__ux/cleanup')
def cleanup(request:Request):local(request);return clean()

if __name__=='__main__':
    import uvicorn
    try:uvicorn.run(app,host='127.0.0.1',port=8018,access_log=False,log_level='warning')
    finally:
        clean();engine.dispose();dbfile.unlink(missing_ok=True)
