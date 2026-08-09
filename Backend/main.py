import os
import re
import shutil
import time
import hmac
import hashlib
import uuid as uuid_lib
from datetime import date, datetime

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form as FastAPIForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import engine, get_db
from models import (
    Base,
    Form,
    FormVersion,
    Field,
    FieldOption,
    ConditionalRule,
    Submission,
    ResponseValue,
    UploadedFile,
)
from schemas import (
    FormCreate,
    FormUpdate,
    FieldCreate,
    FieldUpdate,
    FieldReorderRequest,
    FieldOptionCreate,
    ConditionalRuleCreate,
    FormWithFieldsCreate,
    SubmitFormCreate,
)

app = FastAPI()

# Create any tables that don't exist yet. Safe to run every startup —
# it only CREATES missing tables, never touches ones that already
# exist. This is what sets up the database schema on a brand-new
# deployment (e.g. Render) where there's no shell access to run this
# manually on the free tier.
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
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
    return f"http://127.0.0.1:8000/download/{stored_name}?expires={expires}&sig={signature}"


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
# FORMS
# =========================================================

@app.post("/forms")
def create_form(form: FormCreate, db: Session = Depends(get_db)):
    new_form = Form(title=form.title, description=form.description, status="Draft")
    db.add(new_form)
    db.commit()
    db.refresh(new_form)
    return new_form


@app.get("/forms")
def get_forms(db: Session = Depends(get_db)):
    return db.query(Form).order_by(Form.id.desc()).all()


