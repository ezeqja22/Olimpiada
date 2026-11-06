"""Exhaustive synthetic staging smoke: run only inside a staging API container."""
import os
import sys
import requests
from fastapi.testclient import TestClient
from database import SessionLocal
from models import User, Forum
from main import app
from auth.utils import create_jwt
from email_service import email_service

assert os.getenv("STAGING_MODE")=="1", "Refusing to exercise non-staging data"
client=TestClient(app)
db=SessionLocal()
def actor(short):
    account=db.query(User).filter_by(email="demo-"+short+"@example.com").one()
    return account,{"Authorization":"Bearer "+create_jwt(account.id,db)}
admin,admin_h=actor("admin")
free,free_h=actor("free")
teacher,teacher_h=actor("teacher")
catalog=client.get("/core/forums/catalog",headers=free_h)
assert catalog.status_code==200,catalog.text
public=next(f for f in catalog.json() if not f["is_private"])
assert public["accessible"] is True
assert client.get("/auth/forums/"+str(public["id"]),headers=free_h).status_code==200
assert client.get("/experience/admin/teachers",headers=free_h).status_code==403
assert client.get("/experience/teacher/classes",headers=teacher_h).status_code==200

result=email_service.send_notification_email("demo-test@example.com",
             "Synthetic staging notice","Captured only in Mailpit")
assert result, "Mailpit staging email not captured"
inbox=requests.get("http://mailpit:8025/api/v1/messages",timeout=5)
assert inbox.status_code==200,inbox.status_code
assert inbox.json().get("total",0)>=1, "No messages in Mailpit"

print("PASS: account access, scoped teacher, fake mail")
db.close()
