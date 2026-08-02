import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getForms,
  publishForm,
  archiveForm,
  getShareLink,
  deleteForm,
} from "../services/api";

function FormsList() {
  const [forms, setForms] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("Latest");

  const navigate = useNavigate();

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const data = await getForms();
      setForms(data);
    } catch (error) {
      console.log(error);
      alert("Error loading forms");
    }
  };

  const handlePublish = async (id) => {
    await publishForm(id);
    alert("Form Published Successfully!");
    loadForms();
  };

  const handleArchive = async (id) => {
    await archiveForm(id);
    alert("Form Archived Successfully!");
    loadForms();
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this form?"
    );

    if (!confirmDelete) return;

    await deleteForm(id);

    alert("Form Deleted Successfully!");

    loadForms();
  };

  const handleEdit = (id) => {
    navigate(`/edit-form/${id}`);
  };

  const handleView = (id) => {
    window.open(`/form/${id}`, "_blank");
  };

  const handleCopyLink = async (id) => {
    try {
      const data = await getShareLink(id);

      navigator.clipboard.writeText(data.share_link);

      alert("Share Link Copied Successfully!");
    } catch (error) {
      console.log(error);
      alert("Unable to copy link");
    }
  };

  const filteredForms = forms
    .filter((form) =>
      form.title.toLowerCase().includes(search.toLowerCase())
    )
    .filter((form) =>
      statusFilter === "All"
        ? true
        : form.status === statusFilter
    )
    .sort((a, b) =>
      sortOrder === "Latest"
        ? b.id - a.id
        : a.id - b.id
    );

  return (
    <div className="dashboard">
      <h1>📋 Forms List</h1>

      <p>Manage all your forms from one place</p>

      <div
        style={{
          display: "flex",
          gap: "15px",
          marginBottom: "25px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search by Title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "280px",
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            width: "180px",
          }}
        >
          <option>All</option>
          <option>Draft</option>
          <option>Published</option>
          <option>Archived</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          style={{
            width: "180px",
          }}
        >
          <option>Latest</option>
          <option>Oldest</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Description</th>
            <th>Status</th>
            <th width="450">Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredForms.length === 0 ? (
            <tr>
              <td
                colSpan="5"
                style={{
                  textAlign: "center",
                  padding: "25px",
                }}
              >
                No Forms Found
              </td>
            </tr>
          ) : (
            filteredForms.map((form) => (
              <tr key={form.id}>
                <td>{form.id}</td>

                <td>{form.title}</td>

                <td>{form.description}</td>

                <td>
                  {form.status === "Published" && (
                    <span
                      style={{
                        background: "#43a047",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "13px",
                      }}
                    >
                      Published
                    </span>
                  )}

                  {form.status === "Draft" && (
                    <span
                      style={{
                        background: "#fb8c00",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "13px",
                      }}
                    >
                      Draft
                    </span>
                  )}

                  {form.status === "Archived" && (
                    <span
                      style={{
                        background: "#757575",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "13px",
                      }}
                    >
                      Archived
                    </span>
                  )}
                </td>

                <td>
                  <button
                    className="edit-btn"
                    onClick={() => handleEdit(form.id)}
                  >
                    Edit
                  </button>

                  {form.status === "Draft" && (
                    <button
                      className="publish-btn"
                      onClick={() => handlePublish(form.id)}
                    >
                      Publish
                    </button>
                  )}

                  {form.status === "Published" && (
                    <button
                      onClick={() => handleArchive(form.id)}
                    >
                      Archive
                    </button>
                  )}

                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(form.id)}
                  >
                    Delete
                  </button>

                  <button
                    className="view-btn"
                    onClick={() => handleView(form.id)}
                  >
                    View
                  </button>

                  <button
                    onClick={() => handleCopyLink(form.id)}
                  >
                    Copy Link
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default FormsList;