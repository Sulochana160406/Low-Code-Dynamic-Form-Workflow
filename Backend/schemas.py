from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# ---------------- AUTH ----------------

class UserRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ---------------- FORM ----------------

class FormCreate(BaseModel):
    title: str
    description: Optional[str] = None


class FormUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    expires_at: Optional[datetime] = None


# ---------------- FORM VERSION ----------------

class FormVersionCreate(BaseModel):
    form_id: int
    version_number: int
    status: Optional[str] = "Published"


# ---------------- FIELD ----------------

class FieldCreate(BaseModel):
    form_id: int
    field_label: str
    field_type: str
    required: bool = False

    min_length: Optional[int] = None
    max_length: Optional[int] = None

    min_value: Optional[float] = None
    max_value: Optional[float] = None
    allow_decimal: Optional[bool] = True

    min_date: Optional[date] = None
    max_date: Optional[date] = None

    allowed_file_types: Optional[str] = None
    max_file_size: Optional[int] = None

    rating_scale: Optional[int] = None


class FieldUpdate(BaseModel):
    field_label: Optional[str] = None
    field_type: Optional[str] = None
    required: Optional[bool] = None

    min_length: Optional[int] = None
    max_length: Optional[int] = None

    min_value: Optional[float] = None
    max_value: Optional[float] = None
    allow_decimal: Optional[bool] = None

    min_date: Optional[date] = None
    max_date: Optional[date] = None

    allowed_file_types: Optional[str] = None
    max_file_size: Optional[int] = None

    rating_scale: Optional[int] = None


class FieldOrderItem(BaseModel):
    field_id: int
    order: int


class FieldReorderRequest(BaseModel):
    fields: List[FieldOrderItem]


class FieldForCreate(BaseModel):
    field_label: str
    field_type: str
    required: bool = False

    min_length: Optional[int] = None
    max_length: Optional[int] = None

    min_value: Optional[float] = None
    max_value: Optional[float] = None
    allow_decimal: Optional[bool] = True

    min_date: Optional[date] = None
    max_date: Optional[date] = None

    allowed_file_types: Optional[str] = None
    max_file_size: Optional[int] = None

    rating_scale: Optional[int] = None

    options: Optional[List[str]] = []


class FormWithFieldsCreate(BaseModel):
    title: str
    description: Optional[str] = None
    fields: List[FieldForCreate]


# ---------------- FIELD OPTIONS ----------------

class FieldOptionCreate(BaseModel):
    field_id: int
    option_value: str


# ---------------- CONDITIONAL RULES ----------------

class ConditionalRuleCreate(BaseModel):
    form_id: int
    trigger_field_id: int
    operator: str  # equals, not_equals, contains, greater_than, is_empty
    comparison_value: Optional[str] = None
    target_field_id: int
    action: str  # show, hide, require


# ---------------- SUBMISSIONS ----------------

class SubmissionCreate(BaseModel):
    form_id: int
    version_number: int
    submitted_by: str


class ResponseValueCreate(BaseModel):
    submission_id: int
    field_id: int
    value: str


class ResponseItem(BaseModel):
    field_id: int
    value: str


class SubmitFormCreate(BaseModel):
    submitted_by: Optional[str] = None
    responses: List[ResponseItem]
    # If the frontend pinged /public/.../start when the form was opened, it
    # passes that submission's id back here so the SAME row gets marked
    # Completed (with an accurate started_at → submitted_at duration)
    # instead of a brand-new row being created with no start time.
    submission_id: Optional[int] = None
    # Present only when the respondent came in through a one-time link
    # (?ott=...). Checked and marked used at submit time.
    one_time_token: Optional[str] = None


# ---------------- MILESTONE 3: BULK DELETE / RETENTION ----------------

class BulkDeleteRequest(BaseModel):
    response_ids: List[int]
    soft: bool = True  # True = mark status "Deleted"; False = permanently remove


class RetentionPolicyUpdate(BaseModel):
    retention_days: int
    is_enabled: bool


class SendLinkRequest(BaseModel):
    emails: List[str]


class SendLinkRequest(BaseModel):
    email: str