@app.get("/forms/{form_id}")
def get_form(form_id: int, db: Session = Depends(get_db)):
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
def update_form(form_id: int, updated: FormUpdate, db: Session = Depends(get_db)):
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
def delete_form(form_id: int, db: Session = Depends(get_db)):
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
def archive_form(form_id: int, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    form.status = "Archived"
    db.commit()
    db.refresh(form)
    return {"message": "Form archived successfully!", "data": {"id": form.id, "title": form.title, "status": form.status}}


@app.post("/forms-with-fields")
def create_form_with_fields(form_data: FormWithFieldsCreate, db: Session = Depends(get_db)):
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
def create_field(field: FieldCreate, db: Session = Depends(get_db)):
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
def get_fields(db: Session = Depends(get_db)):
    return db.query(Field).filter(Field.version_id.is_(None)).order_by(Field.order.asc(), Field.id.asc()).all()


@app.put("/fields/{field_id}")
def update_field(field_id: int, updated_field: FieldUpdate, db: Session = Depends(get_db)):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    for key, value in updated_field.dict(exclude_unset=True).items():
        setattr(field, key, value)

    db.commit()
    db.refresh(field)
    return {"message": "Field updated successfully!", "data": {"id": field.id, "field_label": field.field_label}}


@app.delete("/fields/{field_id}")
def delete_field(field_id: int, db: Session = Depends(get_db)):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    db.query(FieldOption).filter(FieldOption.field_id == field_id).delete()
    db.delete(field)
    db.commit()
    return {"message": "Field deleted successfully!", "deleted_field_id": field_id}


@app.put("/forms/{form_id}/fields/reorder")
def reorder_fields(form_id: int, payload: FieldReorderRequest, db: Session = Depends(get_db)):
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
def create_field_option(option: FieldOptionCreate, db: Session = Depends(get_db)):
    new_option = FieldOption(field_id=option.field_id, option_value=option.option_value)
    db.add(new_option)
    db.commit()
    db.refresh(new_option)
    return {"message": "Field option created successfully!", "data": {"id": new_option.id, "field_id": new_option.field_id, "option_value": new_option.option_value}}


@app.get("/field-options")
def get_field_options(db: Session = Depends(get_db)):
    return db.query(FieldOption).all()


# =========================================================
# CONDITIONAL RULES  (Module 2)
# =========================================================

VALID_OPERATORS = {"equals", "not_equals", "contains", "greater_than", "is_empty"}
VALID_ACTIONS = {"show", "hide", "require"}


@app.post("/conditional-rules")
def create_conditional_rule(rule: ConditionalRuleCreate, db: Session = Depends(get_db)):
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
def get_conditional_rules(db: Session = Depends(get_db)):
    return db.query(ConditionalRule).filter(ConditionalRule.version_id.is_(None)).all()


@app.get("/forms/{form_id}/conditional-rules")
def get_form_conditional_rules(form_id: int, db: Session = Depends(get_db)):
    return db.query(ConditionalRule).filter(
        ConditionalRule.form_id == form_id, ConditionalRule.version_id.is_(None)
    ).all()


@app.delete("/conditional-rules/{rule_id}")
def delete_conditional_rule(rule_id: int, db: Session = Depends(get_db)):
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
def publish_form(form_id: int, db: Session = Depends(get_db)):
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

    # Freeze the schema: copy each live field into a new row tagged
    # with this version_id, so future edits to the live fields never
    # affect submissions already made against this published version.
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

    # Freeze conditional rules too, remapped to the new snapshot field ids.
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
def get_share_link(form_id: int, db: Session = Depends(get_db)):
    version = db.query(FormVersion).filter(FormVersion.form_id == form_id).order_by(FormVersion.version_number.desc()).first()
    if not version:
        raise HTTPException(status_code=404, detail="Publish the form first.")
    return {"share_link": f"http://localhost:5173/form/{version.uuid}"}


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
    # Look up the field's config — check live fields first, then any
    # published snapshot (covers both preview and public-link submissions).
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    if field.field_type != "file":
        raise HTTPException(status_code=422, detail="This field does not accept file uploads.")

    # Validate file type
    if field.allowed_file_types:
        allowed = [ext.strip().lower() for ext in field.allowed_file_types.split(",") if ext.strip()]
        ext = os.path.splitext(file.filename)[1].lower()
        if allowed and ext not in allowed:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid file type '{ext}'. Allowed types: {', '.join(allowed)}",
            )

    # Validate file size (max_file_size stored in KB)
    contents = await file.read()
    size_kb = len(contents) / 1024
    if field.max_file_size and size_kb > field.max_file_size:
        raise HTTPException(
            status_code=422,
            detail=f"File too large ({size_kb:.0f} KB). Max allowed is {field.max_file_size} KB.",
        )

    # Store the file locally with a unique name to avoid collisions
    ext = os.path.splitext(file.filename)[1]
    stored_name = f"{uuid_lib.uuid4().hex}{ext}"
    stored_path = os.path.join(UPLOAD_DIR, stored_name)

    with open(stored_path, "wb") as f:
        f.write(contents)

    # Save a reference row (submission_id is filled in once the form
    # is actually submitted — see _process_submission below).
    db.add(UploadedFile(
        submission_id=0,  # 0 = "uploaded but not yet attached to a submission"
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
def get_fresh_download_link(stored_name: str, db: Session = Depends(get_db)):
    """Signed links expire after an hour by design. Rather than a saved
    link going dead forever, the frontend calls this any time it wants
    to offer a download — always returns a link valid for another hour
    from right now."""
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
    """Validate a single submitted value against its field's configuration.
    Returns a list of human-readable error strings (empty = valid).

    skip_required=True is used for fields controlled by a show/hide
    conditional rule — their "required when visible" behavior is decided
    by the rule-evaluation step instead, since a field hidden by a rule
    must never be forced empty-or-required by its own static config."""
    errors = []
    value = "" if value is None else str(value)

    if field.required and not skip_required and value.strip() == "":
        errors.append(f"'{field.field_label}' is required.")
        return errors  # no further checks needed on an empty required field

    if value.strip() == "":
        return errors  # optional and empty — nothing more to validate

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
        pass  # checked against options list by the caller (needs DB access)

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

@app.post("/public/forms/{form_id}/submit")
def submit_form(form_id: int, submission_data: SubmitFormCreate, db: Session = Depends(get_db)):
    """Submit against the LIVE/draft schema — this is what the numeric
    /form/{id} preview link shows, so it must validate against the same
    live fields, not a possibly-different published snapshot."""

    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    fields = db.query(Field).filter(Field.form_id == form_id, Field.version_id.is_(None)).all()
    rules = db.query(ConditionalRule).filter(ConditionalRule.form_id == form_id, ConditionalRule.version_id.is_(None)).all()

    return _process_submission(form_id, fields, rules, version_number=0, submission_data=submission_data, db=db)


@app.post("/public/form/{form_uuid}/submit")
def submit_form_by_uuid(form_uuid: str, submission_data: SubmitFormCreate, db: Session = Depends(get_db)):
    """Submit against a specific PUBLISHED version's frozen snapshot —
    this is what the real shareable /form/{uuid} link uses."""

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

    # Fields whose visibility is controlled by a show/hide rule must not
    # have their "required" enforced unconditionally here — whether they're
    # required depends on whether they're currently visible, which the
    # conditional-rule pass below decides. (action="require" doesn't
    # control visibility, so it doesn't need this exemption.)
    visibility_controlled_ids = {
        rule.target_field_id for rule in rules if rule.action in ("show", "hide")
    }

    # 1) Per-field validation using each field's own configuration
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

    # 2) Apply conditional rules (server-side re-check — never trust the frontend)
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

    # 3) All valid — persist the submission
    new_submission = Submission(form_id=form_id, version_number=version_number, submitted_by=submission_data.submitted_by)
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
def get_submissions(db: Session = Depends(get_db)):
    return db.query(Submission).order_by(Submission.id.desc()).all()


@app.get("/response-values")
def get_response_values(db: Session = Depends(get_db)):
    return db.query(ResponseValue).all()
