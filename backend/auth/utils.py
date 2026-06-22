import os
from datetime import datetime, timedelta

import jwt
from dotenv import load_dotenv
from passlib.hash import bcrypt

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")

JWT_EXP_HOURS = int(os.getenv("JWT_EXP_HOURS", 24))


def hash_password(password: str) -> str:
    return bcrypt.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.verify(password, hashed)


def create_jwt(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXP_HOURS),
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

    return token