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
  const [triggerTempId, setTriggerTempId] = useState("");
  const [operator, setOperator] = useState("equals");
  const [comparisonValue, setComparisonValue] = useState("");
  const [targetTempId, setTargetTempId] = useState("");
  const [action, setAction] = useState("show");

  const handleAdd = () => {
    if (triggerTempId === "" || targetTempId === "") {
      alert("Please choose both a trigger field and a target field.");
      return;
    }
    if (triggerTempId === targetTempId) {
      alert("Trigger field and target field must be different.");
      return;
    }

    onAdd({
      trigger_tempId: triggerTempId,
      operator,
      comparison_value: operator === "is_empty" ? null : comparisonValue,
      target_tempId: targetTempId,
      action,
    });

    setTriggerTempId("");
    setComparisonValue("");
    setTargetTempId("");
  };

  const labelFor = (tempId) =>
    questions.find((q) => q.tempId === tempId)?.label || "(deleted question)";

  if (questions.length < 2) {
    return (
      <div className="question-list-empty">
        Add at least 2 questions above first, then come back here to add conditional rules
        between them.
      </div>
    );
  }

  return (
    <div>
      <div className="rule-builder-grid">
        <div className="form-group">
          <label className="form-label">IF this field…</label>
          <select value={triggerTempId} onChange={(e) => setTriggerTempId(e.target.value)}>
            <option value="">Select trigger field</option>
            {questions.map((q) => (
              <option key={q.tempId} value={q.tempId}>{q.label}</option>
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
          <select value={targetTempId} onChange={(e) => setTargetTempId(e.target.value)}>
            <option value="">Select target field</option>
            {questions.map((q) => (
              <option key={q.tempId} value={q.tempId}>{q.label}</option>
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
            <div className="rule-card" key={rule.tempId}>
              <div className="rule-sentence">
                IF <b>{labelFor(rule.trigger_tempId)}</b>{" "}
                {OPERATORS.find((o) => o.value === rule.operator)?.label}
                {rule.operator !== "is_empty" && (
                  <> "<b>{rule.comparison_value}</b>"</>
                )}{" "}
                THEN <b>{rule.action}</b> <b>{labelFor(rule.target_tempId)}</b>
                {!rule.db_id && <span className="unsaved-badge"> (not saved yet)</span>}
              </div>
              <button
                type="button"
                className="btn-icon danger"
                onClick={() => onDelete(rule.tempId)}
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