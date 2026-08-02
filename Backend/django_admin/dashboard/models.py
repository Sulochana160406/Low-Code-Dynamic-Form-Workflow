from django.db import models


class Form(models.Model):
    id = models.IntegerField(primary_key=True)
    title = models.CharField(max_length=255)
    description = models.CharField(max_length=500, blank=True, null=True)
    status = models.CharField(max_length=50)

    class Meta:
        managed = False
        db_table = "forms"

    def __str__(self):
        return self.title


class FormVersion(models.Model):
    id = models.IntegerField(primary_key=True)
    form_id = models.IntegerField()
    version_number = models.IntegerField()
    uuid = models.CharField(max_length=100)
    status = models.CharField(max_length=50)

    class Meta:
        managed = False
        db_table = "form_versions"

    def __str__(self):
        return f"Form {self.form_id} V{self.version_number}"


class Field(models.Model):
    id = models.IntegerField(primary_key=True)
    form_id = models.IntegerField()

    field_label = models.CharField(max_length=255)
    field_type = models.CharField(max_length=100)
    required = models.BooleanField()

    min_length = models.IntegerField(blank=True, null=True)
    max_length = models.IntegerField(blank=True, null=True)

    min_value = models.FloatField(blank=True, null=True)
    max_value = models.FloatField(blank=True, null=True)

    allow_decimal = models.BooleanField()

    min_date = models.DateField(blank=True, null=True)
    max_date = models.DateField(blank=True, null=True)

    allowed_file_types = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    max_file_size = models.IntegerField(blank=True, null=True)

    rating_scale = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "fields"

    def __str__(self):
        return self.field_label


class FieldOption(models.Model):
    id = models.IntegerField(primary_key=True)
    field_id = models.IntegerField()
    option_value = models.CharField(max_length=255)

    class Meta:
        managed = False
        db_table = "field_options"

    def __str__(self):
        return self.option_value


class ConditionalRule(models.Model):
    id = models.IntegerField(primary_key=True)
    field_id = models.IntegerField()
    condition_value = models.CharField(max_length=255)
    target_field_id = models.IntegerField()
    action = models.CharField(max_length=50)

    class Meta:
        managed = False
        db_table = "conditional_rules"


class Submission(models.Model):
    id = models.IntegerField(primary_key=True)
    form_id = models.IntegerField()
    version_number = models.IntegerField()
    submitted_by = models.CharField(max_length=255)

    class Meta:
        managed = False
        db_table = "submissions"

    def __str__(self):
        return self.submitted_by


class ResponseValue(models.Model):
    id = models.IntegerField(primary_key=True)
    submission_id = models.IntegerField()
    field_id = models.IntegerField()
    value = models.CharField(max_length=500)

    class Meta:
        managed = False
        db_table = "response_values"

    def __str__(self):
        return self.value