import os
import re
import io
import csv
import json
import shutil
import time
import hmac
import hashlib
import uuid as uuid_lib
from datetime import date, datetime, timedelta

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form as FastAPIForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from database import engine, get_db
from models import (
    Base,
    User,
    Form,
    FormVersion,
    Field,
    FieldOption,
    ConditionalRule,
    Submission,
    ResponseValue,
    UploadedFile,
    AuditLog,
    RetentionPolicy,
)
from schemas import (
    UserRegister,
    UserLogin,
    TokenResponse,
    FormCreate,
    FormUpdate,
    FieldCreate,
    FieldUpdate,
    FieldReorderRequest,
    FieldOptionCreate,
    ConditionalRuleCreate,
    FormWithFieldsCreate,
    SubmitFormCreate,
    BulkDeleteRequest,
    RetentionPolicyUpdate,
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

app = FastAPI()

# Create any tables that don't exist yet. Safe to run every startup —
# it only CREATES missing tables, never touches ones that already
# exist. This is what sets up the database schema on a brand-new
# deployment (e.g. Render) where there's no shell access to run this
# manually on the free tier.
Base.metadata.create_all(bind=engine)

# --- Lightweight migration: submissions needs new columns for Milestone 3 ---
# create_all() only creates brand-new tables (like the new audit_logs and
# retention_policies tables below), it never alters existing ones. The
# `submissions` table already existed before analytics/retention were
# added, so the new columns have to be added by hand here.
with engine.connect() as _conn:
    from sqlalchemy import inspect as _inspect, text as _text

    _submission_columns = [c["name"] for c in _inspect(engine).get_columns("submissions")]
    if "status" not in _submission_columns:
        _conn.execute(_text("ALTER TABLE submissions ADD COLUMN status VARCHAR(50) DEFAULT 'Completed'"))
        _conn.execute(_text("ALTER TABLE submissions ADD COLUMN started_at TIMESTAMP"))
        _conn.execute(_text("ALTER TABLE submissions ADD COLUMN submitted_at TIMESTAMP"))
        _conn.execute(_text("ALTER TABLE submissions ADD COLUMN completion_time_seconds INTEGER"))
        _conn.execute(_text("UPDATE submissions SET status = 'Completed' WHERE status IS NULL"))
        # Submissions created via the /start ping have no submitter name
        # yet, so the old NOT NULL constraint on submitted_by has to go.
        _conn.execute(_text("ALTER TABLE submissions ALTER COLUMN submitted_by DROP NOT NULL"))
        _conn.commit()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")

# In production (Render/Vercel), these are set as real environment
# variables pointing at the live URLs. Locally, they fall back to
# your own machine's addresses, so nothing changes for local dev.
BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Files are NOT served via a plain static mount on purpose — every
# download must go through /download/{stored_name} with a valid,
# time-limited signature (see generate_signed_url / verify_signed_url
# below). This is what makes the URL "access-controlled" rather than
# just "hidden by an unguessable name".

FILE_SIGNING_SECRET = "low-code-form-platform-file-signing-secret"  # local-dev secret; move to an env var for real deployment
SIGNED_URL_TTL_SECONDS = 3600  # links expire 1 hour after they're issued


def generate_signed_url(stored_name: str) -> str:
    expires = int(time.time()) + SIGNED_URL_TTL_SECONDS
    message = f"{stored_name}:{expires}".encode()
    signature = hmac.new(FILE_SIGNING_SECRET.encode(), message, hashlib.sha256).hexdigest()
    return f"{BACKEND_URL}/download/{stored_name}?expires={expires}&sig={signature}"


def verify_signed_url(stored_name: str, expires: int, signature: str) -> bool:
    if int(time.time()) > expires:
        return False
    message = f"{stored_name}:{expires}".encode()
    expected = hmac.new(FILE_SIGNING_SECRET.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@app.get("/")
def home():
    return {"message": "Welcome to Low-Code Dynamic Form Workflow Platform"}


# =========================================================
# AUTH  (protects the admin dashboard — public form-fill routes
# under /public/... and /download/... stay open, unauthenticated)
# =========================================================

@app.post("/auth/register")
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Registration is only open until the FIRST admin account is created.
    # After that, this endpoint is locked — otherwise anyone who finds the
    # link could create their own admin account and get full dashboard
    # access, defeating the whole point of adding auth.
    if db.query(User).count() > 0:
        raise HTTPException(
            status_code=403,
            detail="Registration is closed. An admin account already exists — please log in instead.",
        )

    existing = db.query(User).filter(User.email == user_data.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    if len(user_data.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")

    new_user = User(
        email=user_data.email.lower().strip(),
        name=user_data.name,
        hashed_password=hash_password(user_data.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id, new_user.email)
    return TokenResponse(
        access_token=token,
        user={"id": new_user.id, "email": new_user.email, "name": new_user.name},
    )


@app.post("/auth/login")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower().strip()).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "email": user.email, "name": user.name},
    )


@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "name": current_user.name}


# =========================================================
# FORMS
# =========================================================

@app.post("/forms")
def create_form(form: FormCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_form = Form(title=form.title, description=form.description, status="Draft")
    db.add(new_form)
    db.commit()
    db.refresh(new_form)
    return new_form


@app.get("/forms")
def get_forms(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Form).order_by(Form.id.desc()).all()


@app.get("/forms/{form_id}")
def get_form(form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    fields = (
        db.query(Field)
        .filter(Field.form_id == form_id, Field.version_id.is_(None))
        .order_by(Field.order.asc(), Field.id.asc())
        .all()
    )

    field_list = []
    for field in fields:
        options = db.query(FieldOption).filter(FieldOption.field_id == field.id).all()
        field_list.append({
            "id": field.id,
            "field_label": field.field_label,
            "field_type": field.field_type,
            "required": field.required,
            "order": field.order,
            "min_length": field.min_length,
            "max_length": field.max_length,
            "min_value": field.min_value,
            "max_value": field.max_value,
            "allow_decimal": field.allow_decimal,
            "min_date": field.min_date,
            "max_date": field.max_date,
            "allowed_file_types": field.allowed_file_types,
            "max_file_size": field.max_file_size,
            "rating_scale": field.rating_scale,
            "options": [o.option_value for o in options],
        })

    rules = (
        db.query(ConditionalRule)
        .filter(ConditionalRule.form_id == form_id, ConditionalRule.version_id.is_(None))
        .all()
    )

    return {
        "id": form.id,
        "title": form.title,
        "description": form.description,
        "status": form.status,
        "fields": field_list,
        "conditional_rules": [
            {
                "id": r.id,
                "trigger_field_id": r.trigger_field_id,
                "operator": r.operator,
                "comparison_value": r.comparison_value,
                "target_field_id": r.target_field_id,
                "action": r.action,
            }
            for r in rules
        ],
    }


@app.put("/forms/{form_id}")
def update_form(form_id: int, updated: FormUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    data = updated.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(form, key, value)

    db.commit()
    db.refresh(form)
    return form


@app.delete("/forms/{form_id}")
def delete_form(form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    field_ids = [f.id for f in db.query(Field).filter(Field.form_id == form_id).all()]
    db.query(FieldOption).filter(FieldOption.field_id.in_(field_ids)).delete(synchronize_session=False)
    db.query(Field).filter(Field.form_id == form_id).delete(synchronize_session=False)
    db.query(ConditionalRule).filter(ConditionalRule.form_id == form_id).delete(synchronize_session=False)
    db.query(FormVersion).filter(FormVersion.form_id == form_id).delete(synchronize_session=False)
    db.query(Form).filter(Form.id == form_id).delete(synchronize_session=False)

    db.commit()
    return {"message": "Form deleted successfully!"}


@app.put("/forms/{form_id}/archive")
def archive_form(form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    form.status = "Archived"
    db.commit()
    db.refresh(form)
    return {"message": "Form archived successfully!", "data": {"id": form.id, "title": form.title, "status": form.status}}


@app.post("/forms-with-fields")
def create_form_with_fields(form_data: FormWithFieldsCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_form = Form(title=form_data.title, description=form_data.description, status="Draft")
    db.add(new_form)
    db.commit()
    db.refresh(new_form)

    for index, field in enumerate(form_data.fields):
        new_field = Field(
            form_id=new_form.id,
            field_label=field.field_label,
            field_type=field.field_type,
            required=field.required,
            order=index,
            min_length=field.min_length,
            max_length=field.max_length,
            min_value=field.min_value,
            max_value=field.max_value,
            allow_decimal=field.allow_decimal,
            min_date=field.min_date,
            max_date=field.max_date,
            allowed_file_types=field.allowed_file_types,
            max_file_size=field.max_file_size,
            rating_scale=field.rating_scale,
        )
        db.add(new_field)
        db.commit()
        db.refresh(new_field)

        for option in (field.options or []):
            db.add(FieldOption(field_id=new_field.id, option_value=option))
        db.commit()

    return {"message": "Form created successfully with fields", "form_id": new_form.id}


# =========================================================
# FIELDS
# =========================================================

@app.post("/fields")
def create_field(field: FieldCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    last_field = (
        db.query(Field)
        .filter(Field.form_id == field.form_id, Field.version_id.is_(None))
        .order_by(Field.order.desc())
        .first()
    )
    next_order = (last_field.order + 1) if last_field else 0

    new_field = Field(
        form_id=field.form_id,
        field_label=field.field_label,
        field_type=field.field_type,
        required=field.required,
        order=next_order,
        min_length=field.min_length,
        max_length=field.max_length,
        min_value=field.min_value,
        max_value=field.max_value,
        allow_decimal=field.allow_decimal,
        min_date=field.min_date,
        max_date=field.max_date,
        allowed_file_types=field.allowed_file_types,
        max_file_size=field.max_file_size,
        rating_scale=field.rating_scale,
    )
    db.add(new_field)
    db.commit()
    db.refresh(new_field)

    return {
        "message": "Field created successfully!",
        "data": {
            "id": new_field.id, "form_id": new_field.form_id, "field_label": new_field.field_label,
            "field_type": new_field.field_type, "required": new_field.required, "order": new_field.order,
            "min_length": new_field.min_length, "max_length": new_field.max_length,
            "min_value": new_field.min_value, "max_value": new_field.max_value,
            "allow_decimal": new_field.allow_decimal, "min_date": new_field.min_date, "max_date": new_field.max_date,
            "allowed_file_types": new_field.allowed_file_types, "max_file_size": new_field.max_file_size,
            "rating_scale": new_field.rating_scale,
        }
    }


@app.get("/fields")
def get_fields(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Field).order_by(Field.order.asc(), Field.id.asc()).all()

@app.put("/fields/{field_id}")
def update_field(field_id: int, updated_field: FieldUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    for key, value in updated_field.dict(exclude_unset=True).items():
        setattr(field, key, value)

    db.commit()
    db.refresh(field)
    return {"message": "Field updated successfully!", "data": {"id": field.id, "field_label": field.field_label}}


@app.delete("/fields/{field_id}")
def delete_field(field_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    db.query(FieldOption).filter(FieldOption.field_id == field_id).delete()
    db.delete(field)
    db.commit()
    return {"message": "Field deleted successfully!", "deleted_field_id": field_id}


@app.put("/forms/{form_id}/fields/reorder")
def reorder_fields(form_id: int, payload: FieldReorderRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    for item in payload.fields:
        field = db.query(Field).filter(Field.id == item.field_id, Field.form_id == form_id).first()
        if not field:
            raise HTTPException(status_code=404, detail=f"Field {item.field_id} not found on this form")
        field.order = item.order

    db.commit()

    fields = db.query(Field).filter(Field.form_id == form_id, Field.version_id.is_(None)).order_by(Field.order.asc()).all()
    return {"message": "Fields reordered successfully!", "fields": [{"id": f.id, "order": f.order} for f in fields]}


# =========================================================
# FIELD OPTIONS
# =========================================================

@app.post("/field-options")
def create_field_option(option: FieldOptionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_option = FieldOption(field_id=option.field_id, option_value=option.option_value)
    db.add(new_option)
    db.commit()
    db.refresh(new_option)
    return {"message": "Field option created successfully!", "data": {"id": new_option.id, "field_id": new_option.field_id, "option_value": new_option.option_value}}


@app.get("/field-options")
def get_field_options(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(FieldOption).all()


# =========================================================
# CONDITIONAL RULES  (Module 2)
# =========================================================

VALID_OPERATORS = {"equals", "not_equals", "contains", "greater_than", "is_empty"}
VALID_ACTIONS = {"show", "hide", "require"}


@app.post("/conditional-rules")
def create_conditional_rule(rule: ConditionalRuleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if rule.operator not in VALID_OPERATORS:
        raise HTTPException(status_code=422, detail=f"Invalid operator. Must be one of {sorted(VALID_OPERATORS)}")
    if rule.action not in VALID_ACTIONS:
        raise HTTPException(status_code=422, detail=f"Invalid action. Must be one of {sorted(VALID_ACTIONS)}")

    new_rule = ConditionalRule(
        form_id=rule.form_id,
        trigger_field_id=rule.trigger_field_id,
        operator=rule.operator,
        comparison_value=rule.comparison_value,
        target_field_id=rule.target_field_id,
        action=rule.action,
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return {"message": "Conditional rule created successfully!", "data": {"id": new_rule.id}}


@app.get("/conditional-rules")
def get_conditional_rules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ConditionalRule).filter(ConditionalRule.version_id.is_(None)).all()


@app.get("/forms/{form_id}/conditional-rules")
def get_form_conditional_rules(form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ConditionalRule).filter(
        ConditionalRule.form_id == form_id, ConditionalRule.version_id.is_(None)
    ).all()


@app.delete("/conditional-rules/{rule_id}")
def delete_conditional_rule(rule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rule = db.query(ConditionalRule).filter(ConditionalRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"message": "Conditional rule deleted successfully!"}


def evaluate_condition(operator: str, trigger_value, comparison_value) -> bool:
    """Evaluate a single conditional rule's trigger side."""
    trigger_str = "" if trigger_value is None else str(trigger_value).strip()
    compare_str = "" if comparison_value is None else str(comparison_value).strip()

    if operator == "is_empty":
        return trigger_str == ""
    if operator == "equals":
        return trigger_str.lower() == compare_str.lower()
    if operator == "not_equals":
        return trigger_str.lower() != compare_str.lower()
    if operator == "contains":
        return compare_str.lower() in trigger_str.lower()
    if operator == "greater_than":
        try:
            return float(trigger_str) > float(compare_str)
        except (ValueError, TypeError):
            return False
    return False


# =========================================================
# PUBLISH  (freeze schema into a versioned snapshot)
# =========================================================

@app.put("/forms/{form_id}/publish")
def publish_form(form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    live_fields = db.query(Field).filter(Field.form_id == form_id, Field.version_id.is_(None)).order_by(Field.order.asc()).all()
    if not live_fields:
        raise HTTPException(status_code=400, detail="Cannot publish a form with no fields.")

    last_version = db.query(FormVersion).filter(FormVersion.form_id == form_id).order_by(FormVersion.version_number.desc()).first()
    next_version_number = (last_version.version_number + 1) if last_version else 1

    new_version = FormVersion(
        form_id=form_id,
        version_number=next_version_number,
        uuid=str(uuid_lib.uuid4()),
        status="Published",
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)

    old_to_new_field_id = {}

    for field in live_fields:
        snapshot_field = Field(
            form_id=form_id,
            field_label=field.field_label,
            field_type=field.field_type,
            required=field.required,
            order=field.order,
            min_length=field.min_length,
            max_length=field.max_length,
            min_value=field.min_value,
            max_value=field.max_value,
            allow_decimal=field.allow_decimal,
            min_date=field.min_date,
            max_date=field.max_date,
            allowed_file_types=field.allowed_file_types,
            max_file_size=field.max_file_size,
            rating_scale=field.rating_scale,
            version_id=new_version.id,
        )
        db.add(snapshot_field)
        db.commit()
        db.refresh(snapshot_field)
        old_to_new_field_id[field.id] = snapshot_field.id

        options = db.query(FieldOption).filter(FieldOption.field_id == field.id).all()
        for option in options:
            db.add(FieldOption(field_id=snapshot_field.id, option_value=option.option_value))
    db.commit()

    live_rules = db.query(ConditionalRule).filter(ConditionalRule.form_id == form_id, ConditionalRule.version_id.is_(None)).all()
    for rule in live_rules:
        if rule.trigger_field_id in old_to_new_field_id and rule.target_field_id in old_to_new_field_id:
            db.add(ConditionalRule(
                form_id=form_id,
                trigger_field_id=old_to_new_field_id[rule.trigger_field_id],
                operator=rule.operator,
                comparison_value=rule.comparison_value,
                target_field_id=old_to_new_field_id[rule.target_field_id],
                action=rule.action,
                version_id=new_version.id,
            ))
    db.commit()

    form.status = "Published"
    db.commit()

    return {
        "message": "Form published successfully!",
        "data": {"id": form.id, "title": form.title, "status": form.status, "version": new_version.version_number, "uuid": new_version.uuid},
    }


# =========================================================
# PUBLIC ACCESS
# =========================================================

@app.get("/public/forms/{form_id}")
def get_public_form(form_id: int, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    fields = db.query(Field).filter(Field.form_id == form_id, Field.version_id.is_(None)).order_by(Field.order.asc()).all()

    field_list = []
    for field in fields:
        options = db.query(FieldOption).filter(FieldOption.field_id == field.id).all()
        field_list.append(_field_to_public_dict(field, options))

    rules = db.query(ConditionalRule).filter(ConditionalRule.form_id == form_id, ConditionalRule.version_id.is_(None)).all()

    return {
        "id": form.id, "title": form.title, "description": form.description, "status": form.status,
        "fields": field_list,
        "conditional_rules": [_rule_to_dict(r) for r in rules],
    }


@app.get("/public/form/{form_uuid}")
def get_public_form_by_uuid(form_uuid: str, db: Session = Depends(get_db)):
    version = db.query(FormVersion).filter(FormVersion.uuid == form_uuid).first()
    if not version:
        raise HTTPException(status_code=404, detail="Form not found")

    form = db.query(Form).filter(Form.id == version.form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    fields = db.query(Field).filter(Field.version_id == version.id).order_by(Field.order.asc()).all()

    field_list = []
    for field in fields:
        options = db.query(FieldOption).filter(FieldOption.field_id == field.id).all()
        field_list.append(_field_to_public_dict(field, options))

    rules = db.query(ConditionalRule).filter(ConditionalRule.version_id == version.id).all()

    return {
        "uuid": version.uuid, "version": version.version_number, "id": form.id,
        "title": form.title, "description": form.description,
        "fields": field_list,
        "conditional_rules": [_rule_to_dict(r) for r in rules],
    }


def _field_to_public_dict(field, options):
    return {
        "id": field.id, "field_label": field.field_label, "field_type": field.field_type, "required": field.required,
        "min_length": field.min_length, "max_length": field.max_length,
        "min_value": field.min_value, "max_value": field.max_value, "allow_decimal": field.allow_decimal,
        "min_date": field.min_date, "max_date": field.max_date,
        "allowed_file_types": field.allowed_file_types, "max_file_size": field.max_file_size,
        "rating_scale": field.rating_scale,
        "options": [o.option_value for o in options],
    }


def _rule_to_dict(rule):
    return {
        "id": rule.id, "trigger_field_id": rule.trigger_field_id, "operator": rule.operator,
        "comparison_value": rule.comparison_value, "target_field_id": rule.target_field_id, "action": rule.action,
    }


@app.get("/forms/{form_id}/share")
def get_share_link(form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    version = db.query(FormVersion).filter(FormVersion.form_id == form_id).order_by(FormVersion.version_number.desc()).first()
    if not version:
        raise HTTPException(status_code=404, detail="Publish the form first.")
    return {"share_link": f"{FRONTEND_URL}/form/{version.uuid}"}


# =========================================================
# FILE UPLOAD HANDLING  (Module 2)
# =========================================================

ALLOWED_EXTENSION_GROUPS = None  # placeholder, uses field.allowed_file_types directly


@app.post("/public/forms/{form_id}/upload-file")
async def upload_file(
    form_id: int,
    field_id: int = FastAPIForm(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    if field.field_type != "file":
        raise HTTPException(status_code=422, detail="This field does not accept file uploads.")

    if field.allowed_file_types:
        allowed = [ext.strip().lower() for ext in field.allowed_file_types.split(",") if ext.strip()]
        ext = os.path.splitext(file.filename)[1].lower()
        if allowed and ext not in allowed:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid file type '{ext}'. Allowed types: {', '.join(allowed)}",
            )

    contents = await file.read()
    size_kb = len(contents) / 1024
    if field.max_file_size and size_kb > field.max_file_size:
        raise HTTPException(
            status_code=422,
            detail=f"File too large ({size_kb:.0f} KB). Max allowed is {field.max_file_size} KB.",
        )

    ext = os.path.splitext(file.filename)[1]
    stored_name = f"{uuid_lib.uuid4().hex}{ext}"
    stored_path = os.path.join(UPLOAD_DIR, stored_name)

    with open(stored_path, "wb") as f:
        f.write(contents)

    db.add(UploadedFile(
        submission_id=0,
        field_id=field_id,
        original_name=file.filename,
        stored_name=stored_name,
        content_type=file.content_type,
        file_size=len(contents),
    ))
    db.commit()

    signed_url = generate_signed_url(stored_name)

    return {
        "message": "File uploaded successfully!",
        "original_name": file.filename,
        "stored_name": stored_name,
        "url": signed_url,
        "size_kb": round(size_kb, 1),
        "content_type": file.content_type,
    }


@app.get("/download/{stored_name}")
def download_file(stored_name: str, expires: int, sig: str, db: Session = Depends(get_db)):
    if not verify_signed_url(stored_name, expires, sig):
        raise HTTPException(status_code=403, detail="This download link is invalid or has expired.")

    file_path = os.path.join(UPLOAD_DIR, stored_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    record = db.query(UploadedFile).filter(UploadedFile.stored_name == stored_name).first()
    download_name = record.original_name if record else stored_name

    return FileResponse(path=file_path, filename=download_name, media_type=record.content_type if record else None)


@app.get("/files/{stored_name}/fresh-link")
def get_fresh_download_link(stored_name: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = db.query(UploadedFile).filter(UploadedFile.stored_name == stored_name).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    return {
        "url": generate_signed_url(stored_name),
        "original_name": record.original_name,
    }


# =========================================================
# SERVER-SIDE VALIDATION  (Module 2)
# =========================================================

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_field_value(field: Field, value: str, skip_required: bool = False) -> list:
    errors = []
    value = "" if value is None else str(value)

    if field.required and not skip_required and value.strip() == "":
        errors.append(f"'{field.field_label}' is required.")
        return errors

    if value.strip() == "":
        return errors

    if field.field_type == "text":
        if field.min_length is not None and len(value) < field.min_length:
            errors.append(f"'{field.field_label}' must be at least {field.min_length} characters.")
        if field.max_length is not None and len(value) > field.max_length:
            errors.append(f"'{field.field_label}' must be at most {field.max_length} characters.")

    elif field.field_type == "email":
        if not EMAIL_REGEX.match(value):
            errors.append(f"'{field.field_label}' must be a valid email address.")

    elif field.field_type == "number":
        try:
            num = float(value)
        except ValueError:
            errors.append(f"'{field.field_label}' must be a number.")
        else:
            if not field.allow_decimal and num != int(num):
                errors.append(f"'{field.field_label}' must be a whole number.")
            if field.min_value is not None and num < field.min_value:
                errors.append(f"'{field.field_label}' must be at least {field.min_value}.")
            if field.max_value is not None and num > field.max_value:
                errors.append(f"'{field.field_label}' must be at most {field.max_value}.")

    elif field.field_type == "phone":
        if not value.isdigit():
            errors.append(f"'{field.field_label}' must contain digits only.")
        elif len(value) != 10:
            errors.append(f"'{field.field_label}' must be exactly 10 digits.")

    elif field.field_type == "date":
        try:
            parsed = datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            errors.append(f"'{field.field_label}' must be a valid date (YYYY-MM-DD).")
        else:
            if field.min_date and parsed < field.min_date:
                errors.append(f"'{field.field_label}' must be on or after {field.min_date}.")
            if field.max_date and parsed > field.max_date:
                errors.append(f"'{field.field_label}' must be on or before {field.max_date}.")

    elif field.field_type in ("dropdown", "multi-checkbox"):
        pass

    elif field.field_type == "rating":
        try:
            num = int(float(value))
        except ValueError:
            errors.append(f"'{field.field_label}' must be a number.")
        else:
            scale = field.rating_scale or 5
            if num < 1 or num > scale:
                errors.append(f"'{field.field_label}' must be between 1 and {scale}.")

    return errors


# =========================================================
# SUBMISSION HANDLER  (Module 2)
# =========================================================

@app.post("/public/forms/{form_id}/start")
def start_form(form_id: int, db: Session = Depends(get_db)):
    """Called once when a respondent opens the form. Creates an
    'In Progress' submission row so completion-rate analytics can compare
    how many people started vs. how many actually submitted."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    session = Submission(form_id=form_id, version_number=0, status="In Progress", started_at=datetime.utcnow())
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"submission_id": session.id}


@app.post("/public/form/{form_uuid}/start")
def start_form_by_uuid(form_uuid: str, db: Session = Depends(get_db)):
    version = db.query(FormVersion).filter(FormVersion.uuid == form_uuid).first()
    if not version:
        raise HTTPException(status_code=404, detail="Form not found")

    session = Submission(
        form_id=version.form_id, version_number=version.version_number,
        status="In Progress", started_at=datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"submission_id": session.id}


@app.post("/public/forms/{form_id}/submit")
def submit_form(form_id: int, submission_data: SubmitFormCreate, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    fields = db.query(Field).filter(Field.form_id == form_id, Field.version_id.is_(None)).all()
    rules = db.query(ConditionalRule).filter(ConditionalRule.form_id == form_id, ConditionalRule.version_id.is_(None)).all()

    return _process_submission(form_id, fields, rules, version_number=0, submission_data=submission_data, db=db)


@app.post("/public/form/{form_uuid}/submit")
def submit_form_by_uuid(form_uuid: str, submission_data: SubmitFormCreate, db: Session = Depends(get_db)):
    version = db.query(FormVersion).filter(FormVersion.uuid == form_uuid).first()
    if not version:
        raise HTTPException(status_code=404, detail="Form not found")

    form = db.query(Form).filter(Form.id == version.form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    fields = db.query(Field).filter(Field.version_id == version.id).all()
    rules = db.query(ConditionalRule).filter(ConditionalRule.version_id == version.id).all()

    return _process_submission(form.id, fields, rules, version_number=version.version_number, submission_data=submission_data, db=db)


def _process_submission(form_id, fields, rules, version_number, submission_data, db):

    fields_by_id = {f.id: f for f in fields}
    submitted = {r.field_id: r.value for r in submission_data.responses}

    all_errors = []

    visibility_controlled_ids = {
        rule.target_field_id for rule in rules if rule.action in ("show", "hide")
    }

    for field_id_key, field in fields_by_id.items():
        value = submitted.get(field_id_key, "")
        errors = validate_field_value(field, value, skip_required=field_id_key in visibility_controlled_ids)

        if field.field_type in ("dropdown", "multi-checkbox") and value.strip() != "":
            valid_options = {o.option_value for o in db.query(FieldOption).filter(FieldOption.field_id == field.id).all()}
            submitted_values = [v.strip() for v in value.split(",")] if field.field_type == "multi-checkbox" else [value]
            for v in submitted_values:
                if v and v not in valid_options:
                    errors.append(f"'{field.field_label}' has an invalid option: '{v}'.")

        all_errors.extend(errors)

    for rule in rules:
        trigger_field = fields_by_id.get(rule.trigger_field_id)
        target_field = fields_by_id.get(rule.target_field_id)
        if not trigger_field or not target_field:
            continue

        trigger_value = submitted.get(rule.trigger_field_id, "")
        condition_true = evaluate_condition(rule.operator, trigger_value, rule.comparison_value)
        target_value = submitted.get(rule.target_field_id, "")

        if rule.action == "show":
            visible_now = condition_true
            if not visible_now and target_value.strip() != "":
                all_errors.append(f"'{target_field.field_label}' should not be filled in — it is hidden based on your other answers.")
            if visible_now and target_field.required and target_value.strip() == "":
                all_errors.append(f"'{target_field.field_label}' is required based on your other answers.")

        elif rule.action == "hide":
            visible_now = not condition_true
            if not visible_now and target_value.strip() != "":
                all_errors.append(f"'{target_field.field_label}' should not be filled in — it is hidden based on your other answers.")
            if visible_now and target_field.required and target_value.strip() == "":
                all_errors.append(f"'{target_field.field_label}' is required based on your other answers.")

        elif rule.action == "require":
            if condition_true and target_value.strip() == "":
                all_errors.append(f"'{target_field.field_label}' is required based on your other answers.")

    if all_errors:
        raise HTTPException(status_code=422, detail={"message": "Validation failed", "errors": all_errors})

    now = datetime.utcnow()
    new_submission = None

    if submission_data.submission_id:
        new_submission = (
            db.query(Submission)
            .filter(Submission.id == submission_data.submission_id, Submission.form_id == form_id)
            .first()
        )

    if new_submission:
        new_submission.submitted_by = submission_data.submitted_by
        new_submission.status = "Completed"
        new_submission.submitted_at = now
        if new_submission.started_at:
            new_submission.completion_time_seconds = int((now - new_submission.started_at).total_seconds())
    else:
        # No /start ping happened first (e.g. an older client) — create the
        # completed row directly, with no measurable duration.
        new_submission = Submission(
            form_id=form_id, version_number=version_number, submitted_by=submission_data.submitted_by,
            status="Completed", started_at=now, submitted_at=now, completion_time_seconds=0,
        )
        db.add(new_submission)

    db.commit()
    db.refresh(new_submission)

    for response in submission_data.responses:
        if response.field_id in fields_by_id:
            db.add(ResponseValue(submission_id=new_submission.id, field_id=response.field_id, value=response.value))

            field = fields_by_id[response.field_id]
            if field.field_type == "file" and response.value:
                stored_name = response.value.strip()
                file_record = db.query(UploadedFile).filter(UploadedFile.stored_name == stored_name).first()
                if file_record:
                    file_record.submission_id = new_submission.id

    db.commit()

    return {
        "message": "Form submitted successfully!",
        "submission_id": new_submission.id,
        "version_number": version_number,
    }


# =========================================================
# SUBMISSIONS / RESPONSES
# =========================================================

@app.get("/submissions")
def get_submissions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Submission).order_by(Submission.id.desc()).all()


@app.get("/response-values")
def get_response_values(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ResponseValue).all()


# =========================================================
# MILESTONE 3: ANALYTICS, EXPORT, FILTERING, DASHBOARD SUPPORT
# =========================================================

def log_audit(db: Session, user_id, action: str, entity_type: str, entity_id, details=None):
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details_json=json.dumps(details) if details is not None else None,
    )
    db.add(entry)
    db.commit()


@app.get("/forms/{form_id}/analytics")
def get_form_analytics(form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    all_submissions = db.query(Submission).filter(
        Submission.form_id == form_id, Submission.status != "Deleted"
    ).all()
    started = len(all_submissions)

    completed = [s for s in all_submissions if s.status in ("Completed", "Archived")]
    total_submissions = len(completed)
    completion_rate = round((total_submissions / started) * 100, 1) if started else 0.0

    durations = [s.completion_time_seconds for s in completed if s.completion_time_seconds]
    average_time = round(sum(durations) / len(durations)) if durations else 0

    all_fields = db.query(Field).filter(Field.form_id == form_id).all()
    distributable_field_ids_by_label = {}
    for f in all_fields:
        if f.field_type in ("dropdown", "rating"):
            distributable_field_ids_by_label.setdefault(f.field_label, []).append(f.id)

    completed_ids = [s.id for s in completed]

    field_distributions = {}
    for label, field_ids in distributable_field_ids_by_label.items():
        counts = {}
        if completed_ids:
            values = (
                db.query(ResponseValue.value)
                .filter(ResponseValue.field_id.in_(field_ids), ResponseValue.submission_id.in_(completed_ids))
                .all()
            )
            for (v,) in values:
                if v:
                    counts[v] = counts.get(v, 0) + 1
        field_distributions[label] = counts

    return {
        "form_id": form.id,
        "title": form.title,
        "total_submissions": total_submissions,
        "started": started,
        "completion_rate": completion_rate,
        "average_time_to_complete_seconds": average_time,
        "field_distributions": field_distributions,
    }


@app.get("/forms/{form_id}/responses")
def list_form_responses(
    form_id: int,
    submitted_from: str = None,
    submitted_to: str = None,
    field_id: int = None,
    field_value: str = None,
    status: str = None,
    search: str = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    query = db.query(Submission).filter(Submission.form_id == form_id, Submission.status != "Deleted")

    if status:
        query = query.filter(Submission.status == status)

    if submitted_from:
        try:
            query = query.filter(Submission.submitted_at >= datetime.fromisoformat(submitted_from))
        except ValueError:
            pass

    if submitted_to:
        try:
            query = query.filter(Submission.submitted_at <= datetime.fromisoformat(submitted_to))
        except ValueError:
            pass

    if search:
        try:
            query = query.filter(Submission.id == int(search))
        except ValueError:
            query = query.filter(Submission.submitted_by.ilike(f"%{search}%"))

    if field_id and field_value:
        matching_ids = [
            row.submission_id
            for row in db.query(ResponseValue.submission_id)
            .filter(ResponseValue.field_id == field_id, ResponseValue.value.ilike(f"%{field_value}%"))
            .all()
        ]
        query = query.filter(Submission.id.in_(matching_ids))

    total = query.count()
    page = max(page, 1)
    page_size = max(min(page_size, 100), 1)

    submissions = (
        query.order_by(Submission.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "results": [
            {
                "id": s.id,
                "status": s.status,
                "submitted_by": s.submitted_by,
                "started_at": s.started_at,
                "submitted_at": s.submitted_at,
                "completion_time_seconds": s.completion_time_seconds,
            }
            for s in submissions
        ],
    }


@app.get("/forms/{form_id}/responses/{response_id}")
def get_form_response(form_id: int, response_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    submission = db.query(Submission).filter(Submission.id == response_id, Submission.form_id == form_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Response not found")

    fields = {f.id: f for f in db.query(Field).filter(Field.form_id == form_id).all()}
    values = db.query(ResponseValue).filter(ResponseValue.submission_id == response_id).all()

    answers = []
    for rv in values:
        field = fields.get(rv.field_id)
        label = field.field_label if field else f"Field {rv.field_id}"
        field_type = field.field_type if field else "text"
        answers.append({"field_id": rv.field_id, "label": label, "type": field_type, "value": rv.value})
    return {
        "id": submission.id,
        "status": submission.status,
        "submitted_by": submission.submitted_by,
        "started_at": submission.started_at,
        "submitted_at": submission.submitted_at,
        "completion_time_seconds": submission.completion_time_seconds,
        "answers": answers,
    }


@app.get("/forms/{form_id}/responses/export")
def export_form_responses(form_id: int, format: str = "csv", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    all_fields = db.query(Field).filter(Field.form_id == form_id).order_by(Field.order.asc(), Field.id.asc()).all()
    field_labels = {}
    file_field_ids = set()
    ordered_labels = []
    for f in all_fields:
        field_labels[f.id] = f.field_label
        if f.field_type == "file":
            file_field_ids.add(f.id)
        if f.field_label not in ordered_labels:
            ordered_labels.append(f.field_label)

    submissions = (
        db.query(Submission)
        .filter(Submission.form_id == form_id, Submission.status.in_(["Completed", "Archived"]))
        .order_by(Submission.id.asc())
        .all()
    )

    rows = []
    for s in submissions:
        values = db.query(ResponseValue).filter(ResponseValue.submission_id == s.id).all()
        row = {
            "Response ID": s.id,
            "Submitted By": s.submitted_by or "",
            "Submitted At": s.submitted_at.isoformat() if s.submitted_at else "",
        }
        for v in values:
            label = field_labels.get(v.field_id, f"Field {v.field_id}")
            value = v.value
            if v.field_id in file_field_ids and value:
                value = generate_signed_url(value)
            row[label] = value
        rows.append(row)

    if format == "json":
        return rows

    headers = ["Response ID", "Submitted By", "Submitted At"] + [f.field_label for f in fields]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=form_{form_id}_responses.csv"},
    )


@app.get("/forms/{form_id}/rules")
def get_form_rules_alias(form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ConditionalRule).filter(
        ConditionalRule.form_id == form_id, ConditionalRule.version_id.is_(None)
    ).all()


@app.post("/forms/{form_id}/duplicate")
def duplicate_form(form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    original = db.query(Form).filter(Form.id == form_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Form not found")

    new_form = Form(title=f"{original.title} Copy", description=original.description, status="Draft")
    db.add(new_form)
    db.commit()
    db.refresh(new_form)

    original_fields = (
        db.query(Field)
        .filter(Field.form_id == form_id, Field.version_id.is_(None))
        .order_by(Field.order.asc())
        .all()
    )
    field_id_map = {}

    for f in original_fields:
        new_field = Field(
            form_id=new_form.id, field_label=f.field_label, field_type=f.field_type,
            required=f.required, order=f.order,
            min_length=f.min_length, max_length=f.max_length,
            min_value=f.min_value, max_value=f.max_value, allow_decimal=f.allow_decimal,
            min_date=f.min_date, max_date=f.max_date,
            allowed_file_types=f.allowed_file_types, max_file_size=f.max_file_size,
            rating_scale=f.rating_scale,
        )
        db.add(new_field)
        db.commit()
        db.refresh(new_field)
        field_id_map[f.id] = new_field.id

        for o in db.query(FieldOption).filter(FieldOption.field_id == f.id).all():
            db.add(FieldOption(field_id=new_field.id, option_value=o.option_value))
        db.commit()

    original_rules = db.query(ConditionalRule).filter(
        ConditionalRule.form_id == form_id, ConditionalRule.version_id.is_(None)
    ).all()
    for r in original_rules:
        if r.trigger_field_id in field_id_map and r.target_field_id in field_id_map:
            db.add(ConditionalRule(
                form_id=new_form.id,
                trigger_field_id=field_id_map[r.trigger_field_id],
                operator=r.operator, comparison_value=r.comparison_value,
                target_field_id=field_id_map[r.target_field_id], action=r.action,
            ))
    db.commit()

    log_audit(db, current_user.id, "DUPLICATE_FORM", "Form", new_form.id, {"source_form_id": form_id})

    return {"message": "Form duplicated successfully!", "data": {"id": new_form.id, "title": new_form.title, "status": new_form.status}}


@app.get("/forms/{form_id}/retention")
def get_retention_policy(form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    policy = db.query(RetentionPolicy).filter(RetentionPolicy.form_id == form_id).first()
    if not policy:
        return {"form_id": form_id, "retention_days": 365, "is_enabled": False}
    return {"form_id": form_id, "retention_days": policy.retention_days, "is_enabled": policy.is_enabled}


@app.put("/forms/{form_id}/retention")
def set_retention_policy(form_id: int, payload: RetentionPolicyUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    policy = db.query(RetentionPolicy).filter(RetentionPolicy.form_id == form_id).first()
    if not policy:
        policy = RetentionPolicy(form_id=form_id)
        db.add(policy)

    policy.retention_days = payload.retention_days
    policy.is_enabled = payload.is_enabled
    db.commit()
    db.refresh(policy)

    return {"message": "Retention policy updated", "data": {"retention_days": policy.retention_days, "is_enabled": policy.is_enabled}}


@app.post("/forms/{form_id}/retention/run")
def run_retention(form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    policy = db.query(RetentionPolicy).filter(RetentionPolicy.form_id == form_id).first()
    if not policy or not policy.is_enabled:
        raise HTTPException(status_code=400, detail="No active retention policy for this form.")

    cutoff = datetime.utcnow() - timedelta(days=policy.retention_days)
    eligible = (
        db.query(Submission)
        .filter(Submission.form_id == form_id, Submission.status == "Completed", Submission.submitted_at < cutoff)
        .all()
    )
    for s in eligible:
        s.status = "Archived"
    db.commit()

    log_audit(db, current_user.id, "RUN_RETENTION", "Form", form_id, {"archived_count": len(eligible), "retention_days": policy.retention_days})

    return {"message": f"Archived {len(eligible)} submission(s) older than {policy.retention_days} days."}


@app.post("/responses/bulk-delete")
def bulk_delete_responses(payload: BulkDeleteRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    submissions = db.query(Submission).filter(Submission.id.in_(payload.response_ids)).all()
    if not submissions:
        raise HTTPException(status_code=404, detail="No matching responses found.")

    if payload.soft:
        for s in submissions:
            s.status = "Deleted"
        db.commit()
    else:
        ids = [s.id for s in submissions]
        db.query(ResponseValue).filter(ResponseValue.submission_id.in_(ids)).delete(synchronize_session=False)
        db.query(UploadedFile).filter(UploadedFile.submission_id.in_(ids)).delete(synchronize_session=False)
        db.query(Submission).filter(Submission.id.in_(ids)).delete(synchronize_session=False)
        db.commit()

    log_audit(
        db, current_user.id,
        "DELETE_RESPONSE" if payload.soft else "PERMANENT_DELETE_RESPONSE",
        "Submission", None,
        {"response_ids": payload.response_ids, "soft": payload.soft},
    )

    return {"message": f"{len(submissions)} response(s) {'soft-' if payload.soft else ''}deleted."}


@app.get("/audit-logs")
def get_audit_logs(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(AuditLog).order_by(AuditLog.id.desc())
    total = query.count()
    page = max(page, 1)
    page_size = max(min(page_size, 100), 1)
    logs = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "results": [
            {
                "id": l.id, "user_id": l.user_id, "action": l.action,
                "entity_type": l.entity_type, "entity_id": l.entity_id,
                "details": json.loads(l.details_json) if l.details_json else None,
                "created_at": l.created_at,
            }
            for l in logs
        ],
    }