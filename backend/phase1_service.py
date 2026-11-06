"""Role authorization and account-based learning feature availability."""
from fastapi import HTTPException
from models import User

STAFF_ROLES = {"moderator", "reviewer", "admin", "super_admin"}
SUPER_ROLES = {"super_admin"}
PRIVILEGED_ROLES = STAFF_ROLES | {"teacher"}

def is_staff(user):
    return bool(user and (user.role in STAFF_ROLES or user.is_superuser))

def is_super_admin(user):
    return bool(user and (user.role == "super_admin" or user.is_superuser))

def require_staff(user):
    if not is_staff(user):
        raise HTTPException(status_code=403, detail="Reviewer/Admin access required")
    return user

def require_super(user):
    if not is_super_admin(user):
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user

LEARNING_FEATURES = ("forum", "meet", "material", "test", "tutoring")

def has_feature(user, feature):
    """Billing fields are intentionally ignored. Resource permissions still apply."""
    return bool(user and user.is_active and not user.is_banned
                and feature in LEARNING_FEATURES)

def require_feature(user, feature):
    if not has_feature(user, feature):
        raise HTTPException(status_code=403, detail="Active account required")
    return user
