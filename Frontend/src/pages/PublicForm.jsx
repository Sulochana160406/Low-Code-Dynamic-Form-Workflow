import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getPublicForm, getPublicFormByUuid, submitPublicForm, submitPublicFormByUuid, uploadFile, startPublicForm, startPublicFormByUuid } from "../services/api";
import VoiceTextInput from "../components/VoiceTextInput";

const SpeechRecognitionAPI =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

// Voice-based form filling: uses the browser's own built-in speech-to-text
// (no external API, no cost, no key). Only renders if the browser supports
// it (mainly Chrome/Edge) — silently omitted elsewhere rather than showing
// a broken button.
function VoiceInputButton({ onResult }) {
  const [listening, setListening] = useState(false);

  if (!SpeechRecognitionAPI) return null;

  const handleClick = () => {
    if (listening) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) onResult(transcript);
    };

    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <button
      type="button"
      className={`voice-input-btn${listening ? " listening" : ""}`}
      onClick={handleClick}
      title="Speak your answer"
      aria-label="Speak your answer"
    >
      {listening ? "🔴" : "🎙️"}
    </button>
  );
}

function evaluateCondition(operator, triggerValue, comparisonValue) {
  const t = (triggerValue ?? "").toString().trim();
  const c = (comparisonValue ?? "").toString().trim();

  if (operator === "is_empty") return t === "";
  if (operator === "equals") return t.toLowerCase() === c.toLowerCase();
  if (operator === "not_equals") return t.toLowerCase() !== c.toLowerCase();
  if (operator === "contains") return t.toLowerCase().includes(c.toLowerCase());
  if (operator === "greater_than") {
    const numT = parseFloat(t);
    const numC = parseFloat(c);
    return !isNaN(numT) && !isNaN(numC) && numT > numC;
  }
  return false;
}

function PublicForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oneTimeToken = searchParams.get("ott") || null;

  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState({});
  const [notFound, setNotFound] = useState(false);
  const [expired, setExpired] = useState(false);
  const [expiredMessage, setExpiredMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [uploadingFieldId, setUploadingFieldId] = useState(null);
  const [uploadedFileNames, setUploadedFileNames] = useState({});
  const [submitterName, setSubmitterName] = useState("");
  const [sessionSubmissionId, setSessionSubmissionId] = useState(null);

  // "fill" = answering questions, "preview" = reviewing before the real submit
  const [step, setStep] = useState("fill");

  useEffect(() => {
    loadForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isUuid = (value) => /[a-f0-9]{8}-[a-f0-9]{4}-/i.test(value);

  const loadForm = async () => {
    setNotFound(false);
    setExpired(false);
    setForm(null);
    try {
      const data = isUuid(id) ? await getPublicFormByUuid(id) : await getPublicForm(id);
      setForm(data);

      const startResult = isUuid(id) ? await startPublicFormByUuid(id) : await startPublicForm(data.id);
      if (startResult?.submission_id) {
        setSessionSubmissionId(startResult.submission_id);
      }
    } catch (error) {
      console.log(error);
      if (error.expired) {
        setExpired(true);
        setExpiredMessage(error.message);
      } else {
        setNotFound(true);
      }
    }
  };

  const handleChange = (fieldId, value) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
  };

  const getFieldState = (fieldId) => {
    let visible = true;
    let forcedRequired = false;

    (form.conditional_rules || []).forEach((rule) => {
      if (rule.target_field_id !== fieldId) return;

      const triggerValue = responses[rule.trigger_field_id];
      const conditionTrue = evaluateCondition(rule.operator, triggerValue, rule.comparison_value);

      if (rule.action === "show") {
        if (!conditionTrue) visible = false;
        else forcedRequired = true;
      } else if (rule.action === "hide") {
        if (conditionTrue) visible = false;
      } else if (rule.action === "require") {
        if (conditionTrue) forcedRequired = true;
      }
    });

    return { visible, forcedRequired };
  };

  const handleFileChange = async (field, file) => {
    if (!file) return;

    setUploadingFieldId(field.id);
    try {
      const result = await uploadFile(form.id, field.id, file);
      handleChange(field.id, result.stored_name);
      setUploadedFileNames((prev) => ({ ...prev, [field.id]: result.original_name }));
    } catch (error) {
      console.log(error);
      alert(error.message || "File upload failed");
    } finally {
      setUploadingFieldId(null);
    }
  };

  const visibleFields = form ? form.fields.filter((f) => getFieldState(f.id).visible) : [];

  const handleReview = () => {
    if (!submitterName.trim()) {
      setErrors(["Please enter your name before submitting."]);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors([]);
    setStep("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmSubmit = async () => {
    setErrors([]);
    setSubmitting(true);
    try {
      const payload = {
        submitted_by: submitterName.trim(),
        submission_id: sessionSubmissionId,
        one_time_token: oneTimeToken,
        responses: visibleFields.map((field) => ({
          field_id: field.id,
          value: Array.isArray(responses[field.id])
            ? responses[field.id].join(", ")
            : responses[field.id] || "",
        })),
      };

      const result = isUuid(id)
        ? await submitPublicFormByUuid(id, payload)
        : await submitPublicForm(form.id, payload);

      navigate(`/form/${id}/thank-you`, {
        state: {
          formTitle: form.title,
          submissionId: result.submission_id,
          answers: visibleFields.map((field) => ({
            label: field.field_label,
            value: displayValue(field),
          })),
        },
      });
    } catch (error) {
      console.log(error);
      setErrors(error.errors && error.errors.length > 0 ? error.errors : [error.message || "Submission failed"]);
      setStep("fill");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  const displayValue = (field) => {
    const value = responses[field.id];
    if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
    if (field.field_type === "file") return value ? (uploadedFileNames[field.id] || "Uploaded") : "—";
    return value ? value.toString() : "—";
  };

  if (notFound) {
    return (
      <div className="public-form-page">
        <div className="public-form-card" style={{ textAlign: "center" }}>
          <h2>Form not found</h2>
          <p>This form may have been deleted, or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="public-form-page">
        <div className="public-form-card" style={{ textAlign: "center" }}>
          <h2>⏰ This form is closed</h2>
          <p>{expiredMessage || "This form is no longer accepting responses."}</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="public-form-page">
        <div className="public-form-card" style={{ textAlign: "center" }}>
          <p>Loading form…</p>
        </div>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="public-form-page">
        <div className="public-form-card">
          <h2>Review your answers</h2>
          <p>Check everything looks right before you submit.</p>

          {errors.length > 0 && (
            <div className="validation-errors">
              <strong>Please fix the following before submitting:</strong>
              <ul>{errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
            </div>
          )}

          <div className="preview-row">
            <span className="preview-label">Your Name</span>
            <span className="preview-value">{submitterName}</span>
          </div>

          {visibleFields.map((field) => (
            <div className="preview-row" key={field.id}>
              <span className="preview-label">{field.field_label}</span>
              <span className="preview-value">{displayValue(field)}</span>
            </div>
          ))}

          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={() => setStep("fill")}
              disabled={submitting}
            >
              ← Edit Answers
            </button>
            <button
              className="submit-btn"
              style={{ flex: 1 }}
              onClick={handleConfirmSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Confirm & Submit"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-page">
      <div className="public-form-card">
        <h2>{form.title}</h2>
        <p>{form.description}</p>

        {errors.length > 0 && (
          <div className="validation-errors">
            <strong>Please fix the following before submitting:</strong>
            <ul>
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        <div className="public-field">
          <label>
            Your Name
            <span className="req">*</span>
          </label>
          <VoiceTextInput
            type="text"
            value={submitterName}
            onChange={setSubmitterName}
            placeholder="Enter your full name"
            autoComplete="off"
          />
        </div>

        {form.fields.map((field) => {
          const { visible, forcedRequired } = getFieldState(field.id);
          if (!visible) return null;

          const isRequired = field.required || forcedRequired;

          return (
            <div className="public-field" key={field.id}>
              <label>
                {field.field_label}
                {isRequired && <span className="req">*</span>}
              </label>

              {field.field_type === "text" && (
                field.voice_enabled ? (
                  <VoiceTextInput
                    type="text"
                    value={responses[field.id] || ""}
                    onChange={(val) => handleChange(field.id, val)}
                    placeholder={field.field_label}
                    autoComplete="off"
                    maxLength={field.max_length || undefined}
                  />
                ) : (
                  <input
                    type="text"
                    value={responses[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={field.field_label}
                    autoComplete="off"
                    maxLength={field.max_length || undefined}
                  />
                )
              )}

              {field.field_type === "email" && (
                field.voice_enabled ? (
                  <VoiceTextInput
                    type="email"
                    value={responses[field.id] || ""}
                    onChange={(val) => handleChange(field.id, val)}
                    placeholder={field.field_label}
                    autoComplete="off"
                  />
                ) : (
                  <input
                    type="email"
                    value={responses[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={field.field_label}
                    autoComplete="off"
                  />
                )
              )}

              {field.field_type === "number" && (
                <input
                  type="number"
                  value={responses[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  min={field.min_value ?? undefined}
                  max={field.max_value ?? undefined}
                  step={field.allow_decimal ? "any" : "1"}
                  autoComplete="off"
                />
              )}

              {field.field_type === "phone" && (
                <input
                  type="tel"
                  value={responses[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit phone number"
                  inputMode="numeric"
                  autoComplete="off"
                />
              )}

              {field.field_type === "date" && (
                <input
                  type="date"
                  value={responses[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  min={field.min_date || undefined}
                  max={field.max_date || undefined}
                />
              )}

              {field.field_type === "dropdown" && (
                <select
                  value={responses[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                >
                  <option value="">Select</option>
                  {field.options?.map((option, index) => (
                    <option key={index} value={option}>{option}</option>
                  ))}
                </select>
              )}

              {field.field_type === "multi-checkbox" && (
                <div style={{ marginTop: "8px" }}>
                  {field.options?.map((option, index) => (
                    <label
                      key={index}
                      style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontWeight: 400 }}
                    >
                      <input
                        type="checkbox"
                        style={{ width: "auto" }}
                        checked={responses[field.id]?.includes(option) || false}
                        onChange={(e) => {
                          const current = responses[field.id] || [];
                          if (e.target.checked) {
                            handleChange(field.id, [...current, option]);
                          } else {
                            handleChange(field.id, current.filter((item) => item !== option));
                          }
                        }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}

              {field.field_type === "rating" && (
                <select
                  value={responses[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                >
                  <option value="">Select rating</option>
                  {Array.from({ length: field.rating_scale || 5 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>{num} ⭐</option>
                  ))}
                </select>
              )}

              {field.field_type === "file" && (
                <>
                  <input
                    type="file"
                    onChange={(e) => handleFileChange(field, e.target.files[0])}
                    accept={field.allowed_file_types || undefined}
                  />
                  {uploadingFieldId === field.id && (
                    <div className="form-hint">Uploading…</div>
                  )}
                  {responses[field.id] && uploadingFieldId !== field.id && (
                    <div className="form-hint">✅ Uploaded: {uploadedFileNames[field.id] || responses[field.id]}</div>
                  )}
                  {(field.allowed_file_types || field.max_file_size) && (
                    <div className="form-hint">
                      {field.allowed_file_types && `Allowed: ${field.allowed_file_types}`}
                      {field.allowed_file_types && field.max_file_size && " · "}
                      {field.max_file_size && `Max size: ${field.max_file_size} KB`}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        <button className="submit-btn" onClick={handleReview} style={{ width: "100%" }}>
          Review Answers →
        </button>
      </div>
    </div>
  );
}

export default PublicForm;