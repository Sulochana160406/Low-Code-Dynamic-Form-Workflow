const BASE_URL = "http://127.0.0.1:8000";

// ---------------- CREATE FORM ----------------

export async function createForm(formData) {
  const response = await fetch(`${BASE_URL}/forms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  return response.json();
}

// ---------------- GET ALL FORMS ----------------

export async function getForms() {
  const response = await fetch(`${BASE_URL}/forms`);
  return response.json();
}

// ---------------- GET SINGLE FORM ----------------

export async function getForm(formId) {
  const response = await fetch(`${BASE_URL}/forms/${formId}`);
  return response.json();
}

// ---------------- UPDATE FORM ----------------

export async function updateForm(formId, formData) {
  const response = await fetch(`${BASE_URL}/forms/${formId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  return response.json();
}

// ---------------- DELETE FORM ----------------

export async function deleteForm(formId) {
  const response = await fetch(`${BASE_URL}/forms/${formId}`, {
    method: "DELETE",
  });

  return response.json();
}

// ---------------- PUBLISH FORM ----------------

export async function publishForm(formId) {
  const response = await fetch(`${BASE_URL}/forms/${formId}/publish`, {
    method: "PUT",
  });

  return response.json();
}

// ---------------- ARCHIVE FORM ----------------

export async function archiveForm(formId) {
  const response = await fetch(`${BASE_URL}/forms/${formId}/archive`, {
    method: "PUT",
  });

  return response.json();
}

// ---------------- SHARE LINK ----------------

export async function getShareLink(formId) {
  const response = await fetch(`${BASE_URL}/forms/${formId}/share`);
  return response.json();
}

// ---------------- CREATE FIELD ----------------

export async function createField(fieldData) {
  const response = await fetch(`${BASE_URL}/fields`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fieldData),
  });

  return response.json();
}

// ---------------- CREATE FIELD OPTION ----------------

export async function createFieldOption(optionData) {
  const response = await fetch(`${BASE_URL}/field-options`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(optionData),
  });

  return response.json();
}

// ---------------- PUBLIC FORM ----------------

export async function getPublicForm(formId) {
  const response = await fetch(`${BASE_URL}/public/forms/${formId}`);
  return response.json();
}

// ---------------- SUBMIT PUBLIC FORM ----------------

export async function submitPublicForm(formId, data) {
  const response = await fetch(`${BASE_URL}/public/forms/${formId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return response.json();
}

// ---------------- GET SUBMISSIONS ----------------

export async function getSubmissions() {
  const response = await fetch(`${BASE_URL}/submissions`);
  return response.json();
}

// ---------------- GET RESPONSES ----------------

export async function getResponses() {
  const response = await fetch(`${BASE_URL}/response-values`);
  return response.json();
}