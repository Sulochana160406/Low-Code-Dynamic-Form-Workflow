from django.shortcuts import render
from dashboard.models import (
    Form,
    Field,
    Submission,
    ResponseValue,
    FormVersion,
)

def dashboard_home(request):

    total_forms = Form.objects.count()
    total_fields = Field.objects.count()
    total_submissions = Submission.objects.count()
    total_responses = ResponseValue.objects.count()
    total_versions = FormVersion.objects.count()

    published_forms = Form.objects.filter(status="Published").count()
    draft_forms = Form.objects.filter(status="Draft").count()

    recent_forms = Form.objects.order_by("-id")[:5]
    recent_submissions = Submission.objects.order_by("-id")[:5]

    context = {
        "total_forms": total_forms,
        "total_fields": total_fields,
        "total_submissions": total_submissions,
        "total_responses": total_responses,
        "total_versions": total_versions,
        "published_forms": published_forms,
        "draft_forms": draft_forms,
        "recent_forms": recent_forms,
        "recent_submissions": recent_submissions,
    }

    return render(request, "dashboard/index.html", context)
