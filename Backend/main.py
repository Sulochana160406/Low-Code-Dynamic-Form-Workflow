from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
    ResponseValue
)

from schemas import (
    FormCreate,
    FormUpdate,
    FormVersionCreate,
    FieldCreate,
    FieldOptionCreate,
    ConditionalRuleCreate,
    SubmissionCreate,
    ResponseValueCreate,
    FormWithFieldsCreate,
    SubmitFormCreate
)
Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- HOME ----------------

@app.get("/")
def home():
    return {"message": "Welcome to Low-Code Dynamic Form Workflow Platform"}


# ---------------- FORMS ----------------

@app.post("/forms")
def create_form(form: FormCreate, db: Session = Depends(get_db)):
    new_form = Form(
        title=form.title,
        description=form.description
    )

    db.add(new_form)
    db.commit()
    db.refresh(new_form)

    return {
        "message": "Form saved successfully!",
        "id": new_form.id,
        "title": new_form.title,
        "description": new_form.description,
        "status": new_form.status
    }


@app.get("/forms")
def get_forms(db: Session = Depends(get_db)):
    return db.query(Form).all()


@app.get("/forms/{form_id}")
def get_form(form_id: int, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id).first()

    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    fields = (
        db.query(Field)
        .filter(Field.form_id == form_id)
        .all()
    )

    return {
        "id": form.id,
        "title": form.title,
        "description": form.description,
        "status": form.status,
        "fields": [
            {
                "id": field.id,
                "field_label": field.field_label,
                "field_type": field.field_type,
                "required": field.required,
            }
            for field in fields
        ],
    }


@app.put("/forms/{form_id}")
def update_form(form_id: int, updated_form: FormUpdate, db: Session = Depends(get_db)):

    form = db.query(Form).filter(Form.id == form_id).first()

    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    # If form is already published, create a new version
    if form.status == "Published":

        latest_version = db.query(FormVersion).filter(
            FormVersion.form_id == form.id
        ).order_by(FormVersion.version_number.desc()).first()

        if latest_version:
            new_version_number = latest_version.version_number + 1
        else:
            new_version_number = 1

        new_version = FormVersion(
            form_id=form.id,
            version_number=new_version_number
        )

        db.add(new_version)

    form.title = updated_form.title
    form.description = updated_form.description
    form.status = updated_form.status

    db.commit()
    db.refresh(form)

    return {
        "message": "Form updated successfully!",
        "data": {
            "id": form.id,
            "title": form.title,
            "description": form.description,
            "status": form.status
        }
    }
@app.delete("/forms/{form_id}")
def delete_form(form_id: int, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id).first()

    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    db.delete(form)
    db.commit()

    return {
        "message": "Form deleted successfully!"
    }
# ---------------- ARCHIVE FORM ----------------

@app.put("/forms/{form_id}/archive")
def archive_form(form_id: int, db: Session = Depends(get_db)):

    form = db.query(Form).filter(Form.id == form_id).first()

    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    form.status = "Archived"

    db.commit()

    return {
        "message": "Form archived successfully!"
    }

@app.post("/forms-with-fields")
def create_form_with_fields(
    form_data: FormWithFieldsCreate,
    db: Session = Depends(get_db)
):

    # Create Form
    new_form = Form(
        title=form_data.title,
        description=form_data.description,
        status="Draft"
    )

    db.add(new_form)
    db.commit()
    db.refresh(new_form)

    # Save all fields
    for field in form_data.fields:

        new_field = Field(
            form_id=new_form.id,
            field_label=field.field_label,
            field_type=field.field_type,
            required=field.required,

            min_length=field.min_length,
            max_length=field.max_length,

            min_value=field.min_value,
            max_value=field.max_value,
            allow_decimal=field.allow_decimal,

            min_date=field.min_date,
            max_date=field.max_date,

            allowed_file_types=field.allowed_file_types,
            max_file_size=field.max_file_size,

            rating_scale=field.rating_scale
        )

        db.add(new_field)
        db.commit()
        db.refresh(new_field)

        # Save dropdown / multi-checkbox options
        if hasattr(field, "options") and field.options:

            for option in field.options:

                db.add(
                    FieldOption(
                        field_id=new_field.id,
                        option_value=option
                    )
                )

            db.commit()

    return {
        "message": "Form created successfully with fields",
        "form_id": new_form.id
    }
# ---------------- FORM VERSIONS ----------------

