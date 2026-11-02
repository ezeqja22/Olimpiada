"""Authoritative role, subscription and feature authorization."""
from calendar import monthrange
from datetime import datetime
from fastapi import HTTPException
from models import User

PLANS = {
    "basic": {"name": "Basic", "monthly_all": 1000, "features": ["forum"]},
    "medium": {"name": "Medium", "monthly_all": 2500, "features": ["forum", "meet", "material", "test"]},
    "premium": {"name": "Premium", "monthly_all": 2500, "features": ["forum", "meet", "material", "test", "tutoring"]},
}
STAFF_ROLES = {"moderator", "reviewer", "admin", "super_admin"}
SUPER_ROLES = {"super_admin"}
PRIVILEGED_ROLES = STAFF_ROLES | {"teacher"}

def is_staff(user):
    return bool(user and (user.role in STAFF_ROLES or user.is_superuser))

def is_super_admin(user):
    return bool(user and (user.role == "super_admin" or user.is_superuser))

def add_months(value, months):
    month_index = value.year * 12 + (value.month - 1) + months
    year, month_zero = divmod(month_index, 12)
    month = month_zero + 1
    return value.replace(year=year, month=month, day=min(value.day, monthrange(year, month)[1]))

def effective_plan(user, now=None):
    if user is None:
        return "guest"
    if is_staff(user):
        return "staff"
    now = now or datetime.utcnow()
    if user.subscription_plan in PLANS and user.subscription_expires_at and user.subscription_expires_at > now:
        return user.subscription_plan
    if user.trial_expires_at and user.trial_expires_at > now:
        return "medium"
    return "free"

def has_feature(user, feature):
    plan = effective_plan(user)
    return plan == "staff" or feature in PLANS.get(plan, {}).get("features", [])

def require_feature(user, feature):
    if not has_feature(user, feature):
        raise HTTPException(status_code=402, detail={"code": "SUBSCRIPTION_REQUIRED", "feature": feature, "upgrade_url": "/pricing"})
    return user

def require_staff(user):
    if not is_staff(user):
        raise HTTPException(status_code=403, detail="Reviewer/Admin access required")
    return user

def require_super(user):
    if not is_super_admin(user):
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user
