from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://postgres:96768%40Sr@localhost:5432/form_builder"

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