@app.post("/form-versions")
def create_form_version(version: FormVersionCreate, db: Session = Depends(get_db)):
    new_version = FormVersion(
        form_id=version.form_id,
        version_number=version.version_number
    )

    db.add(new_version)
    db.commit()
    db.refresh(new_version)

    return {
        "message": "Form version created successfully!",
        "data": {
            "id": new_version.id,
            "form_id": new_version.form_id,
            "version_number": new_version.version_number
        }
    }
@app.get("/form-versions")
def get_form_versions(db: Session = Depends(get_db)):
    return db.query(FormVersion).all()


# ---------------- FIELDS ----------------
@app.post("/fields")
def create_field(field: FieldCreate, db: Session = Depends(get_db)):
    new_field = Field(
        form_id=field.form_id,
        field_label=field.field_label,
        field_type=field.field_type,
        required=field.required,

        # Text Field
        min_length=field.min_length,
        max_length=field.max_length,

        # Number Field
        min_value=field.min_value,
        max_value=field.max_value,
        allow_decimal=field.allow_decimal,

        # Date Field
        min_date=field.min_date,
        max_date=field.max_date,

        # File Upload
        allowed_file_types=field.allowed_file_types,
        max_file_size=field.max_file_size,

        # Rating
        rating_scale=field.rating_scale
    )

    db.add(new_field)
    db.commit()
    db.refresh(new_field)

    return {
        "message": "Field created successfully!",
        "data": {
            "id": new_field.id,
            "form_id": new_field.form_id,
            "field_label": new_field.field_label,
            "field_type": new_field.field_type,
            "required": new_field.required,
            "min_length": new_field.min_length,
            "max_length": new_field.max_length,
            "min_value": new_field.min_value,
            "max_value": new_field.max_value,
            "allow_decimal": new_field.allow_decimal,
            "min_date": new_field.min_date,
            "max_date": new_field.max_date,
            "allowed_file_types": new_field.allowed_file_types,
            "max_file_size": new_field.max_file_size,
            "rating_scale": new_field.rating_scale
        }
    }

@app.get("/fields")
def get_fields(db: Session = Depends(get_db)):
    return db.query(Field).all()


# ---------------- FIELD OPTIONS ----------------

@app.post("/field-options")
def create_field_option(option: FieldOptionCreate, db: Session = Depends(get_db)):
    new_option = FieldOption(
        field_id=option.field_id,
        option_value=option.option_value
    )

    db.add(new_option)
    db.commit()
    db.refresh(new_option)

    return {
        "message": "Field option created successfully!",
        "data": {
            "id": new_option.id,
            "field_id": new_option.field_id,
            "option_value": new_option.option_value
        }
    }


@app.get("/field-options")
def get_field_options(db: Session = Depends(get_db)):
    return db.query(FieldOption).all()


# ---------------- CONDITIONAL RULES ----------------

@app.post("/conditional-rules")
def create_conditional_rule(rule: ConditionalRuleCreate, db: Session = Depends(get_db)):
    new_rule = ConditionalRule(
        field_id=rule.field_id,
        condition_value=rule.condition_value,
        target_field_id=rule.target_field_id,
        action=rule.action
    )

    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)

    return {
        "message": "Conditional rule created successfully!",
        "data": {
            "id": new_rule.id,
            "field_id": new_rule.field_id,
            "condition_value": new_rule.condition_value,
            "target_field_id": new_rule.target_field_id,
            "action": new_rule.action
        }
    }


@app.get("/conditional-rules")
def get_conditional_rules(db: Session = Depends(get_db)):
    return db.query(ConditionalRule).all()
# ---------------- SUBMISSIONS ----------------

@app.post("/submissions")
def create_submission(
    submission: SubmissionCreate,
    db: Session = Depends(get_db)
):

    new_submission = Submission(
        form_id=submission.form_id,
        submitted_by=submission.submitted_by
    )

    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)

    return {
        "message": "Submission created successfully!",
        "data": {
            "id": new_submission.id,
            "form_id": new_submission.form_id,
            "submitted_by": new_submission.submitted_by
        }
    }


@app.get("/submissions")
def get_submissions(db: Session = Depends(get_db)):

    return db.query(Submission).all()



# ---------------- RESPONSE VALUES ----------------

@app.post("/response-values")
def create_response_value(
    response: ResponseValueCreate,
    db: Session = Depends(get_db)
):

    new_response = ResponseValue(
        submission_id=response.submission_id,
        field_id=response.field_id,
        value=response.value
    )

    db.add(new_response)
    db.commit()
    db.refresh(new_response)

    return {
        "message": "Response value saved successfully!",
        "data": {
            "id": new_response.id,
            "submission_id": new_response.submission_id,
            "field_id": new_response.field_id,
            "value": new_response.value
        }
    }


