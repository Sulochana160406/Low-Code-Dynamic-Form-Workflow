import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getForm,
  getShareLink,
  updateForm,
  createOneTimeLink,
  getOneTimeLinks,
} from "../services/api";

function FormShare() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const [linkError, setLinkError] = useState("");
  const [loading, setLoading] = useState(true);

  const [oneTimeLinks, setOneTimeLinks] = useState([]);
  const [creatingOtt, setCreatingOtt] = useState(false);

  const [expiresAt, setExpiresAt] = useState("");
  const [savingExpiry, setSavingExpiry] = useState(false);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const formData = await getForm(id);
      setForm(formData);
      setExpiresAt(formData.expires_at ? formData.expires_at.slice(0, 16) : "");

      try {
        const linkData = await getShareLink(id);
        setShareLink(linkData.share_link);
      } catch (error) {
        setLinkError(
          error.message === "Publish the form first."
            ? "Publish this form first to get a shareable link."
            : "Unable to load link."
        );
      }

      const links = await getOneTimeLinks(id);
      setOneTimeLinks(links);
    } catch (error) {
      console.log(error);
      alert("Error loading form");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareLink);
    alert("Link copied!");
  };

  const handleCreateOtt = async () => {
    setCreatingOtt(true);
    try {
      await createOneTimeLink(id);
      const links = await getOneTimeLinks(id);
      setOneTimeLinks(links);
    } catch (error) {
      alert(error.message || "Unable to create link");
    } finally {
      setCreatingOtt(false);
    }
  };

  const handleSaveExpiry = async () => {
    setSavingExpiry(true);
    try {
      await updateForm(id, { expires_at: expiresAt ? new Date(expiresAt).toISOString() : null });
      alert(expiresAt ? "Expiry set!" : "Expiry removed — form accepts responses indefinitely.");
    } catch (error) {
      alert("Unable to save expiry");
    } finally {
      setSavingExpiry(false);
    }
  };

  if (loading) {
    return <div className="page-header"><h1>Loading…</h1></div>;
  }

  if (!form) {
    return <div className="page-header"><h1>Form not found</h1></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>🔗 Share &amp; Settings — {form.title}</h1>
        <p>Get the link, generate a QR code or one-time links, and control when the form closes.</p>
      </div>

      <div style={{ margin: "0 32px 20px" }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate("/forms-list")}>
          ← Back to Forms List
        </button>
      </div>

      <div className="panel">
        <div className="panel-header"><h2>Shareable Link</h2></div>

        {linkError ? (
          <p className="form-hint">{linkError}</p>
        ) : (
          <>
            <div className="share-link-row">
              <input type="text" readOnly value={shareLink || ""} />
              <button className="btn btn-outline btn-sm" onClick={handleCopy}>Copy</button>
            </div>

            <div className="qr-code-box">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareLink)}`}
                alt="QR code for form link"
                width={200}
                height={200}
              />
              <p className="form-hint">Scan to open the form</p>
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <div className="panel-header"><h2>🔐 One-Time Links</h2></div>
        <p className="form-hint" style={{ marginBottom: "10px" }}>
          Each link below can be used for exactly one submission. Good for sending a personal
          invite that can't be reused.
        </p>
        <button className="btn btn-outline btn-sm" onClick={handleCreateOtt} disabled={creatingOtt}>
          {creatingOtt ? "Creating…" : "+ Generate one-time link"}
        </button>

        {oneTimeLinks.length > 0 && (
          <div style={{ marginTop: "14px" }}>
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
      </div>

      <div className="panel">
        <div className="panel-header"><h2>⏰ Auto-Expiry</h2></div>
        <p className="form-hint" style={{ marginBottom: "12px" }}>
          After this date/time, the form stops accepting new responses. Leave empty for no expiry.
        </p>

        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Expires at</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setExpiresAt("")}>Clear</button>
          <button className="submit-btn" onClick={handleSaveExpiry} disabled={savingExpiry}>
            {savingExpiry ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FormShare;