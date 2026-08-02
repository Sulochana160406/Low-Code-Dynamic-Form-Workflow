import { useEffect, useState } from "react";
import { getSubmissions, getResponses } from "../services/api";

function Responses() {
  const [submissions, setSubmissions] = useState([]);
  const [responseValues, setResponseValues] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const submissionsData = await getSubmissions();
      const responsesData = await getResponses();

      setSubmissions(submissionsData);
      setResponseValues(responsesData);
    } catch (error) {
      console.log(error);
      alert("Error loading responses");
    }
  };

  const handleView = (submissionId) => {
    const data = responseValues.filter(
      (item) => item.submission_id === submissionId
    );

    setSelectedSubmission(data);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Responses</h2>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Submission ID</th>
            <th>Form ID</th>
            <th>Submitted By</th>
            <th>Version</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {submissions.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.form_id}</td>
              <td>{item.submitted_by}</td>
              <td>{item.version_number}</td>
              <td>
                <button onClick={() => handleView(item.id)}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedSubmission && (
        <div
          style={{
            marginTop: "30px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "20px",
            width: "500px",
          }}
        >
          <h3>Response Details</h3>

          {selectedSubmission.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <strong>
                {item.field_id === 10
                  ? "Name"
                  : item.field_id === 11
                  ? "Registration Number"
                  : item.field_id === 12
                  ? "Email"
                  : item.field_id === 13
                  ? "DOB"
                  : `Field ${item.field_id}`}
              </strong>

              <span>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Responses;