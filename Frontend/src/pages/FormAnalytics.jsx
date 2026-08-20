import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  getForm,
  getFormAnalytics,
  getFormRules,
  listFormResponses,
  getFormResponse,
  exportFormResponses,
  duplicateForm,
  getRetentionPolicy,
  setRetentionPolicy,
  runRetention,
  bulkDeleteResponses,
  getFreshDownloadLink,
} from "../services/api";

const OPERATOR_LABELS = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  greater_than: "is greater than",
  is_empty: "is empty",
};

const PAGE_SIZE = 10;
const BAR_COLORS = ["#4f46e5", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];

function FileLink({ storedName }) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    try {
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

function FormAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [rules, setRules] = useState([]);
  const [fieldLabelById, setFieldLabelById] = useState({});
  const [loading, setLoading] = useState(true);

  const [responses, setResponses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingResponses, setLoadingResponses] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [fieldFilterId, setFieldFilterId] = useState("");
  const [fieldFilterValue, setFieldFilterValue] = useState("");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detail, setDetail] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [retentionDays, setRetentionDays] = useState(365);
  const [retentionEnabled, setRetentionEnabled] = useState(false);
  const [savingRetention, setSavingRetention] = useState(false);

  useEffect(() => {
    loadOverview();
  }, [id]);

  useEffect(() => {
    loadResponses(1);
  }, [id, statusFilter, dateFrom, dateTo, fieldFilterId, fieldFilterValue]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [formData, analyticsData, rulesData, policyData] = await Promise.all([
        getForm(id),
        getFormAnalytics(id),
        getFormRules(id),
        getRetentionPolicy(id),
      ]);

      setForm(formData);
      setAnalytics(analyticsData);
      setRules(rulesData);
      setRetentionDays(policyData.retention_days);
      setRetentionEnabled(policyData.is_enabled);

      const labelMap = {};
      formData.fields.forEach((f) => { labelMap[f.id] = f.field_label; });
      setFieldLabelById(labelMap);
    } catch (error) {
      console.log(error);
      alert("Error loading analytics");
    } finally {
      setLoading(false);
    }
  };

  const loadResponses = async (targetPage) => {
    setLoadingResponses(true);
    try {
      const data = await listFormResponses(id, {
        status: statusFilter,
        submitted_from: dateFrom,
        submitted_to: dateTo,
        search,
        field_id: fieldFilterId,
        field_value: fieldFilterValue,
        page: targetPage,
        page_size: PAGE_SIZE,
      });
      setResponses(data.results);
      setTotal(data.total);
      setPage(data.page);
      setSelectedIds(new Set());
    } catch (error) {
      console.log(error);
      alert("Error loading responses");
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadResponses(1);
  };

  const handleViewResponse = async (responseId) => {
    if (detail?.id === responseId) {
      setDetail(null);
      return;
    }
    try {
      const data = await getFormResponse(id, responseId);
      setDetail(data);
    } catch (error) {
      console.log(error);
      alert("Error loading response");
    }
  };

  const toggleSelected = (responseId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(responseId)) next.delete(responseId);
      else next.add(responseId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === responses.length ? new Set() : new Set(responses.map((r) => r.id))
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected response(s)? This can't be undone from here.`)) return;

    try {
      await bulkDeleteResponses(Array.from(selectedIds), true);
      loadResponses(page);
      loadOverview();
    } catch (error) {
      console.log(error);
      alert("Error deleting responses");
    }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      await exportFormResponses(id, format);
    } catch (error) {
      console.log(error);
      alert("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!window.confirm(`Duplicate "${form.title}" as a new draft?`)) return;
    try {
      const result = await duplicateForm(id);
      alert("Form duplicated! Opening the new copy for editing.");
      navigate(`/edit-form/${result.data.id}`);
    } catch (error) {
      console.log(error);
      alert("Duplicate failed");
    }
  };

  const handleSaveRetention = async () => {
    setSavingRetention(true);
    try {
      await setRetentionPolicy(id, Number(retentionDays), retentionEnabled);
      alert("Retention policy saved!");
    } catch (error) {
      console.log(error);
      alert("Error saving retention policy");
    } finally {
      setSavingRetention(false);
    }
  };

  const handleRunRetention = async () => {
    if (!window.confirm(`Archive all completed submissions older than ${retentionDays} days?`)) return;
    try {
      const result = await runRetention(id);
      alert(result.message);
      loadOverview();
      loadResponses(page);
    } catch (error) {
      console.log(error);
      alert(error.message || "Retention run failed");
    }
  };

  if (loading) {
    return <div className="page-header"><h1>Loading analytics…</h1></div>;
  }

  if (!form || !analytics) {
    return <div className="page-header"><h1>Form not found</h1></div>;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const distributionEntries = Object.entries(analytics.field_distributions || {});

  return (
    <div>
      <div className="page-header">
        <h1>📊 {form.title}</h1>
        <p>Response analytics, filtering, export and management for this form</p>
      </div>

      <div style={{ display: "flex", gap: "10px", margin: "0 32px 20px", flexWrap: "wrap" }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate("/forms-list")}>← Back to Forms List</button>
        <button className="btn btn-outline btn-sm" onClick={handleDuplicate}>🧬 Duplicate Form</button>
        <button className="btn btn-outline btn-sm" onClick={() => handleExport("csv")} disabled={exporting}>
          {exporting ? "Exporting…" : "⬇ Export CSV"}
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => handleExport("json")} disabled={exporting}>
          {exporting ? "Exporting…" : "⬇ Export JSON"}
        </button>
      </div>

      {/* ---------------- SUMMARY CARDS ---------------- */}
      <div className="cards">
        <div className="card">
          <div className="card-icon blue">📨</div>
          <div>
            <div className="card-label">Total Submissions</div>
            <div className="card-value">{analytics.total_submissions}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-icon green">✅</div>
          <div>
            <div className="card-label">Completion Rate</div>
            <div className="card-value">{analytics.completion_rate}%</div>
          </div>
        </div>
        <div className="card">
          <div className="card-icon orange">⏱</div>
          <div>
            <div className="card-label">Avg. Time to Complete</div>
            <div className="card-value">{analytics.average_time_to_complete_seconds}s</div>
          </div>
        </div>
        <div className="card">
          <div className="card-icon purple">🚀</div>
          <div>
            <div className="card-label">Started</div>
            <div className="card-value">{analytics.started}</div>
          </div>
        </div>
      </div>

      {/* ---------------- FIELD DISTRIBUTION CHARTS ---------------- */}
      {distributionEntries.length > 0 && (
        <div className="panel">
          <div className="panel-header"><h2>Field Distributions</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            {distributionEntries.map(([label, counts], idx) => {
              const chartData = Object.entries(counts).map(([name, count]) => ({ name, count }));
              if (chartData.length === 0) return null;
              return (
                <div key={label}>
                  <div style={{ fontWeight: 600, marginBottom: "8px" }}>{label}</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill={BAR_COLORS[idx % BAR_COLORS.length]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- CONDITIONAL RULE VISUALIZER ---------------- */}
      <div className="panel">
        <div className="panel-header"><h2>🔀 Conditional Rules</h2></div>
        {rules.length === 0 ? (
          <div className="question-list-empty">No conditional rules on this form.</div>
        ) : (
          rules.map((rule) => (
            <div className="rule-card" key={rule.id}>
              <div className="rule-sentence">
                IF <b>{fieldLabelById[rule.trigger_field_id] || `Field ${rule.trigger_field_id}`}</b>{" "}
                {OPERATOR_LABELS[rule.operator] || rule.operator}
                {rule.operator !== "is_empty" && <> "<b>{rule.comparison_value}</b>"</>}{" "}
                THEN <b>{rule.action}</b>{" "}
                <b>{fieldLabelById[rule.target_field_id] || `Field ${rule.target_field_id}`}</b>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ---------------- RETENTION SETTINGS ---------------- */}
      <div className="panel">
        <div className="panel-header"><h2>🗄 Response Retention</h2></div>
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Archive completed responses older than (days)</label>
            <input
              type="number"
              min="1"
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              style={{ width: "140px" }}
            />
          </div>
          <label className="toggle-switch" style={{ marginBottom: "10px" }}>
            <input
              type="checkbox"
              checked={retentionEnabled}
              onChange={(e) => setRetentionEnabled(e.target.checked)}
            />
            <span className="toggle-switch-track"></span>
            <span className="toggle-switch-label">Enabled</span>
          </label>
          <button className="btn btn-outline btn-sm" onClick={handleSaveRetention} disabled={savingRetention}>
            {savingRetention ? "Saving…" : "Save Policy"}
          </button>
          <button className="btn btn-warning btn-sm" onClick={handleRunRetention} disabled={!retentionEnabled}>
            Run Retention Now
          </button>
        </div>
      </div>

      {/* ---------------- RESPONSE BROWSER ---------------- */}
      <div className="panel">
        <div className="panel-header"><h2>Responses</h2></div>

        <form onSubmit={handleSearchSubmit} className="filter-bar">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search by response ID or submitter"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: "160px" }}>
            <option value="">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="In Progress">In Progress</option>
            <option value="Archived">Archived</option>
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <select
            className="select"
            value={fieldFilterId}
            onChange={(e) => { setFieldFilterId(e.target.value); setFieldFilterValue(""); }}
            style={{ width: "170px" }}
          >
            <option value="">Filter by field…</option>
            {form.fields.map((f) => (
              <option key={f.id} value={f.id}>{f.field_label}</option>
            ))}
          </select>
          {fieldFilterId && (
            <input
              type="text"
              placeholder="Value (e.g. IT)"
              value={fieldFilterValue}
              onChange={(e) => setFieldFilterValue(e.target.value)}
              style={{ width: "140px" }}
            />
          )}
          <button type="submit" className="btn btn-outline btn-sm">Apply</button>
        </form>

        {selectedIds.size > 0 && (
          <div style={{ margin: "0 0 16px" }}>
            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
              🗑 Delete {selectedIds.size} selected
            </button>
          </div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={responses.length > 0 && selectedIds.size === responses.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>ID</th>
              <th>Status</th>
              <th>Submitted By</th>
              <th>Submitted At</th>
              <th>Time Taken</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loadingResponses ? (
              <tr><td colSpan="7" className="empty-row">Loading…</td></tr>
            ) : responses.length === 0 ? (
              <tr><td colSpan="7" className="empty-row">No responses match these filters.</td></tr>
            ) : (
              responses.map((r) => (
                <tr key={r.id}>
                  <td><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelected(r.id)} /></td>
                  <td>#{r.id}</td>
                  <td><span className="badge badge-info">{r.status}</span></td>
                  <td>{r.submitted_by || "—"}</td>
                  <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}</td>
                  <td>{r.completion_time_seconds != null ? `${r.completion_time_seconds}s` : "—"}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => handleViewResponse(r.id)}>
                      {detail?.id === r.id ? "Hide" : "View"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "16px" }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => loadResponses(page - 1)}>← Prev</button>
            <span style={{ alignSelf: "center" }}>Page {page} of {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => loadResponses(page + 1)}>Next →</button>
          </div>
        )}
      </div>

      {detail && (
        <div className="panel">
          <div className="panel-header"><h2>Response Details — #{detail.id}</h2></div>
          {detail.answers.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>No answers recorded.</p>
          ) : (
            detail.answers.map((a) => (
              <div
                key={a.field_id}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: "1px solid var(--color-border)",
                }}
              >
                <strong>{a.label}</strong>
                {a.type === "file" && a.value ? (
                  <FileLink storedName={a.value} />
                ) : (
                  <span>{a.value}</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default FormAnalytics;