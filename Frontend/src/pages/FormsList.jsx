import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "All";
  const [sortOrder, setSortOrder] = useState("Latest");
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const setStatusFilter = (value) => {
    if (value === "All") {
      setSearchParams({});
    } else {
      setSearchParams({ status: value });
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
    if (!window.confirm("Are you sure you want to delete this form?")) return;

    await deleteForm(id);
    alert("Form Deleted Successfully!");
    loadForms();
  };

  const handleEdit = (id) => navigate(`/edit-form/${id}`);

  const handleView = (id) => window.open(`/form/${id}`, "_blank");

  const handleCopyLink = async (id) => {
    try {
      const data = await getShareLink(id);
      await navigator.clipboard.writeText(data.share_link);
      alert("Share Link Copied Successfully!\n" + data.share_link);
    } catch (error) {
      console.log(error);
      alert(
        error.message === "Publish the form first."
          ? "Please publish this form first, then copy the link."
          : "Unable to copy link"
      );
    }
  };

  const statusBadge = (status) => {
    if (status === "Published") return <span className="badge badge-success">✅ Published</span>;
    if (status === "Draft") return <span className="badge badge-warning">📝 Draft</span>;
    if (status === "Archived") return <span className="badge">📦 Archived</span>;
    return <span className="badge">{status}</span>;
  };

  const filteredForms = forms
    .filter((form) => form.title.toLowerCase().includes(search.toLowerCase()))
    .filter((form) => (statusFilter === "All" ? true : form.status === statusFilter))
    .sort((a, b) => (sortOrder === "Latest" ? b.id - a.id : a.id - b.id));

  return (
    <div>
      <div className="page-header">
        <h1>📋 Forms List</h1>
        <p>Manage all your forms from one place</p>
      </div>

      <div className="panel">
        <div className="filter-bar">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search by title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />

          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "180px" }}
          >
            <option>All</option>
            <option>Draft</option>
            <option>Published</option>
            <option>Archived</option>
          </select>

          <select
            className="select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{ width: "180px" }}
          >
            <option>Latest</option>
            <option>Oldest</option>
          </select>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="empty-row">Loading…</td></tr>
            ) : filteredForms.length === 0 ? (
              <tr><td colSpan="5" className="empty-row">No forms found.</td></tr>
            ) : (
              filteredForms.map((form) => (
                <tr key={form.id}>
                  <td>#{form.id}</td>
                  <td>{form.title}</td>
                  <td>{form.description}</td>
                  <td>{statusBadge(form.status)}</td>
                  <td>
                    <div className="btn-row">
                      <button className="btn btn-outline btn-sm" onClick={() => handleEdit(form.id)}>
                        Edit
                      </button>

                      {form.status !== "Archived" && (
                        <button className="btn btn-success btn-sm" onClick={() => handlePublish(form.id)}>
                          {form.status === "Published" ? "Publish New Version" : "Publish"}
                        </button>
                      )}

                      {form.status === "Published" && (
                        <button className="btn btn-warning btn-sm" onClick={() => handleArchive(form.id)}>
                          Archive
                        </button>
                      )}

                      <button className="btn btn-ghost btn-sm" onClick={() => handleView(form.id)}>
                        View
                      </button>

                      <button className="btn btn-ghost btn-sm" onClick={() => handleCopyLink(form.id)}>
                        Copy Link
                      </button>

                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(form.id)}>
                        Delete
                      </button>
                    </div>
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

export default FormsList;
