import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
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
  const { t } = useTheme();
  const map = {
    parsed:  { bg: t.greenTint, color: "#3a9a5a", label: "✓ Parsed" },
    parsing: { bg: t.amberTint, color: "#ba8a3a", label: "⟳ Parsing" },
    flagged: { bg: t.redTint,   color: "#ba4a4a", label: "⚠ Flagged" },
    ready:   { bg: t.greenTint, color: "#3a9a5a", label: "✓ Ready" },
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
  const { t } = useTheme();
  const [syncMode, setSyncMode] = useState("event");
  const [apiFiles, setApiFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

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
      <p style={{ color: t.textMuted, fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px 0" }}>
        Documents uploaded via Direct Upload or connected S3 sources appear here. Only your own documents are shown — entitlements are enforced per user.
      </p>

      {/* Sync mode */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {syncModes.map((m) => (
          <button key={m.id} onClick={() => setSyncMode(m.id)}
            style={{ flex: 1, background: syncMode === m.id ? t.blueTint : t.cardBg, border: `1px solid ${syncMode === m.id ? t.blue : t.border}`, borderRadius: "6px", padding: "12px", cursor: "pointer", textAlign: "left" }}>
            <div style={{ color: syncMode === m.id ? t.blue : t.textDim, fontSize: "13px", fontWeight: 600, marginBottom: "3px" }}>{m.label}</div>
            <div style={{ color: t.textMuted, fontSize: "11px" }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Document table */}
      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: "8px", overflow: "hidden", marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${t.borderSubtle}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 60px 60px 100px", flex: 1, gap: "0" }}>
            {["Document", "Size", "Type", "ID", "Status"].map((h) => (
              <span key={h} style={{ color: t.textGhost, fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>
          <button onClick={refresh} disabled={loading}
            style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: "4px", padding: "4px 10px", color: t.textMuted, cursor: loading ? "not-allowed" : "pointer", fontSize: "11px", marginLeft: "12px", flexShrink: 0 }}>
            {loading ? "⟳" : "↻ Refresh"}
          </button>
        </div>

        {loading && (
          <div style={{ padding: "24px", textAlign: "center", color: t.textGhost, fontSize: "13px" }}>
            Fetching your files from RAG2 API<span style={{ color: t.blue }}>…</span>
          </div>
        )}

        {apiError && !loading && (
          <div style={{ padding: "16px" }}>
            <div style={{ background: t.redTint, border: "1px solid #3a1a1a", borderRadius: "6px", padding: "12px 14px" }}>
              <div style={{ color: "#ba4a4a", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Could not reach RAG2 API (:8081)</div>
              <div style={{ color: "#7a4a4a", fontSize: "11px", marginBottom: "6px" }}>{apiError}</div>
              <div style={{ color: t.textGhost, fontSize: "11px" }}>
                Run <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: t.textFaint }}>python deploy.py</span> to start the knowledge base and RAG services, then click Refresh.
              </div>
            </div>
          </div>
        )}

        {!loading && !apiError && apiFiles.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>📂</div>
            <div style={{ color: t.textGhost, fontSize: "13px", marginBottom: "4px" }}>No documents yet</div>
            <div style={{ color: t.textDisabled, fontSize: "12px" }}>
              Upload files in Step 1 (Direct Upload) or connect an S3 source. Only <strong style={{ color: t.textMuted }}>{user?.userid}</strong>'s documents will appear here.
            </div>
          </div>
        )}

        {!loading && apiFiles.map((f) => {
          const name = f.original_name ?? f.filename ?? "unknown";
          const size = f.size ?? f.file_size ?? 0;
          const id = f.file_id ?? f.id;
          return (
            <div key={id}
              style={{ display: "grid", gridTemplateColumns: "2fr 80px 60px 60px 100px", padding: "10px 14px", borderBottom: `1px solid ${t.borderFaint}`, alignItems: "center" }}>
              <span style={{ color: t.text, fontSize: "12px", fontFamily: "'IBM Plex Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={name}>
                {name}
              </span>
              <span style={{ color: t.textFaint, fontSize: "12px" }}>{fileSizeLabel(size)}</span>
              <span style={{ color: t.textFaint, fontSize: "12px" }}>{fileTypeLabel(name)}</span>
              <span style={{ color: t.blue, fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace" }}>{id}</span>
              <span><StatusBadge status="ready" /></span>
            </div>
          );
        })}
      </div>

      {!loading && !apiError && apiFiles.length > 0 && (
        <div style={{ background: t.blueTint, border: `1px solid ${t.blue}50`, borderRadius: "6px", padding: "10px 14px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: t.blue }}>🔒</span>
          <span style={{ color: t.textDim, fontSize: "12px" }}>
            Showing <strong style={{ color: t.blue }}>{apiFiles.length}</strong> document(s) owned by <strong style={{ color: t.blue }}>{user?.userid}</strong>. Documents from other users are not visible.
          </span>
        </div>
      )}

      {!loading && !apiError && apiFiles.length > 0 && (
        <div style={{ background: t.greenTint, border: "1px solid #1a3a2a", borderRadius: "6px", padding: "12px", marginTop: "12px" }}>
          <div style={{ color: "#3a9a5a", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Ingestion Summary</div>
          <div style={{ color: "#7aaa7a", fontSize: "12px" }}>
            {apiFiles.length} document(s) · {fileSizeLabel(totalSize)} total · All ready for RAG pipeline
          </div>
        </div>
      )}
    </div>
  );
}
