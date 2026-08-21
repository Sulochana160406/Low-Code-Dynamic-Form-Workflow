import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getForms,
  publishForm,
  archiveForm,
  getShareLink,
  deleteForm,
  duplicateForm,
  updateForm,
  sendFormLinkByEmail,
  createOneTimeLink,
  getOneTimeLinks,
} from "../services/api";

function ShareModal({ form, onClose }) {
  const [shareLink, setShareLink] = useState(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [linkError, setLinkError] = useState("");

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const [oneTimeLinks, setOneTimeLinks] = useState([]);
  const [creatingOtt, setCreatingOtt] = useState(false);

  useEffect(() => {
    loadShareLink();
    loadOneTimeLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadShareLink = async () => {
    setLoadingLink(true);
    try {
      const data = await getShareLink(form.id);
      setShareLink(data.share_link);
    } catch (error) {
      setLinkError(
        error.message === "Publish the form first."
          ? "Publish this form first to get a shareable link."
          : "Unable to load link."
      );
    } finally {
      setLoadingLink(false);
    }
  };

  const loadOneTimeLinks = async () => {
    try {
      const data = await getOneTimeLinks(form.id);
      setOneTimeLinks(data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareLink);
    alert("Link copied!");
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const result = await sendFormLinkByEmail(form.id, email.trim());
      alert(result.message);
      setEmail("");
    } catch (error) {
      alert(error.message || "Unable to send email");
    } finally {
      setSending(false);
    }
  };

  const handleCreateOtt = async () => {
    setCreatingOtt(true);
    try {
      await createOneTimeLink(form.id);
      loadOneTimeLinks();
    } catch (error) {
      alert(error.message || "Unable to create link");
    } finally {
      setCreatingOtt(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share "{form.title}"</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loadingLink ? (
          <p>Loading link…</p>
        ) : linkError ? (
          <p className="form-hint">{linkError}</p>
        ) : (
          <>
            <div className="share-link-row">
              <input type="text" readOnly value={shareLink} />
              <button className="btn btn-outline btn-sm" onClick={handleCopy}>Copy</button>
            </div>

            <div className="qr-code-box">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareLink)}`}
                alt="QR code for form link"
                width={180}
                height={180}
              />
              <p className="form-hint">Scan to open the form</p>
            </div>

            <hr />

            <div className="section-title" style={{ fontSize: "14px" }}>✉️ Email the link</div>
            <form onSubmit={handleSendEmail} className="share-link-row">
              <input
                type="email"
                placeholder="respondent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-outline btn-sm" disabled={sending}>
                {sending ? "Sending…" : "Send"}
              </button>
            </form>
            <p className="form-hint">Requires email (SMTP) to be configured on the server.</p>

            <hr />

            <div className="section-title" style={{ fontSize: "14px" }}>🔐 One-time links</div>
            <p className="form-hint" style={{ marginBottom: "10px" }}>
              Each link below can be used for exactly one submission.
            </p>
            <button className="btn btn-outline btn-sm" onClick={handleCreateOtt} disabled={creatingOtt}>
              {creatingOtt ? "Creating…" : "+ Generate one-time link"}
            </button>

            {oneTimeLinks.length > 0 && (
              <div style={{ marginTop: "12px", maxHeight: "160px", overflowY: "auto" }}>
                {oneTimeLinks.map((l) => (
                  <div key={l.token} className="ott-row">
                    <span className="ott-link">{l.link}</span>
                    <span className={`badge ${l.used ? "" : "badge-success"}`}>
                      {l.used ? "Used" : "Unused"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ExpiryModal({ form, onClose, onSaved }) {
  const [expiresAt, setExpiresAt] = useState(
    form.expires_at ? form.expires_at.slice(0, 16) : ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateForm(form.id, { expires_at: expiresAt ? new Date(expiresAt).toISOString() : null });
      alert(expiresAt ? "Expiry set!" : "Expiry removed — form accepts responses indefinitely.");
      onSaved();
      onClose();
    } catch (error) {
      alert("Unable to save expiry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Auto-Expiry — "{form.title}"</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="form-hint" style={{ marginBottom: "12px" }}>
          After this date/time, the form stops accepting new responses. Leave empty for no expiry.
        </p>

        <div className="form-group">
          <label className="form-label">Expires at</label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
          <button className="btn btn-outline btn-sm" onClick={() => setExpiresAt("")}>Clear</button>
          <button className="submit-btn" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormsList() {
  const [forms, setForms] = useState([]);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "All";
  const [sortOrder, setSortOrder] = useState("Latest");
  const [loading, setLoading] = useState(true);

  const [shareModalForm, setShareModalForm] = useState(null);
  const [expiryModalForm, setExpiryModalForm] = useState(null);

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

  const handleAnalytics = (id) => navigate(`/forms/${id}/analytics`);

  const handleDuplicate = async (id, title) => {
    if (!window.confirm(`Duplicate "${title}" as a new draft?`)) return;
    try {
      await duplicateForm(id);
      alert("Form duplicated successfully!");
      loadForms();
    } catch (error) {
      console.log(error);
      alert("Duplicate failed");
    }
  };

  const handleView = (id) => window.open(`/form/${id}`, "_blank");

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
                  <td>
                    {form.title}
                    {form.expires_at && (
                      <div className="form-hint">⏰ Expires {new Date(form.expires_at).toLocaleString()}</div>
                    )}
                  </td>
                  <td>{form.description}</td>
                  <td>{statusBadge(form.status)}</td>
                  <td>
                    <div className="btn-row">
                      <button className="btn btn-outline btn-sm" onClick={() => handleEdit(form.id)}>
                        Edit
                      </button>

                      <button className="btn btn-outline btn-sm" onClick={() => handleAnalytics(form.id)}>
                        📊 Analytics
                      </button>

                      <button className="btn btn-ghost btn-sm" onClick={() => handleDuplicate(form.id, form.title)}>
                        🧬 Duplicate
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

                      <button className="btn btn-outline btn-sm" onClick={() => setShareModalForm(form)}>
                        🔗 Share
                      </button>

                      <button className="btn btn-ghost btn-sm" onClick={() => setExpiryModalForm(form)}>
                        ⏰ Expiry
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

      {shareModalForm && (
        <ShareModal form={shareModalForm} onClose={() => setShareModalForm(null)} />
      )}

      {expiryModalForm && (
        <ExpiryModal
          form={expiryModalForm}
          onClose={() => setExpiryModalForm(null)}
          onSaved={loadForms}
        />
      )}
    </div>
  );
}

export default FormsList;