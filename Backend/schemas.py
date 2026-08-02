from pydantic import BaseModel
from typing import Optional
from datetime import date


# ---------------- FORMS ----------------

class FormCreate(BaseModel):
    title: str
    description: str


class FormUpdate(BaseModel):
    title: str
    description: str
    status: str


# ---------------- FORM VERSIONS ----------------

class FormVersionCreate(BaseModel):
    form_id: int
    version_number: int


# ---------------- FIELDS ----------------

class FieldCreate(BaseModel):
    form_id: int
    field_label: str
    field_type: str
    required: bool

    # Text Field
    min_length: Optional[int] = None
    max_length: Optional[int] = None

    # Number Field
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    allow_decimal: Optional[bool] = True

    # Date Field
    min_date: Optional[date] = None
    max_date: Optional[date] = None

    # File Upload
    allowed_file_types: Optional[str] = None
    max_file_size: Optional[int] = None

    # Rating
    rating_scale: Optional[int] = None


# ---------------- FIELD OPTIONS ----------------

class FieldOptionCreate(BaseModel):
    field_id: int
    option_value: str


# ---------------- CONDITIONAL RULES ----------------

class ConditionalRuleCreate(BaseModel):
    field_id: int
    condition_value: str
    target_field_id: int
    action: str


# ---------------- SUBMISSIONS ----------------

class SubmissionCreate(BaseModel):
    form_id: int
    submitted_by: str


# ---------------- RESPONSE VALUES ----------------

class ResponseValueCreate(BaseModel):
    submission_id: int
    field_id: int
    value: str
# ---------------- CREATE FORM WITH FIELDS ----------------

class FieldData(BaseModel):

    field_label: str
    field_type: str
    required: bool

    options: Optional[list[str]] = []

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
class FormWithFieldsCreate(BaseModel):
    title: str
    description: str
    fields: list[FieldData]
# ---------------- SUBMIT FORM ----------------

class ResponseItem(BaseModel):
    field_id: int
    value: str


class SubmitFormCreate(BaseModel):
    submitted_by: str
    responses: list[ResponseItem]