from django.contrib import admin
from django.utils.html import format_html

from .models import (
    Form,
    FormVersion,
    Field,
    FieldOption,
    ConditionalRule,
    Submission,
    ResponseValue,
)


# -----------------------------
# FORMS
# -----------------------------
@admin.register(Form)
class FormAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "title",
        "colored_status",
        "description",
    )

    search_fields = (
        "title",
        "description",
    )

    list_filter = (
        "status",
    )

    ordering = (
        "-id",
    )

    list_per_page = 10

    def colored_status(self, obj):

        if obj.status == "Published":
            color = "green"

        elif obj.status == "Draft":
            color = "orange"

        else:
            color = "red"

        return format_html(
            '<strong style="color:{};">{}</strong>',
            color,
            obj.status,
        )

    colored_status.short_description = "Status"


# -----------------------------
# FORM VERSIONS
# -----------------------------
@admin.register(FormVersion)
class FormVersionAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "form_id",
        "version_number",
        "uuid",
        "status",
    )

    search_fields = (
        "uuid",
    )

    list_filter = (
        "status",
    )

    ordering = (
        "-id",
    )

    readonly_fields = (
        "uuid",
    )

    list_per_page = 10


# -----------------------------
# FIELDS
# -----------------------------
@admin.register(Field)
class FieldAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "form_id",
        "field_label",
        "field_type",
        "required",
    )

    search_fields = (
        "field_label",
    )

    list_filter = (
        "field_type",
        "required",
    )

    ordering = (
        "-id",
    )

    list_per_page = 15


# -----------------------------
# FIELD OPTIONS
# -----------------------------
@admin.register(FieldOption)
class FieldOptionAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "field_id",
        "option_value",
    )

    search_fields = (
        "option_value",
    )

    ordering = (
        "-id",
    )

    list_per_page = 15


# -----------------------------
# CONDITIONAL RULES
# -----------------------------
@admin.register(ConditionalRule)
class ConditionalRuleAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "field_id",
        "condition_value",
        "target_field_id",
        "action",
    )

    search_fields = (
        "condition_value",
        "action",
    )

    ordering = (
        "-id",
    )

    list_per_page = 15


# -----------------------------
# SUBMISSIONS
# -----------------------------
@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "form_id",
        "version_number",
        "submitted_by",
    )

    search_fields = (
        "submitted_by",
    )

    list_filter = (
        "form_id",
    )

    ordering = (
        "-id",
    )

    list_per_page = 15


# -----------------------------
# RESPONSE VALUES
# -----------------------------
@admin.register(ResponseValue)
class ResponseValueAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "submission_id",
        "field_id",
        "value",
    )

    search_fields = (
        "value",
    )

    ordering = (
        "-id",
    )

    list_per_page = 20