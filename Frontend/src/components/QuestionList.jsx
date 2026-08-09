const FIELD_ICONS = {
  text: "🔤",
  email: "✉️",
  number: "🔢",
  date: "📅",
  dropdown: "🔽",
  "multi-checkbox": "☑️",
  rating: "⭐",
  file: "📎",
};

function QuestionList({ questions, onDelete, onMoveUp, onMoveDown }) {
  return (
    <div>
      <div className="section-title">📑 Questions List ({questions.length})</div>

      {questions.length === 0 ? (
        <div className="question-list-empty">
          No questions added yet — use the form above to add your first question.
        </div>
      ) : (
        questions.map((question, index) => (
          <div className="question-card" key={question.id ?? `new-${index}`}>
            <div className="question-card-main">
              <div className="question-index">{index + 1}</div>

              <div className="question-body">
                <div className="question-label">{question.label}</div>
                <div className="question-meta">
                  <span className="field-type-badge">
                    {FIELD_ICONS[question.type] || "📝"} {question.type}
                  </span>
                  {question.required && (
                    <span className="required-badge">Required</span>
                  )}
                  {question.options && question.options.length > 0 &&
                    question.options.map((opt, i) => (
                      <span className="option-tag" key={i}>{opt}</span>
                    ))}
                </div>
              </div>
            </div>

            <div className="question-actions">
              <button
                type="button"
                className="btn-icon"
                onClick={() => onMoveUp && onMoveUp(index)}
                disabled={index === 0}
                title="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={() => onMoveDown && onMoveDown(index)}
                disabled={index === questions.length - 1}
                title="Move down"
              >
                ▼
              </button>
              <button
                type="button"
                className="btn-icon danger"
                onClick={() => onDelete && onDelete(index)}
                title="Delete question"
              >
                🗑
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default QuestionList;
