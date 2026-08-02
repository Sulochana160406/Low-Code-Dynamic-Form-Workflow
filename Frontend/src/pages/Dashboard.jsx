import { useEffect, useState } from "react";
import { getForms, getResponses } from "../services/api";

function Dashboard() {
  const [forms, setForms] = useState([]);
  const [totalResponses, setTotalResponses] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const formsData = await getForms();
      const responsesData = await getResponses();

      setForms(formsData);
      setTotalResponses(responsesData.length);
    } catch (error) {
      console.log(error);
      alert("Error loading dashboard");
    }
  };

  const totalForms = forms.length;
  const publishedForms = forms.filter(
    (form) => form.status === "Published"
  ).length;
  const draftForms = forms.filter(
    (form) => form.status === "Draft"
  ).length;

  return (
    <div className="dashboard">
      <h1>📋 Low-Code Dynamic Form Platform</h1>
      <p>Welcome to Admin Dashboard</p>

      <div className="cards">
        <div className="card">
          <div style={{ fontSize: "45px" }}>📄</div>
          <h3>Total Forms</h3>
          <h2>{totalForms}</h2>
        </div>

        <div className="card">
          <div style={{ fontSize: "45px" }}>✅</div>
          <h3>Published Forms</h3>
          <h2>{publishedForms}</h2>
        </div>

        <div className="card">
          <div style={{ fontSize: "45px" }}>📝</div>
          <h3>Draft Forms</h3>
          <h2>{draftForms}</h2>
        </div>

        <div className="card">
          <div style={{ fontSize: "45px" }}>📨</div>
          <h3>Total Responses</h3>
          <h2>{totalResponses}</h2>
        </div>
      </div>

      <div className="recent-section">
        <h2>🕒 Recent Forms</h2>

        <table className="dashboard-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {forms.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: "center" }}>
                  No Forms Available
                </td>
              </tr>
            ) : (
              forms
                .slice()
                .reverse()
                .slice(0, 5)
                .map((form) => (
                  <tr key={form.id}>
                    <td>{form.id}</td>
                    <td>{form.title}</td>
                    <td>
                      {form.status === "Published" ? (
                        <span
                          style={{
                            color: "green",
                            fontWeight: "bold",
                          }}
                        >
                          ✅ Published
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "orange",
                            fontWeight: "bold",
                          }}
                        >
                          📝 Draft
                        </span>
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