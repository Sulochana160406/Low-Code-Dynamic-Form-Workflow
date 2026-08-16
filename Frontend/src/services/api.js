// In production (Vercel), VITE_API_URL is set as an environment variable
// pointing at your live Render backend. Locally, it falls back to your
// own machine's backend, so local development is unaffected.
const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// =========================================================
// AUTH
// =========================================================
const TOKEN_KEY = "formcraft_token";
const USER_KEY = "formcraft_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isLoggedIn() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function storeSession(data) {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export async function login(email, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Login failed");
  }
  storeSession(data);
  return data.user;
}

export async function register(email, password, name) {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Registration failed");
  }
  storeSession(data);
  return data.user;
}

async function authedFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    logout();
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }
  return response;
}

// ---------------- FORMS ----------------

export async function createForm(formData) {
  const response = await authedFetch(`/forms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return response.json();
}

export async function getForms() {
  const response = await authedFetch(`/forms`);
  return response.json();
}

export async function getForm(formId) {
  const response = await authedFetch(`/forms/${formId}`);
  return response.json();
}

export async function updateForm(formId, formData) {
  const response = await authedFetch(`/forms/${formId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return response.json();
}

export async function deleteForm(formId) {
  const response = await authedFetch(`/forms/${formId}`, { method: "DELETE" });
  return response.json();
}

export async function publishForm(formId) {
  const response = await authedFetch(`/forms/${formId}/publish`, { method: "PUT" });
  return response.json();
}

export async function archiveForm(formId) {
  const response = await authedFetch(`/forms/${formId}/archive`, { method: "PUT" });
  return response.json();
}

export async function getShareLink(formId) {
  const response = await authedFetch(`/forms/${formId}/share`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Unable to get share link");
  }
  return data;
}

export async function createFormWithFields(formData) {
  const response = await authedFetch(`/forms-with-fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return response.json();
}

// ---------------- FIELDS ----------------

export async function createField(fieldData) {
  const response = await authedFetch(`/fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fieldData),
  });
  return response.json();
}

export async function getFields() {
  const response = await authedFetch(`/fields`);
  return response.json();
}

export async function updateField(fieldId, fieldData) {
  const response = await authedFetch(`/fields/${fieldId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fieldData),
  });
  return response.json();
}

export async function deleteField(fieldId) {
  const response = await authedFetch(`/fields/${fieldId}`, { method: "DELETE" });
  return response.json();
}

export async function reorderFields(formId, orderedFields) {
  const response = await authedFetch(`/forms/${formId}/fields/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: orderedFields }),
  });
  return response.json();
}

// ---------------- FIELD OPTIONS ----------------

export async function createFieldOption(optionData) {
  const response = await authedFetch(`/field-options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(optionData),
  });
  return response.json();
}

// ---------------- CONDITIONAL RULES ----------------

export async function createConditionalRule(ruleData) {
  const response = await authedFetch(`/conditional-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ruleData),
  });
  return response.json();
}

export async function getFormConditionalRules(formId) {
  const response = await authedFetch(`/forms/${formId}/conditional-rules`);
  return response.json();
}

export async function deleteConditionalRule(ruleId) {
  const response = await authedFetch(`/conditional-rules/${ruleId}`, { method: "DELETE" });
  return response.json();
}

// ---------------- PUBLIC FORM ACCESS (no auth — respondents use these) ----------------

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

// ---------------- FILE UPLOAD (no auth — respondents use this) ----------------

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

// ---------------- SUBMIT PUBLIC FORM (live/draft view, numeric id — no auth) ----------------

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

// ---------------- SUBMIT PUBLIC FORM (published link, by uuid — no auth) ----------------

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
  const response = await authedFetch(`/files/${storedName}/fresh-link`);
  if (!response.ok) throw new Error("File not found");
  return response.json();
}

// ---------------- FORM SESSION START (no auth — pings when a respondent opens the form) ----------------

export async function startPublicForm(formId) {
  const response = await fetch(`${BASE_URL}/public/forms/${formId}/start`, { method: "POST" });
  if (!response.ok) return null;
  return response.json();
}

export async function startPublicFormByUuid(formUuid) {
  const response = await fetch(`${BASE_URL}/public/form/${formUuid}/start`, { method: "POST" });
  if (!response.ok) return null;
  return response.json();
}

// ---------------- SUBMISSIONS / RESPONSES ----------------

export async function getSubmissions() {
  const response = await authedFetch(`/submissions`);
  return response.json();
}

export async function getResponses() {
  const response = await authedFetch(`/response-values`);
  return response.json();
}

// ---------------- MILESTONE 3: ANALYTICS ----------------

export async function getFormAnalytics(formId) {
  const response = await authedFetch(`/forms/${formId}/analytics`);
  if (!response.ok) throw new Error("Unable to load analytics");
  return response.json();
}

// ---------------- MILESTONE 3: RESPONSE BROWSER (filter + paginate) ----------------

export async function listFormResponses(formId, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const query = params.toString();
  const response = await authedFetch(`/forms/${formId}/responses${query ? `?${query}` : ""}`);
  if (!response.ok) throw new Error("Unable to load responses");
  return response.json();
}

export async function getFormResponse(formId, responseId) {
  const response = await authedFetch(`/forms/${formId}/responses/${responseId}`);
  if (!response.ok) throw new Error("Unable to load response");
  return response.json();
}

// ---------------- MILESTONE 3: EXPORT ----------------
// Export needs the auth header, so it can't be a plain <a href> link —
// fetch it as a blob and trigger the browser's normal download/save flow.

export async function exportFormResponses(formId, format) {
  const response = await authedFetch(`/forms/${formId}/responses/export?format=${format}`);
  if (!response.ok) throw new Error("Export failed");

  if (format === "json") {
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    downloadBlob(blob, `form_${formId}_responses.json`);
    return;
  }

  const blob = await response.blob();
  downloadBlob(blob, `form_${formId}_responses.csv`);
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ---------------- MILESTONE 3: RULE VISUALIZER ----------------

export async function getFormRules(formId) {
  const response = await authedFetch(`/forms/${formId}/rules`);
  if (!response.ok) throw new Error("Unable to load rules");
  return response.json();
}

// ---------------- MILESTONE 3: FORM DUPLICATION ----------------

export async function duplicateForm(formId) {
  const response = await authedFetch(`/forms/${formId}/duplicate`, { method: "POST" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Duplicate failed");
  return data;
}

// ---------------- MILESTONE 3: RETENTION ----------------

export async function getRetentionPolicy(formId) {
  const response = await authedFetch(`/forms/${formId}/retention`);
  if (!response.ok) throw new Error("Unable to load retention policy");
  return response.json();
}

export async function setRetentionPolicy(formId, retentionDays, isEnabled) {
  const response = await authedFetch(`/forms/${formId}/retention`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ retention_days: retentionDays, is_enabled: isEnabled }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Unable to save retention policy");
  return data;
}

export async function runRetention(formId) {
  const response = await authedFetch(`/forms/${formId}/retention/run`, { method: "POST" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Retention run failed");
  return data;
}

// ---------------- MILESTONE 3: BULK DELETE ----------------

export async function bulkDeleteResponses(responseIds, soft = true) {
  const response = await authedFetch(`/responses/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response_ids: responseIds, soft }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Bulk delete failed");
  return data;
}

// ---------------- MILESTONE 3: AUDIT LOG ----------------

export async function getAuditLogs(page = 1, pageSize = 20) {
  const response = await authedFetch(`/audit-logs?page=${page}&page_size=${pageSize}`);
  if (!response.ok) throw new Error("Unable to load audit logs");
  return response.json();
}