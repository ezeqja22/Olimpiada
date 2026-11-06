from datetime import datetime, timedelta
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserSession
from auth.utils import SECRET_KEY, SESSION_MINUTES

security = HTTPBearer()

def authenticate_token(token: str, db: Session):
    """Validate both JWT expiry and the server-side sliding idle timeout."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

    user_id, sid = payload.get("user_id"), payload.get("sid")
    if not isinstance(user_id, int) or not isinstance(sid, str):
        raise HTTPException(401, "Session must be renewed by logging in")
    session = db.query(UserSession).filter(
        UserSession.id == sid, UserSession.user_id == user_id,
        UserSession.revoked_at.is_(None)).first()
    if not session:
        raise HTTPException(401, "Session revoked")
    now = datetime.utcnow()
    if now - session.last_activity_at > timedelta(minutes=SESSION_MINUTES):
        session.revoked_at = now
        db.commit()
        raise HTTPException(401, "Session expired due to inactivity")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(401, "User not found")
    if not user.is_active:
        raise HTTPException(403, "Account deactivated")
    if user.is_banned:
        raise HTTPException(403, "Account banned")
    if now - session.last_activity_at >= timedelta(seconds=30):
        session.last_activity_at = now
        user.last_activity_at = now
        db.commit()
    return user

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security),
                     db: Session = Depends(get_db)):
    return authenticate_token(credentials.credentials, db)

def get_verified_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_verified:
        raise HTTPException(403, "Email not verified")
    return current_user
