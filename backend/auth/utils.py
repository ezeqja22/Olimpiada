import os
import uuid
from datetime import datetime, timedelta

import jwt
from dotenv import load_dotenv
from passlib.hash import bcrypt

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")

SESSION_MINUTES = 10

def hash_password(password: str) -> str:
    return bcrypt.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.verify(password, hashed)

def create_jwt(user_id: int, db, session_id=None) -> str:
    """Issue a short-lived access token backed by a revocable server-side session."""
    from models import UserSession, User
    now = datetime.utcnow()
    if session_id:
        session = db.query(UserSession).filter(
            UserSession.id == session_id, UserSession.user_id == user_id,
            UserSession.revoked_at.is_(None)).first()
        if not session:
            raise ValueError("Session is not active")
        session.last_activity_at = now
    else:
        session_id = str(uuid.uuid4())
        db.add(UserSession(id=session_id, user_id=user_id,
                           created_at=now, last_activity_at=now))
    user = db.get(User, user_id)
    if user:
        user.last_activity_at = now
    db.commit()
    return jwt.encode({
        "user_id": user_id, "sid": session_id,
        "iat": now, "exp": now + timedelta(minutes=SESSION_MINUTES),
    }, SECRET_KEY, algorithm="HS256")
