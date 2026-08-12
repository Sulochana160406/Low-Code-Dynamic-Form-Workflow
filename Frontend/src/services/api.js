// In production (Vercel), VITE_API_URL is set as an environment variable
// pointing at your live Render backend. Locally, it falls back to your
// own machine's backend, so local development is unaffected.
const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ---------------- FORMS ----------------

export async function createForm(formData) {
  const response = await fetch(`${BASE_URL}/forms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return response.json();
}

export async function getForms() {
  const response = await fetch(`${BASE_URL}/forms`);
  return response.json();
}

export async function getForm(formId) {
  const response = await fetch(`${BASE_URL}/forms/${formId}`);
  return response.json();
}

export async function updateForm(formId, formData) {
  const response = await fetch(`${BASE_URL}/forms/${formId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return response.json();
}

export async function deleteForm(formId) {
  const response = await fetch(`${BASE_URL}/forms/${formId}`, { method: "DELETE" });
  return response.json();
}

export async function publishForm(formId) {
  const response = await fetch(`${BASE_URL}/forms/${formId}/publish`, { method: "PUT" });
  return response.json();
}

export async function archiveForm(formId) {
  const response = await fetch(`${BASE_URL}/forms/${formId}/archive`, { method: "PUT" });
  return response.json();
}

export async function getShareLink(formId) {
  const response = await fetch(`${BASE_URL}/forms/${formId}/share`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Unable to get share link");
  }
  return data;
}

export async function createFormWithFields(formData) {
  const response = await fetch(`${BASE_URL}/forms-with-fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return response.json();
}

// ---------------- FIELDS ----------------

export async function createField(fieldData) {
  const response = await fetch(`${BASE_URL}/fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fieldData),
  });
  return response.json();
}

export async function getFields() {
  const response = await fetch(`${BASE_URL}/fields`);
  return response.json();
}

export async function updateField(fieldId, fieldData) {
  const response = await fetch(`${BASE_URL}/fields/${fieldId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fieldData),
  });
  return response.json();
}

export async function deleteField(fieldId) {
  const response = await fetch(`${BASE_URL}/fields/${fieldId}`, { method: "DELETE" });
  return response.json();
}

export async function reorderFields(formId, orderedFields) {
  const response = await fetch(`${BASE_URL}/forms/${formId}/fields/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: orderedFields }),
  });
  return response.json();
}

// ---------------- FIELD OPTIONS ----------------

export async function createFieldOption(optionData) {
  const response = await fetch(`${BASE_URL}/field-options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(optionData),
  });
  return response.json();
}

// ---------------- CONDITIONAL RULES ----------------

export async function createConditionalRule(ruleData) {
  const response = await fetch(`${BASE_URL}/conditional-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ruleData),
  });
  return response.json();
}

export async function getFormConditionalRules(formId) {
  const response = await fetch(`${BASE_URL}/forms/${formId}/conditional-rules`);
  return response.json();
}

export async function deleteConditionalRule(ruleId) {
  const response = await fetch(`${BASE_URL}/conditional-rules/${ruleId}`, { method: "DELETE" });
  return response.json();
}

// ---------------- PUBLIC FORM ACCESS ----------------

export async function getPublicForm(formId) {
  const response = await fetch(`${BASE_URL}/public/forms/${formId}`);
  if (!response.ok) throw new Error("Form not found");
  return response.json();
}

export async function getPublicFormByUuid(formUuid) {
  const response = await fetch(`${BASE_URL}/public/form/${formUuid}`);
  if (!response.ok) throw new Error("Form not found");
  return response.json();
}

// ---------------- FILE UPLOAD ----------------

export async function uploadFile(formId, fieldId, file) {
  const formData = new FormData();
  formData.append("field_id", fieldId);
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/public/forms/${formId}/upload-file`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "File upload failed");
  }
  return data;
}

// ---------------- SUBMIT PUBLIC FORM (live/draft view, numeric id) ----------------

export async function submitPublicForm(formId, data) {
  const response = await fetch(`${BASE_URL}/public/forms/${formId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (!response.ok) {
    const err = new Error(result.detail?.message || "Submission failed");
    err.errors = result.detail?.errors || [];
    throw err;
  }
  return result;
}

// ---------------- SUBMIT PUBLIC FORM (published link, by uuid) ----------------

export async function submitPublicFormByUuid(formUuid, data) {
  const response = await fetch(`${BASE_URL}/public/form/${formUuid}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (!response.ok) {
    const err = new Error(result.detail?.message || "Submission failed");
    err.errors = result.detail?.errors || [];
    throw err;
  }
  return result;
}

export async function getFreshDownloadLink(storedName) {
  const response = await fetch(`${BASE_URL}/files/${storedName}/fresh-link`);
  if (!response.ok) throw new Error("File not found");
  return response.json();
}

// ---------------- SUBMISSIONS / RESPONSES ----------------

export async function getSubmissions() {
  const response = await fetch(`${BASE_URL}/submissions`);
  return response.json();
}

export async function getResponses() {
  const response = await fetch(`${BASE_URL}/response-values`);
  return response.json();
}
