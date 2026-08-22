import { useState } from "react";

const FIELD_TYPES = [
  { value: "text", label: "Text", icon: "🔤" },
  { value: "email", label: "Email", icon: "✉️" },
  { value: "number", label: "Number", icon: "🔢" },
  { value: "phone", label: "Phone Number", icon: "📞" },
  { value: "date", label: "Date", icon: "📅" },
  { value: "dropdown", label: "Dropdown", icon: "🔽" },
  { value: "multi-checkbox", label: "Multi Checkbox", icon: "☑️" },
  { value: "rating", label: "Rating", icon: "⭐" },
  { value: "file", label: "File Upload", icon: "📎" },
];

function QuestionBuilder({ questions, setQuestions }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState("");

  // Type-specific config
  const [minLength, setMinLength] = useState("");
  const [maxLength, setMaxLength] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [allowDecimal, setAllowDecimal] = useState(true);
  const [minDate, setMinDate] = useState("");
  const [maxDate, setMaxDate] = useState("");
  const [allowedFileTypes, setAllowedFileTypes] = useState("");
  const [maxFileSize, setMaxFileSize] = useState("");
  const [ratingScale, setRatingScale] = useState("5");

  const resetForm = () => {
    setLabel("");
    setType("text");
    setRequired(false);
    setOptions("");
    setMinLength("");
    setMaxLength("");
    setMinValue("");
    setMaxValue("");
    setAllowDecimal(true);
    setMinDate("");
    setMaxDate("");
    setAllowedFileTypes("");
    setMaxFileSize("");
    setRatingScale("5");
  };

  const handleAddQuestion = () => {
    if (label.trim() === "") {
      alert("Please enter question label");
      return;
    }

    const newQuestion = {
      tempId: crypto.randomUUID(),
      label,
      type,
      required,
      options:
        type === "dropdown" || type === "multi-checkbox"
          ? options
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item !== "")
          : [],

      min_length: type === "text" && minLength !== "" ? Number(minLength) : null,
      max_length: type === "text" && maxLength !== "" ? Number(maxLength) : null,

      min_value: type === "number" && minValue !== "" ? Number(minValue) : null,
      max_value: type === "number" && maxValue !== "" ? Number(maxValue) : null,
      allow_decimal: type === "number" ? allowDecimal : true,

      min_date: type === "date" && minDate !== "" ? minDate : null,
      max_date: type === "date" && maxDate !== "" ? maxDate : null,

      allowed_file_types: type === "file" && allowedFileTypes !== "" ? allowedFileTypes : null,
      max_file_size: type === "file" && maxFileSize !== "" ? Number(maxFileSize) : null,

      rating_scale: type === "rating" ? Number(ratingScale) : null,
    };

    setQuestions([...questions, newQuestion]);
    resetForm();
  };

  return (
    <div>
      <div className="section-title">➕ Add Question</div>

      <div className="form-group">
        <label className="form-label">Question Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. What is your full name?"
          autoComplete="off"
          name="question-label-field"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Field Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {FIELD_TYPES.map((ft) => (
            <option key={ft.value} value={ft.value}>
              {ft.icon} {ft.label}
            </option>
          ))}
        </select>
      </div>

      {/* Options for Dropdown & Multi Checkbox */}
      {(type === "dropdown" || type === "multi-checkbox") && (
        <div className="form-group">
          <label className="form-label">Options</label>
          <input
            type="text"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder="e.g. Male, Female, Other"
            autoComplete="off"
            name="question-options-field"
          />
          <div className="form-hint">Separate each option with a comma.</div>
        </div>
      )}

      {/* Text length constraints */}
      {type === "text" && (
        <div className="field-grid">
          <div className="form-group">
            <label className="form-label">Min Length</label>
            <input
              type="number"
              min="0"
              value={minLength}
              onChange={(e) => setMinLength(e.target.value)}
              placeholder="e.g. 2"
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max Length</label>
            <input
              type="number"
              min="0"
              value={maxLength}
              onChange={(e) => setMaxLength(e.target.value)}
              placeholder="e.g. 100"
              autoComplete="off"
            />
          </div>
        </div>
      )}

      {/* Number range constraints */}
      {type === "number" && (
        <>
          <div className="field-grid">
            <div className="form-group">
              <label className="form-label">Min Value</label>
              <input
                type="number"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                placeholder="e.g. 0"
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Value</label>
              <input
                type="number"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                placeholder="e.g. 100"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={allowDecimal}
                onChange={(e) => setAllowDecimal(e.target.checked)}
              />
              <span className="toggle-switch-track"></span>
              <span className="toggle-switch-label">Allow decimal values</span>
            </label>
          </div>
        </>
      )}

      {/* Date range constraints */}
      {type === "date" && (
        <div className="field-grid">
          <div className="form-group">
            <label className="form-label">Earliest Date Allowed</label>
            <input
              type="date"
              value={minDate}
              onChange={(e) => setMinDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Latest Date Allowed</label>
            <input
              type="date"
              value={maxDate}
              onChange={(e) => setMaxDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* File upload constraints */}
      {type === "file" && (
        <div className="field-grid">
          <div className="form-group">
            <label className="form-label">Allowed File Types</label>
            <input
              type="text"
              value={allowedFileTypes}
              onChange={(e) => setAllowedFileTypes(e.target.value)}
              placeholder="e.g. .pdf,.docx,.png"
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max File Size (KB)</label>
            <input
              type="number"
              min="0"
              value={maxFileSize}
              onChange={(e) => setMaxFileSize(e.target.value)}
              placeholder="e.g. 5000"
              autoComplete="off"
            />
          </div>
        </div>
      )}

      {/* Rating scale */}
      {type === "rating" && (
        <div className="form-group">
          <label className="form-label">Rating Scale (out of)</label>
          <select value={ratingScale} onChange={(e) => setRatingScale(e.target.value)}>
            <option value="5">5</option>
            <option value="10">10</option>
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          <span className="toggle-switch-track"></span>
          <span className="toggle-switch-label">Required field</span>
        </label>
      </div>

      <button type="button" onClick={handleAddQuestion}>
        + Add Question
      </button>
    </div>
  );
}

export default QuestionBuilder;