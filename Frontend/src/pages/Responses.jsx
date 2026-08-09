import { useEffect, useState } from "react";
import { getSubmissions, getResponses, getFields, getForms, getFreshDownloadLink } from "../services/api";

function FileDownloadButton({ storedName }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      // Signed links expire after an hour by design, so we always ask
      // the backend for a brand-new one right when you click — never a
      // stale/dead link, no matter how long ago the file was uploaded.
      const result = await getFreshDownloadLink(storedName);
      window.open(result.url, "_blank");
    } catch (error) {
      console.log(error);
      alert("That file could not be found on the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className="btn btn-outline btn-sm" onClick={handleClick} disabled={loading}>
      {loading ? "Getting link…" : "📎 Download File"}
    </button>
  );
}

function Responses() {
  const [submissions, setSubmissions] = useState([]);
  const [responseValues, setResponseValues] = useState([]);
  const [fieldLabels, setFieldLabels] = useState({});
  const [fieldTypes, setFieldTypes] = useState({});
  const [formTitles, setFormTitles] = useState({});
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [submissionsData, responsesData, fieldsData, formsData] = await Promise.all([
        getSubmissions(),
        getResponses(),
        getFields(),
        getForms(),
      ]);

      setSubmissions(submissionsData);
      setResponseValues(responsesData);

      const labelMap = {};
      const typeMap = {};
      fieldsData.forEach((field) => {
        labelMap[field.id] = field.field_label;
        typeMap[field.id] = field.field_type;
      });
      setFieldLabels(labelMap);
      setFieldTypes(typeMap);

      const titleMap = {};
      formsData.forEach((form) => {
        titleMap[form.id] = form.title;
      });
      setFormTitles(titleMap);
    } catch (error) {
      console.log(error);
      alert("Error loading responses");
    } finally {
      setLoading(false);
    }
  };

  const handleView = (submissionId) => {
    setSelectedSubmissionId(
      selectedSubmissionId === submissionId ? null : submissionId
    );
  };

  const selectedValues = responseValues.filter(
    (item) => item.submission_id === selectedSubmissionId
  );

  return (
    <div>
      <div className="page-header">
        <h1>📨 Responses</h1>
        <p>Every submission collected across all your forms</p>
      </div>

      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Submission ID</th>
              <th>Form</th>
              <th>Submitted By</th>
              <th>Version</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="empty-row">Loading…</td></tr>
            ) : submissions.length === 0 ? (
              <tr><td colSpan="5" className="empty-row">No submissions yet.</td></tr>
            ) : (
              submissions.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td>{formTitles[item.form_id] || `Form #${item.form_id}`}</td>
                  <td>{item.submitted_by}</td>
                  <td>
                    <span className="badge badge-info">v{item.version_number}</span>
                  </td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => handleView(item.id)}>
                      {selectedSubmissionId === item.id ? "Hide" : "View"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedSubmissionId && (
        <div className="panel">
          <div className="panel-header">
            <h2>Response Details — Submission #{selectedSubmissionId}</h2>
          </div>

          {selectedValues.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>No answers recorded.</p>
          ) : (
            selectedValues.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <strong>{fieldLabels[item.field_id] || `Field ${item.field_id}`}</strong>
                {fieldTypes[item.field_id] === "file" && item.value ? (
                  <FileDownloadButton storedName={item.value} />
                ) : (
                  <span>{item.value}</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Responses;
