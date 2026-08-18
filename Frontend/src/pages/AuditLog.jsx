import { useEffect, useState } from "react";
import { getAuditLogs } from "../services/api";

const PAGE_SIZE = 20;

const ACTION_LABELS = {
  DELETE_RESPONSE: "🗑 Deleted response(s)",
  PERMANENT_DELETE_RESPONSE: "🗑 Permanently deleted response(s)",
  DUPLICATE_FORM: "🧬 Duplicated form",
  RUN_RETENTION: "🗄 Ran retention policy",
};

function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load(1);
  }, []);

  const load = async (targetPage) => {
    setLoading(true);
    try {
      const data = await getAuditLogs(targetPage, PAGE_SIZE);
      setLogs(data.results);
      setTotal(data.total);
      setPage(data.page);
    } catch (error) {
      console.log(error);
      alert("Error loading audit log");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="page-header">
        <h1>🕵️ Audit Log</h1>
        <p>A record of who did what — deletions, duplications, and retention runs</p>
      </div>

      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="empty-row">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="5" className="empty-row">No actions recorded yet.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>#{log.id}</td>
                  <td>{ACTION_LABELS[log.action] || log.action}</td>
                  <td>{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ""}</td>
                  <td style={{ fontSize: "12.5px", color: "var(--color-text-muted)" }}>
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </td>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "16px" }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</button>
            <span style={{ alignSelf: "center" }}>Page {page} of {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLog;