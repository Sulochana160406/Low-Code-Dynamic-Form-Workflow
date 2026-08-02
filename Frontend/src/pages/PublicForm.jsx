import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicForm, submitPublicForm } from "../services/api";

function PublicForm() {
  const { id } = useParams();

  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState({});

  useEffect(() => {
    loadForm();
  }, []);

  const loadForm = async () => {
    try {
      const data = await getPublicForm(id);
      setForm(data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleChange = (fieldId, value) => {
    setResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        submitted_by: "Public User",
        responses: form.fields.map((field) => ({
          field_id: field.id,
          value: Array.isArray(responses[field.id])
            ? responses[field.id].join(", ")
            : responses[field.id] || "",
        })),
      };

      const result = await submitPublicForm(id, payload);

      alert(result.message);

      setResponses({});
    } catch (error) {
      console.log(error);
      alert("Submission Failed");
    }
  };

  if (!form) {
    return <h2>Loading...</h2>;
  }

  return (
    <div
      style={{
        padding: "25px",
        maxWidth: "700px",
        margin: "30px auto",
        background: "#fff",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <h2>{form.title}</h2>

      <p>{form.description}</p>

      <hr />

      {form.fields.map((field) => (
        <div key={field.id} style={{ marginBottom: "20px" }}>
          <label>
            <b>{field.field_label}</b>
            {field.required && (
              <span style={{ color: "red" }}> *</span>
            )}
          </label>

          <br />

          {/* Text */}
          {field.field_type === "text" && (
            <input
              type="text"
              value={responses[field.id] || ""}
              onChange={(e) =>
                handleChange(field.id, e.target.value)
              }
              placeholder={field.field_label}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "5px",
              }}
            />
          )}

          {/* Email */}
          {field.field_type === "email" && (
            <input
              type="email"
              value={responses[field.id] || ""}
              onChange={(e) =>
                handleChange(field.id, e.target.value)
              }
              placeholder={field.field_label}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "5px",
              }}
            />
          )}

          {/* Number */}
          {field.field_type === "number" && (
            <input
              type="number"
              value={responses[field.id] || ""}
              onChange={(e) =>
                handleChange(field.id, e.target.value)
              }
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "5px",
              }}
            />
          )}

          {/* Date */}
          {field.field_type === "date" && (
            <input
              type="date"
              value={responses[field.id] || ""}
              onChange={(e) =>
                handleChange(field.id, e.target.value)
              }
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "5px",
              }}
            />
          )}

          {/* Dropdown */}
          {field.field_type === "dropdown" && (
            <select
              value={responses[field.id] || ""}
              onChange={(e) =>
                handleChange(field.id, e.target.value)
              }
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "5px",
              }}
            >
              <option value="">Select</option>

              {field.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          {/* Multi Checkbox */}
          {field.field_type === "multi-checkbox" && (
            <div style={{ marginTop: "10px" }}>
              {field.options?.map((option, index) => (
                <label
                  key={index}
                  style={{
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      responses[field.id]?.includes(option) || false
                    }
                    onChange={(e) => {
                      const current =
                        responses[field.id] || [];

                      if (e.target.checked) {
                        handleChange(field.id, [
                          ...current,
                          option,
                        ]);
                      } else {
                        handleChange(
                          field.id,
                          current.filter(
                            (item) => item !== option
                          )
                        );
                      }
                    }}
                  />

                  {" "}{option}
                </label>
              ))}
            </div>
          )}

          {/* Rating */}
          {field.field_type === "rating" && (
            <select
              value={responses[field.id] || ""}
              onChange={(e) =>
                handleChange(field.id, e.target.value)
              }
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "5px",
              }}
            >
              <option value="">Select Rating</option>

              {Array.from(
                { length: field.rating_scale || 5 },
                (_, i) => i + 1
              ).map((num) => (
                <option key={num} value={num}>
                  {num} ⭐
                </option>
              ))}
            </select>
          )}

          {/* File Upload */}
          {field.field_type === "file" && (
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files.length > 0) {
                  handleChange(
                    field.id,
                    e.target.files[0].name
                  );
                }
              }}
              style={{
                marginTop: "10px",
              }}
            />
          )}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        style={{
          padding: "12px 30px",
          background: "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        Submit
      </button>
    </div>
  );
}

export default PublicForm;