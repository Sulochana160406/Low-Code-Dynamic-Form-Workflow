import { useLocation, useNavigate, useParams } from "react-router-dom";

function ThankYou() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const formTitle = location.state?.formTitle;
  const submissionId = location.state?.submissionId;

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
        <button className="btn" onClick={() => navigate(`/form/${id}`)}>
          Submit another response
        </button>
      </div>
    </div>
  );
}

export default ThankYou;
