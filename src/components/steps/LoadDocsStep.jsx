import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { listFiles } from "../../services/ragApi";

const syncModes = [
  { id: "event", label: "Event-Driven", desc: "S3 notifications trigger ingestion on upload" },
  { id: "scheduled", label: "Scheduled", desc: "Cron-based: hourly, daily, weekly" },
  { id: "manual", label: "Manual", desc: "On-demand scan and ingest" },
];

function fileSizeLabel(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeLabel(name) {
  const ext = name?.split(".").pop()?.toUpperCase() ?? "—";
  return ext;
}

function StatusBadge({ status }) {
  const map = {
    parsed:  { bg: "#0a2a0a", color: "#3a9a5a", label: "✓ Parsed" },
    parsing: { bg: "#1a1a08", color: "#ba8a3a", label: "⟳ Parsing" },
    flagged: { bg: "#2a0a0a", color: "#ba4a4a", label: "⚠ Flagged" },
    ready:   { bg: "#0a2a0a", color: "#3a9a5a", label: "✓ Ready" },
  };
  const s = map[status] ?? map.ready;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: "3px", fontSize: "10px", fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

export default function LoadDocsStep() {
  const { user } = useAuth();
  const [syncMode, setSyncMode] = useState("event");
  const [apiFiles, setApiFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Fetch real files from RAG2 API — only returns the current user's files
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setApiError(null);
    listFiles(user)
      .then((files) => { setApiFiles(files); setLoading(false); })
      .catch((err) => { setApiError(err.message); setLoading(false); });
  }, [user]);

  const refresh = () => {
    if (!user) return;
    setLoading(true);
    setApiError(null);
    listFiles(user)
      .then((files) => { setApiFiles(files); setLoading(false); })
      .catch((err) => { setApiError(err.message); setLoading(false); });
  };

  const totalSize = apiFiles.reduce((sum, f) => sum + (f.size ?? f.file_size ?? 0), 0);

  return (
    <div>
      <p style={{ color: "#999", fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px 0" }}>
        Documents uploaded via Direct Upload or connected S3 sources appear here. Only your own documents are shown — entitlements are enforced per user.
      </p>

      {/* Sync mode */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {syncModes.map((m) => (
          <button key={m.id} onClick={() => setSyncMode(m.id)}
            style={{ flex: 1, background: syncMode === m.id ? "#1a2a3a" : "#0d0d0d", border: `1px solid ${syncMode === m.id ? "#3a7aba" : "#222"}`, borderRadius: "6px", padding: "12px", cursor: "pointer", textAlign: "left" }}>
            <div style={{ color: syncMode === m.id ? "#3a7aba" : "#aaa", fontSize: "13px", fontWeight: 600, marginBottom: "3px" }}>{m.label}</div>
            <div style={{ color: "#666", fontSize: "11px" }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Document table */}
      <div style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: "8px", overflow: "hidden", marginBottom: "12px" }}>
        {/* Table header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 60px 60px 100px", flex: 1, gap: "0" }}>
            {["Document", "Size", "Type", "ID", "Status"].map((h) => (
              <span key={h} style={{ color: "#555", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>
          <button onClick={refresh} disabled={loading}
            style={{ background: "transparent", border: "1px solid #333", borderRadius: "4px", padding: "4px 10px", color: "#666", cursor: loading ? "not-allowed" : "pointer", fontSize: "11px", marginLeft: "12px", flexShrink: 0 }}>
            {loading ? "⟳" : "↻ Refresh"}
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ padding: "24px", textAlign: "center", color: "#555", fontSize: "13px" }}>
            Fetching your files from RAG2 API<span style={{ color: "#3a7aba" }}>…</span>
          </div>
        )}

        {/* Error state */}
        {apiError && !loading && (
          <div style={{ padding: "16px" }}>
            <div style={{ background: "#1a0808", border: "1px solid #3a1a1a", borderRadius: "6px", padding: "12px 14px" }}>
              <div style={{ color: "#ba4a4a", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Could not reach RAG2 API (:8081)</div>
              <div style={{ color: "#7a4a4a", fontSize: "11px", marginBottom: "6px" }}>{apiError}</div>
              <div style={{ color: "#555", fontSize: "11px" }}>
                Run <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#777" }}>python deploy.py</span> to start the knowledge base and RAG services, then click Refresh.
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !apiError && apiFiles.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>📂</div>
            <div style={{ color: "#555", fontSize: "13px", marginBottom: "4px" }}>No documents yet</div>
            <div style={{ color: "#444", fontSize: "12px" }}>
              Upload files in Step 1 (Direct Upload) or connect an S3 source. Only <strong style={{ color: "#666" }}>{user?.userid}</strong>'s documents will appear here.
            </div>
          </div>
        )}

        {/* File rows */}
        {!loading && apiFiles.map((f) => {
          const name = f.original_name ?? f.filename ?? "unknown";
          const size = f.size ?? f.file_size ?? 0;
          const id = f.file_id ?? f.id;
          return (
            <div key={id}
              style={{ display: "grid", gridTemplateColumns: "2fr 80px 60px 60px 100px", padding: "10px 14px", borderBottom: "1px solid #111", alignItems: "center" }}>
              <span style={{ color: "#ccc", fontSize: "12px", fontFamily: "'IBM Plex Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={name}>
                {name}
              </span>
              <span style={{ color: "#777", fontSize: "12px" }}>{fileSizeLabel(size)}</span>
              <span style={{ color: "#777", fontSize: "12px" }}>{fileTypeLabel(name)}</span>
              <span style={{ color: "#6a9aba", fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace" }}>{id}</span>
              <span><StatusBadge status="ready" /></span>
            </div>
          );
        })}
      </div>

      {/* Entitlement note */}
      {!loading && !apiError && apiFiles.length > 0 && (
        <div style={{ background: "#0a1520", border: "1px solid #1a3a5a", borderRadius: "6px", padding: "10px 14px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#3a7aba" }}>🔒</span>
          <span style={{ color: "#6a8aaa", fontSize: "12px" }}>
            Showing <strong style={{ color: "#3a7aba" }}>{apiFiles.length}</strong> document(s) owned by <strong style={{ color: "#3a7aba" }}>{user?.userid}</strong>. Documents from other users are not visible.
          </span>
        </div>
      )}

      {/* Summary */}
      {!loading && !apiError && apiFiles.length > 0 && (
        <div style={{ background: "#0a1a15", border: "1px solid #1a3a2a", borderRadius: "6px", padding: "12px", marginTop: "12px" }}>
          <div style={{ color: "#3a9a5a", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Ingestion Summary</div>
          <div style={{ color: "#7aaa7a", fontSize: "12px" }}>
            {apiFiles.length} document(s) · {fileSizeLabel(totalSize)} total · All ready for RAG pipeline
          </div>
        </div>
      )}
    </div>
  );
}
