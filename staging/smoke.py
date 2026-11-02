"""Exhaustive synthetic staging smoke: run only inside a staging API container."""
import io
import os
import sys
import requests
from PIL import Image
from fastapi.testclient import TestClient
from database import SessionLocal
from models import User, Forum, LibraryDocument
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
basic,basic_h=actor("basic")
medium,medium_h=actor("medium")
premium,premium_h=actor("premium")
teacher,teacher_h=actor("teacher")
catalog=client.get("/core/forums/catalog",headers=basic_h)
assert catalog.status_code==200,catalog.text
prem=next(f for f in catalog.json() if f["required_plan"]=="premium")
assert prem["accessible"] is False
assert client.get("/auth/forums/"+str(prem["id"]),headers=basic_h).status_code==403
assert client.get("/auth/forums/"+str(prem["id"]),headers=premium_h).status_code==200
docs=client.get("/core/library/catalog").json()
assert docs, "Missing staging booklet"
doc_id=docs[0]["id"]
assert client.get(f"/core/library/{doc_id}/pages/1",headers=free_h).status_code==402
page=client.get(f"/core/library/{doc_id}/pages/1",headers=medium_h)
assert page.status_code==200,(page.status_code,page.text[:300])
assert page.content.startswith(b"RIFF")
assert client.get("/experience/admin/teachers",headers=basic_h).status_code==403
assert client.get("/experience/teacher/classes",headers=teacher_h).status_code==200

img=io.BytesIO()
Image.new("RGB",(320,180),color="#e4f4fa").save(img,format="JPEG")
photo=img.getvalue()
payment=client.post("/access/payments?plan=basic&months=1",
                   files={"receipt":("synthetic.jpg",photo,"image/jpeg")},
                   headers=free_h)
assert payment.status_code==200,payment.text
id=payment.json()["id"]
assert client.get(f"/access/admin/payments/{id}/receipt",headers=free_h).status_code==403
receipt=client.get(f"/access/admin/payments/{id}/receipt",headers=admin_h)
assert receipt.status_code==200,receipt.text[:300] if receipt.status_code!=200 else ""
assert receipt.headers["content-type"]=="image/jpeg"
approved=client.post(f"/access/admin/payments/{id}/review",headers=admin_h,json={"approve":True})
assert approved.status_code==200,approved.text

branding=client.post("/experience/admin/branding/upload",
                     files={"file":("synthetic.jpg",photo,"image/jpeg")},headers=admin_h)
assert branding.status_code==200,branding.text
from urllib.parse import urlparse
brand_path=urlparse(branding.json()["url"]).path
assert client.get(brand_path).status_code==200,brand_path

result=email_service.send_notification_email("demo-test@example.com",
             "Synthetic staging notice","Captured only in Mailpit")
assert result, "Mailpit staging email not captured"
inbox=requests.get("http://mailpit:8025/api/v1/messages",timeout=5)
assert inbox.status_code==200,inbox.status_code
assert inbox.json().get("total",0)>=1, "No messages in Mailpit"

print("PASS: forum tiers, scoped teacher, protected PDF, staging bank-slip approval, branding upload, fake mail")
db.close()
