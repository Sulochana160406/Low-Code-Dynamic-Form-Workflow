from sqlalchemy import Column, Integer, String, Boolean, Float, Date
import uuid
from sqlalchemy.orm import declarative_base

Base = declarative_base()


# ---------------- FORMS ----------------

class Form(Base):
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(500))
    status = Column(String(50), default="Draft")


# ---------------- FORM VERSIONS ----------------

class FormVersion(Base):
    __tablename__ = "form_versions"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, nullable=False)
    version_number = Column(Integer, nullable=False)

    uuid = Column(
        String(100),
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4())
    )

    status = Column(String(50), default="Published")


# ---------------- FIELDS ----------------

class Field(Base):
    __tablename__ = "fields"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, nullable=False)

    field_label = Column(String(255), nullable=False)
    field_type = Column(String(100), nullable=False)
    required = Column(Boolean, default=False)
    order = Column(Integer, nullable=False, default=0)

    # Text Field
    min_length = Column(Integer, nullable=True)
    max_length = Column(Integer, nullable=True)

    # Number Field
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    allow_decimal = Column(Boolean, default=True)

    # Date Field
    min_date = Column(Date, nullable=True)
    max_date = Column(Date, nullable=True)

    # File Upload
    allowed_file_types = Column(String(255), nullable=True)
    max_file_size = Column(Integer, nullable=True)

    # Rating
    rating_scale = Column(Integer, nullable=True)

    # Versioning: NULL = this is the live/editable draft field.
    # A non-null value means this row is a frozen snapshot copy
    # that belongs to that published FormVersion.id, and must
    # never be edited again once created.
    version_id = Column(Integer, nullable=True)


# ---------------- FIELD OPTIONS ----------------

class FieldOption(Base):
    __tablename__ = "field_options"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, nullable=False)
    option_value = Column(String(255), nullable=False)


# ---------------- CONDITIONAL RULES ----------------
# "IF Trigger Field <operator> Comparison Value THEN Action Target Field"

class ConditionalRule(Base):
    __tablename__ = "conditional_rules"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, nullable=False)

    trigger_field_id = Column(Integer, nullable=False)
    operator = Column(String(50), nullable=False, default="equals")
    comparison_value = Column(String(255), nullable=True)

    target_field_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)  # show, hide, require

    # NULL = live/editable draft rule. Non-null = frozen snapshot
    # copy belonging to that published FormVersion.id.
    version_id = Column(Integer, nullable=True)


# ---------------- SUBMISSIONS ----------------

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    submitted_by = Column(String(255), nullable=False)


# ---------------- RESPONSE VALUES ----------------

class ResponseValue(Base):
    __tablename__ = "response_values"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, nullable=False)
    field_id = Column(Integer, nullable=False)
    value = Column(String(500), nullable=False)


# ---------------- UPLOADED FILES ----------------

class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, nullable=False)
    field_id = Column(Integer, nullable=False)

    original_name = Column(String(255), nullable=False)
    stored_name = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=False)