@app.get("/response-values")
def get_response_values(db: Session = Depends(get_db)):

    return db.query(ResponseValue).all()                    


@app.put("/forms/{form_id}/publish")
def publish_form(form_id: int, db: Session = Depends(get_db)):

    form = db.query(Form).filter(Form.id == form_id).first()

    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    form.status = "Published"

    # Check latest version
    latest_version = db.query(FormVersion).filter(
        FormVersion.form_id == form.id
    ).order_by(FormVersion.version_number.desc()).first()

    if latest_version:
        new_version_number = latest_version.version_number + 1
    else:
        new_version_number = 1

    # Create new version
    new_version = FormVersion(
        form_id=form.id,
        version_number=new_version_number
    )

    db.add(new_version)

    db.commit()
    db.refresh(form)

    return {
        "message": "Form published successfully!",
        "data": {
            "id": form.id,
            "title": form.title,
            "status": form.status,
            "version": new_version_number,
            "uuid": new_version.uuid
        }
    }
@app.put("/forms/{form_id}/archive")
def archive_form(form_id: int, db: Session = Depends(get_db)):

    form = db.query(Form).filter(Form.id == form_id).first()

    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    form.status = "Archived"

    db.commit()
    db.refresh(form)

    return {
        "message": "Form archived successfully!",
        "data": {
            "id": form.id,
            "title": form.title,
            "status": form.status
        }
    }
@app.get("/public/forms/{form_id}")
def get_public_form(form_id: int, db: Session = Depends(get_db)):

    form = db.query(Form).filter(Form.id == form_id).first()

    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    fields = db.query(Field).filter(Field.form_id == form_id).all()

    field_list = []

    for field in fields:

        options = db.query(FieldOption).filter(
            FieldOption.field_id == field.id
        ).all()

        field_list.append({
            "id": field.id,
            "field_label": field.field_label,
            "field_type": field.field_type,
            "required": field.required,
            "options": [option.option_value for option in options]
        })

    return {
        "id": form.id,
        "title": form.title,
        "description": form.description,
        "status": form.status,
        "fields": field_list
    }
@app.get("/public/form/{form_uuid}")
def get_public_form_by_uuid(form_uuid: str, db: Session = Depends(get_db)):

    version = db.query(FormVersion).filter(
        FormVersion.uuid == form_uuid
    ).first()

    if not version:
        raise HTTPException(status_code=404, detail="Form not found")

    form = db.query(Form).filter(
        Form.id == version.form_id
    ).first()

    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    fields = db.query(Field).filter(
        Field.form_id == form.id
    ).all()

    field_list = []

    for field in fields:
        options = db.query(FieldOption).filter(
            FieldOption.field_id == field.id
        ).all()

        field_list.append({
            "id": field.id,
            "field_label": field.field_label,
            "field_type": field.field_type,
            "required": field.required,
            "options": [option.option_value for option in options]
        })

    return {
        "uuid": version.uuid,
        "version": version.version_number,
        "id": form.id,
        "title": form.title,
        "description": form.description,
        "fields": field_list
    } 
@app.get("/forms/{form_id}/share")
def get_share_link(form_id: int, db: Session = Depends(get_db)):

    version = (
        db.query(FormVersion)
        .filter(FormVersion.form_id == form_id)
        .order_by(FormVersion.version_number.desc())
        .first()
    )

    if not version:
        raise HTTPException(
            status_code=404,
            detail="Publish the form first."
        )

    return {
        "share_link": f"http://localhost:5173/form/{version.uuid}"
    }
@app.post("/public/forms/{form_id}/submit")
def submit_form(
    form_id: int,
    submission_data: SubmitFormCreate,
    db: Session = Depends(get_db)
):

    # Check if form exists
    form = db.query(Form).filter(Form.id == form_id).first()

    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    # Get latest version of the form
    latest_version = db.query(FormVersion).filter(
        FormVersion.form_id == form_id
    ).order_by(FormVersion.version_number.desc()).first()

    version = latest_version.version_number if latest_version else 1

    # Create submission
    new_submission = Submission(
        form_id=form_id,
        version_number=version,
        submitted_by=submission_data.submitted_by
    )

    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)

    # Save all responses
    for response in submission_data.responses:

        new_response = ResponseValue(
            submission_id=new_submission.id,
            field_id=response.field_id,
            value=response.value
        )

        db.add(new_response)

    db.commit()

    return {
        "message": "Form submitted successfully!",
        "submission_id": new_submission.id,
        "version_number": version
    }