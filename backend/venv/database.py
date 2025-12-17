from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

from sqlalchemy.pool import NullPool

# Use environment variable for database URL, fallback to localhost for development
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://science_user:secure_password@localhost:5432/sciencepioneers")

engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,  # Disable pooling to prevent SSL closed unexpectedly errors
    echo=False           # Set to True for SQL debugging
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()