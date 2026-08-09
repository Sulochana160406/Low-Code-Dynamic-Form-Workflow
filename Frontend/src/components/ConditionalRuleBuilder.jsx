import { useState } from "react";

const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "greater_than", label: "is greater than" },
  { value: "is_empty", label: "is empty" },
];

const ACTIONS = [
  { value: "show", label: "show" },
  { value: "hide", label: "hide" },
  { value: "require", label: "require" },
];

function ConditionalRuleBuilder({ questions, rules, onAdd, onDelete }) {
  const [triggerIndex, setTriggerIndex] = useState("");
  const [operator, setOperator] = useState("equals");
  const [comparisonValue, setComparisonValue] = useState("");
  const [targetIndex, setTargetIndex] = useState("");
  const [action, setAction] = useState("show");

  const savedQuestions = questions.filter((q) => q.id);

  const handleAdd = () => {
    if (triggerIndex === "" || targetIndex === "") {
      alert("Please choose both a trigger field and a target field.");
      return;
    }
    if (triggerIndex === targetIndex) {
      alert("Trigger field and target field must be different.");
      return;
    }

    onAdd({
      trigger_field_id: Number(triggerIndex),
      operator,
      comparison_value: operator === "is_empty" ? null : comparisonValue,
      target_field_id: Number(targetIndex),
      action,
    });

    setTriggerIndex("");
    setComparisonValue("");
    setTargetIndex("");
  };

  const labelFor = (fieldId) =>
    questions.find((q) => q.id === fieldId)?.label || `Field #${fieldId}`;

  if (savedQuestions.length < 2) {
    return (
      <div className="question-list-empty">
        Save at least 2 questions first (click "Update Form" / "Create Form"), then come
        back here to add conditional rules between them.
      </div>
    );
  }

  return (
    <div>
      <div className="rule-builder-grid">
        <div className="form-group">
          <label className="form-label">IF this field…</label>
          <select value={triggerIndex} onChange={(e) => setTriggerIndex(e.target.value)}>
            <option value="">Select trigger field</option>
            {savedQuestions.map((q) => (
              <option key={q.id} value={q.id}>{q.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Operator</label>
          <select value={operator} onChange={(e) => setOperator(e.target.value)}>
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>
      </div>

      {operator !== "is_empty" && (
        <div className="form-group">
          <label className="form-label">Comparison Value</label>
          <input
            type="text"
            value={comparisonValue}
            onChange={(e) => setComparisonValue(e.target.value)}
            placeholder="e.g. Yes"
            autoComplete="off"
          />
        </div>
      )}

      <div className="rule-builder-grid">
        <div className="form-group">
          <label className="form-label">THEN…</label>
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">…this field</label>
          <select value={targetIndex} onChange={(e) => setTargetIndex(e.target.value)}>
            <option value="">Select target field</option>
            {savedQuestions.map((q) => (
              <option key={q.id} value={q.id}>{q.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button type="button" onClick={handleAdd}>+ Add Rule</button>

      <div style={{ marginTop: "20px" }}>
        {rules.length === 0 ? (
          <div className="question-list-empty">No conditional rules yet.</div>
        ) : (
          rules.map((rule) => (
            <div className="rule-card" key={rule.id}>
              <div className="rule-sentence">
                IF <b>{labelFor(rule.trigger_field_id)}</b>{" "}
                {OPERATORS.find((o) => o.value === rule.operator)?.label}
                {rule.operator !== "is_empty" && (
                  <> "<b>{rule.comparison_value}</b>"</>
                )}{" "}
                THEN <b>{rule.action}</b> <b>{labelFor(rule.target_field_id)}</b>
              </div>
              <button
                type="button"
                className="btn-icon danger"
                onClick={() => onDelete(rule.id)}
                title="Delete rule"
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ConditionalRuleBuilder;
