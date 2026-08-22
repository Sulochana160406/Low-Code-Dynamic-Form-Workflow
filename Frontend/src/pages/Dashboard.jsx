import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getForms, getSubmissions } from "../services/api";
import { useLanguage } from "../i18n";

function Dashboard() {
  const [forms, setForms] = useState([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const formsResult = await getForms().catch((error) => {
      console.log("Failed to load forms:", error);
      return null;
    });

    const responsesResult = await getSubmissions().catch((error) => {
      console.log("Failed to load submissions:", error);
      return null;
    });

    if (formsResult) setForms(formsResult);
    if (responsesResult) setTotalResponses(responsesResult.length);

    if (!formsResult && !responsesResult) {
      setLoadError(true);
    }

    setLoading(false);
  };

  const totalForms = forms.length;
  const publishedForms = forms.filter((form) => form.status === "Published").length;
  const draftForms = forms.filter((form) => form.status === "Draft").length;

  const recentForms = forms.slice().reverse().slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <h1>📋 Low-Code Dynamic Form Platform</h1>
        <p>{t("welcomeBack")}</p>
      </div>

      {loadError && (
        <div className="validation-errors" style={{ margin: "0 32px 20px" }}>
          <strong>Couldn't load your data</strong>
          <p style={{ marginTop: "4px" }}>
            This can happen on a slow or unstable connection. Please check your internet
            connection and{" "}
            <a href="#!" onClick={() => window.location.reload()}>
              tap here to retry
            </a>.
          </p>
        </div>
      )}

      <div className="cards">
        <button
          type="button"
          className="card"
          onClick={() => navigate("/forms-list")}
          title="View all forms"
        >
          <div className="card-icon blue">📄</div>
          <div>
            <div className="card-label">{t("totalForms")}</div>
            <div className="card-value">{totalForms}</div>
          </div>
        </button>

        <button
          type="button"
          className="card"
          onClick={() => navigate("/forms-list?status=Published")}
          title="View published forms"
        >
          <div className="card-icon green">✅</div>
          <div>
            <div className="card-label">{t("publishedForms")}</div>
            <div className="card-value">{publishedForms}</div>
          </div>
        </button>

        <button
          type="button"
          className="card"
          onClick={() => navigate("/forms-list?status=Draft")}
          title="View draft forms"
        >
          <div className="card-icon orange">📝</div>
          <div>
            <div className="card-label">{t("draftForms")}</div>
            <div className="card-value">{draftForms}</div>
          </div>
        </button>

        <button
          type="button"
          className="card"
          onClick={() => navigate("/responses")}
          title="View all responses"
        >
          <div className="card-icon purple">📨</div>
          <div>
            <div className="card-label">{t("totalResponses")}</div>
            <div className="card-value">{totalResponses}</div>
          </div>
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>🕒 {t("recentForms")}</h2>
          <a className="link-more" onClick={() => navigate("/forms-list")} href="#!">
            {t("viewAll")} →
          </a>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>{t("id")}</th>
              <th>{t("title")}</th>
              <th>{t("status")}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="3" className="empty-row">Loading…</td>
              </tr>
            ) : recentForms.length === 0 ? (
              <tr>
                <td colSpan="3" className="empty-row">
                  No forms yet — create your first form to get started.
                </td>
              </tr>
            ) : (
              recentForms.map((form) => (
                <tr
                  key={form.id}
                  className="clickable-row"
                  onClick={() => navigate(`/edit-form/${form.id}`)}
                  title="Open this form"
                >
                  <td>#{form.id}</td>
                  <td>{form.title}</td>
                  <td>
                    {form.status === "Published" ? (
                      <span className="badge badge-success">✅ Published</span>
                    ) : (
                      <span className="badge badge-warning">📝 Draft</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;