"""Authentication and teacher assignment guard; no subscription restrictions."""
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from auth.dependencies import authenticate_token
from phase1_service import is_staff
from models import Problem, TeacherApplication, TeacherForumAssignment
import re

PUBLIC_AUTH = {
    "/auth/login", "/auth/register", "/auth/send-verification",
    "/auth/verify-email", "/auth/forgot-password", "/auth/reset-password",
}
ACCOUNT_PREFIXES = (
    "/auth/me", "/auth/user/profile", "/auth/verify-password",
    "/auth/change-password", "/auth/delete-account", "/auth/notification-preferences",
    "/auth/notifications",
)
def gate_request(request, db: Session):
    path = request.url.path.rstrip("/") or "/"
    if request.method == "OPTIONS":
        return None
    if not (path.startswith("/auth/") or path.startswith("/admin/")):
        return None
    if path in PUBLIC_AUTH or (path.startswith("/auth/verification-status/") and request.method == "GET"):
        return None
    if path == "/admin/settings/site-info" and request.method == "GET":
        return None

    raw = request.headers.get("Authorization", "")
    if not raw.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"detail": "Authentication required"})
    try:
        user = authenticate_token(raw[7:], db)
    except Exception:
        return JSONResponse(status_code=401, content={"detail": "Invalid or expired session"})
    if path.startswith("/admin/"):
        if not is_staff(user):
            return JSONResponse(status_code=403, content={"detail": "Staff role required"})
        return None
    if path in ACCOUNT_PREFIXES or any(path.startswith(p + "/") for p in ACCOUNT_PREFIXES):
        return None
    if request.method == "GET" and re.fullmatch(r"/auth/drafts(?:/[0-9]+)?", path):
        return None
    if user.role == "teacher":
        # Teachers are not global administrators and may only enter assigned forums.
        assigned = db.query(TeacherForumAssignment.forum_id).filter(
            TeacherForumAssignment.teacher_id == user.id).all()
        allowed_ids = {i[0] for i in assigned}
        approved = db.query(TeacherApplication).filter_by(
            user_id=user.id,status="approved").first()
        if not approved:
            return JSONResponse(status_code=403, content={"detail":"Teacher approval required"})
        match = re.match(r"^/auth/forums/(\d+)(?:/|$)",path)
        if match:
            fid = int(match.group(1))
            if fid not in allowed_ids:
                return JSONResponse(status_code=403,content={"detail":"Forum not assigned to this teacher"})
            # Classroom teachers teach and discuss; forum administration belongs to Admins.
            protected = ("/members/", "/join-requests", "/invite", "/invitations",
                         "/banned-members", "/pin", "/unpin", "/kick", "/ban")
            if (path == f"/auth/forums/{fid}" and request.method in ("PUT","DELETE")) or (
                request.method not in ("GET", "HEAD") and any(part in path for part in protected)
            ):
                return JSONResponse(status_code=403,content={"detail":"Classroom moderation requires an administrator"})
            # Also guard forum upload endpoints that take forum_id in form data.
            return None
        match = re.match(r"^/auth/problems/(?:id/)?(\d+)(?:/|$)",path)
        if match:
            problem=db.get(Problem,int(match.group(1)))
            if problem and problem.forum_id in allowed_ids:
                return None
        if path in ("/auth/notifications","/auth/notifications/unread-count") or path.startswith("/auth/notifications/"):
            return None
        # Legacy global feeds/search/problem lists and admin APIs remain blocked.
        return JSONResponse(status_code=403,content={"detail":"Teacher access is restricted to assigned classes"})

    return None
