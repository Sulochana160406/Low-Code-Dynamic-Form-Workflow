import { useLocation, useNavigate, useParams } from "react-router-dom";

function ThankYou() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const formTitle = location.state?.formTitle;
  const submissionId = location.state?.submissionId;
  const answers = location.state?.answers || [];

  const handleDownload = () => {
    const lines = [
      formTitle || "Form Response",
      submissionId ? `Reference #${submissionId}` : "",
      `Submitted: ${new Date().toLocaleString()}`,
      "",
      ...answers.map((a) => `${a.label}: ${a.value}`),
    ].filter(Boolean);

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(formTitle || "response").replace(/[^a-z0-9]/gi, "_")}_receipt.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="thank-you-page">
      <div className="thank-you-card">
        <div className="thank-you-icon">✓</div>
        <h1>Thank you!</h1>
        <p>
          {formTitle ? `Your response to "${formTitle}" has` : "Your response has"} been
          submitted successfully.
          {submissionId ? ` (Reference #${submissionId})` : ""}
        </p>

        <div className="thank-you-actions">
          {answers.length > 0 && (
            <div className="download-hint-box">
              <p className="form-hint" style={{ marginBottom: "10px" }}>
                Want a copy of what you just submitted? This saves a small text file to your
                device with your answers and the date — useful for your own records.
              </p>
              <button className="btn btn-outline" onClick={handleDownload}>
                📄 Save my answers as a file
              </button>
            </div>
          )}
          <button className="submit-btn" onClick={() => navigate(`/form/${id}`)}>
            Submit another response
          </button>
        </div>
      </div>
    </div>
  );
}

export default ThankYou;