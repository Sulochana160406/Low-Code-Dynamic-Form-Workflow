function QuestionList({ questions }) {
  return (
    <div>
      <h3>Questions List</h3>

      {questions.length === 0 ? (
        <p>No questions added yet.</p>
      ) : (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>#</th>
              <th>Question</th>
              <th>Type</th>
              <th>Options</th>
              <th>Required</th>
            </tr>
          </thead>

          <tbody>
            {questions.map((question, index) => (
              <tr key={index}>
                <td>{index + 1}</td>

                <td>{question.label}</td>

                <td>{question.type}</td>

                <td>
                  {question.options && question.options.length > 0
                    ? question.options.join(", ")
                    : "-"}
                </td>

                <td>{question.required ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default QuestionList;