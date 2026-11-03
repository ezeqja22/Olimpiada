"""Default-deny API feature gate: never deliver premium payloads to free accounts."""
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from auth.dependencies import authenticate_token
from phase1_service import is_staff, has_feature
from phase2_service import can_enter_forum, is_teacher_or_staff
from models import Forum, Problem, TeacherApplication, TeacherForumAssignment
import re

# Only auth/account management, public discovery and subscription actions bypass the paywall.
PUBLIC_AUTH = {
    "/auth/login", "/auth/register", "/auth/send-verification",
    "/auth/verify-email", "/auth/forgot-password", "/auth/reset-password",
}
ACCOUNT_PREFIXES = (
    "/auth/me", "/auth/user/profile", "/auth/verify-password",
    "/auth/change-password", "/auth/delete-account", "/auth/notification-preferences",
    "/auth/notifications", "/auth/notifications/unread-count", "/auth/notifications/mark-all-read",
)
FORUM_PREFIXES = (
    "/auth/forums", "/auth/forum", "/auth/typing", "/auth/online",
)
# Some basic forum exercise endpoints use /auth/problems, but are not made public here.
# They must be reviewed before allowing additional access.
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
    # The draft read handlers filter by the authenticated owner's ID.
    if request.method == "GET" and re.fullmatch(r"/auth/drafts(?:/[0-9]+)?", path):
        return None
    if not user.is_verified:
        return JSONResponse(status_code=403, content={"detail": "Verify your email before accessing paid content"})
    if path == "/auth/forums" and request.method == "POST" and not is_staff(user):
        return JSONResponse(status_code=403, content={"detail": "Only teachers and admins can create forums"})
    if path in ("/auth/forums/upload-image",) and not is_staff(user):
        return JSONResponse(status_code=403, content={"detail": "Only admins can upload general forum media"})
    if is_staff(user):
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

    forum_match = re.match(r"^/auth/forums/(\d+)(?:/|$)", path)
    if forum_match:
        forum = db.get(Forum, int(forum_match.group(1)))
        if not forum:
            return JSONResponse(status_code=404, content={"detail": "Forum not found"})
        if not can_enter_forum(user, forum, db):
            return JSONResponse(status_code=403, content={"detail": "Forum requires appropriate subscription or membership"})
        # Paid subscription does not grant moderation privileges.
        privileged_paths = ("/members/", "/join-requests/", "/invite",
                            "/invitations", "/banned-members", "/pin", "/unpin", "/kick", "/ban")
        if request.method not in ("GET", "HEAD") and any(part in path for part in privileged_paths):
            return JSONResponse(status_code=403, content={"detail": "Forum moderation requires Admin"})
        # Only teachers and admins can alter forum settings or post files/system content.
        if (path == f"/auth/forums/{forum.id}" and request.method in ("PUT", "DELETE")) and not is_teacher_or_staff(user):
            return JSONResponse(status_code=403, content={"detail": "Only teachers and admins can manage forums"})
        if ("/upload-file" in path or "/invite" in path or "/join-requests/" in path) and request.method != "GET":
            if not is_teacher_or_staff(user):
                return JSONResponse(status_code=403, content={"detail": "Only teachers and admins may manage forum uploads/invitations"})
        return None

    problem_match = re.match(r"^/auth/problems/(?:id/)?(\d+)(?:/|$)", path)
    if problem_match:
        problem = db.get(Problem, int(problem_match.group(1)))
        if problem and problem.forum_id:
            forum = db.get(Forum, problem.forum_id)
            if not can_enter_forum(user, forum, db):
                return JSONResponse(status_code=403, content={"detail": "Forum access required"})
            return None

    feature = "forum" if any(path == p or path.startswith(p + "/") for p in FORUM_PREFIXES) else "material"
    if not has_feature(user, feature):
        return JSONResponse(status_code=402, content={"detail": {"code": "SUBSCRIPTION_REQUIRED", "feature": feature, "upgrade_url": "/pricing"}})
    return None
