import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# In production (Render), DATABASE_URL is provided automatically as an
# environment variable once you link a Postgres database to this service.
# Locally, it falls back to your own PostgreSQL install.
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:96768%40Sr@localhost:5432/form_builder"
)

# Render's DATABASE_URL sometimes starts with "postgres://" (old style);
# SQLAlchemy needs "postgresql://" instead.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()