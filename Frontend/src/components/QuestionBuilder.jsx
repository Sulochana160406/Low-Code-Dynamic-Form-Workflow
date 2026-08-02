import { useState } from "react";

function QuestionBuilder({ questions, setQuestions }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState("");

  const handleAddQuestion = () => {
    if (label.trim() === "") {
      alert("Please enter question label");
      return;
    }

    const newQuestion = {
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
    };

    setQuestions([...questions, newQuestion]);

    setLabel("");
    setType("text");
    setRequired(false);
    setOptions("");
  };

  return (
    <div>
      <h3>Add Question</h3>

      <label>Question Label</label>
      <br />
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Enter Question"
      />

      <br />
      <br />

      <label>Field Type</label>
      <br />

      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="text">Text</option>
        <option value="email">Email</option>
        <option value="number">Number</option>
        <option value="date">Date</option>
        <option value="dropdown">Dropdown</option>
        <option value="multi-checkbox">Multi Checkbox</option>
        <option value="rating">Rating</option>
        <option value="file">File Upload</option>
      </select>

      {/* Options for Dropdown & Multi Checkbox */}

      {(type === "dropdown" || type === "multi-checkbox") && (
        <>
          <br />
          <br />

          <label>Options</label>
          <br />

          <input
            type="text"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder="Example: Male, Female, Other"
            style={{ width: "300px" }}
          />

          <br />

          <small>
            Enter options separated by commas.
          </small>
        </>
      )}

      <br />
      <br />

      <label>
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
        />
        Required
      </label>

      <br />
      <br />

      <button onClick={handleAddQuestion}>
        Add Question
      </button>
    </div>
  );
}

export default QuestionBuilder;