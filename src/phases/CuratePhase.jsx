import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useJourney } from "../context/JourneyContext";
import { listFiles, uploadFile, queryFile } from "../services/ragApi";

// CuratePhase branches on the active path:
// - upload : drag-drop panel + file table + optional direct Q&A short-circuit
// - connect: file table from connected source; user picks docs for ingestion
// - browse : catalog of existing KBs to query, with request-access CTA

const MONO = "'IBM Plex Mono', monospace";

function fmt(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useFiles(user) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const refresh = () => {
    if (!user) return;
    setLoading(true); setError(null);
    listFiles(user)
      .then((f) => { setFiles(f); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  };
  useEffect(() => { refresh(); }, [user]);
  return { files, loading, error, refresh };
}

// ─── Shared: Upload DropZone ───────────────────────────────────────────────
function DropZone({ user, onUploaded }) {
  const { t } = useTheme();
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState([]);
  const inputRef = useRef();

  const handleFiles = (list) => {
    const items = Array.from(list).map((f) => ({ file: f, status: "uploading", progress: 0, result: null, error: null }));
    setUploads((prev) => {
      const start = prev.length;
      const next = [...prev, ...items];
      items.forEach((item, i) => {
        const idx = start + i;
        uploadFile(user, item.file, (pct) =>
          setUploads((p) => { const n = [...p]; n[idx] = { ...n[idx], progress: pct }; return n; })
        )
          .then((result) => {
            setUploads((p) => { const n = [...p]; n[idx] = { ...n[idx], status: "done", result }; return n; });
            onUploaded?.(result);
          })
          .catch((err) =>
            setUploads((p) => { const n = [...p]; n[idx] = { ...n[idx], status: "error", error: err.message }; return n; })
          );
      });
      return next;
    });
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? "#7C3AED" : t.borderMid}`,
          borderRadius: 10, padding: "32px 24px", textAlign: "center", cursor: "pointer",
          background: dragging ? "#F5F3FF" : t.deepBg, transition: "all 0.15s",
        }}>
        <div style={{ fontSize: 30, marginBottom: 8 }}>📂</div>
        <div style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>
          Drop files here or click to browse
        </div>
        <div style={{ color: t.textGhost, fontSize: 12, marginTop: 4 }}>
          PDF · DOCX · TXT · CSV · Parquet — stored in S3Bucket/ via RAG2 API
        </div>
        <input ref={inputRef} type="file" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {uploads.length > 0 && (
        <div style={{ marginTop: 12, background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
          {uploads.map((u, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 80px 120px 100px", padding: "9px 14px", borderBottom: i < uploads.length - 1 ? `1px solid ${t.borderFaint}` : "none", alignItems: "center" }}>
              <span style={{ color: t.text, fontSize: 12, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.file.name}</span>
              <span style={{ color: t.textFaint, fontSize: 11 }}>{fmt(u.file.size)}</span>
              <span>
                {u.status === "uploading" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 4, background: t.borderSubtle, borderRadius: 2 }}>
                      <div style={{ width: `${u.progress}%`, height: "100%", background: "#7C3AED", borderRadius: 2 }} />
                    </div>
                    <span style={{ color: "#7C3AED", fontSize: 10 }}>{u.progress}%</span>
                  </div>
                )}
                {u.status === "done"  && <span style={{ background: "#DCFCE7", color: "#16A34A", padding: "2px 8px", borderRadius: 3, fontSize: 10, fontWeight: 700 }}>✓ Uploaded</span>}
                {u.status === "error" && <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "2px 8px", borderRadius: 3, fontSize: 10, fontWeight: 700 }} title={u.error}>✗ Failed</span>}
              </span>
              <span style={{ color: u.result ? "#7C3AED" : t.textDisabled, fontSize: 11, fontFamily: MONO }}>
                {u.result ? `id: ${u.result.file_id}` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared: File table with checkbox selection ─────────────────────────────
function FileTable({ files, loading, error, onRefresh, selected, onToggleSelect }) {
  const { t } = useTheme();

  if (loading) return <div style={{ color: t.textMuted, padding: "16px 0", fontSize: 13 }}>Loading your files…</div>;

  if (error) {
    return (
      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "12px 14px" }}>
        <div style={{ color: "#DC2626", fontSize: 12, fontWeight: 700 }}>Could not reach RAG2 API (:8081)</div>
        <div style={{ color: "#991B1B", fontSize: 11, marginTop: 4 }}>{error}</div>
        <div style={{ color: t.textGhost, fontSize: 11, marginTop: 6 }}>
          Run <span style={{ fontFamily: MONO, color: t.textFaint }}>python deploy.py</span> to start services, then <button onClick={onRefresh} style={{ color: "#DC2626", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>refresh</button>.
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div style={{ padding: 30, textAlign: "center", color: t.textGhost, fontSize: 13 }}>
        No documents yet. Upload above to get started.
      </div>
    );
  }

  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "30px 2fr 80px 80px 80px", padding: "9px 14px", borderBottom: `1px solid ${t.borderSubtle}`, background: t.panelBg }}>
        {["", "Document", "Size", "Type", "ID"].map((h) => (
          <span key={h} style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{h}</span>
        ))}
      </div>
      {files.map((f) => {
        const id = f.file_id ?? f.id;
        const name = f.original_name ?? f.filename ?? `File ${id}`;
        const size = f.size ?? f.file_size ?? 0;
        const ext = name.split(".").pop()?.toUpperCase() || "—";
        const sel = selected.includes(id);
        return (
          <div key={id} style={{
            display: "grid", gridTemplateColumns: "30px 2fr 80px 80px 80px",
            padding: "10px 14px", borderBottom: `1px solid ${t.borderFaint}`, alignItems: "center",
            background: sel ? "#F5F3FF" : "transparent", cursor: "pointer",
          }}
            onClick={() => onToggleSelect(id)}>
            <span>
              <input type="checkbox" checked={sel} readOnly style={{ accentColor: "#7C3AED" }} />
            </span>
            <span style={{ color: t.text, fontSize: 12, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
            <span style={{ color: t.textFaint, fontSize: 11 }}>{fmt(size)}</span>
            <span style={{ color: t.textFaint, fontSize: 11 }}>{ext}</span>
            <span style={{ color: "#7C3AED", fontSize: 11, fontFamily: MONO }}>{id}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Direct Q&A short-circuit (upload path only) ───────────────────────────
function DirectQA({ user, fileId }) {
  const { t } = useTheme();
  const [question, setQuestion] = useState("What is this document about?");
  const [state, setState] = useState("idle");
  const [answer, setAnswer] = useState(null);
  const [err, setErr] = useState(null);

  const ask = async () => {
    if (!fileId) return;
    setState("loading"); setErr(null); setAnswer(null);
    try {
      const res = await queryFile(user, Number(fileId), question.trim(), "xai");
      setAnswer(res); setState("done");
    } catch (e) { setErr(e.message); setState("error"); }
  };

  return (
    <div style={{ background: t.cardBg, border: `2px solid #7C3AED40`, borderRadius: 10, padding: 18, marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: 4, background: "#7C3AED" }} />
        <h3 style={{ color: t.textStrong, fontSize: 15, fontWeight: 700, margin: 0 }}>Direct Q&A — skip configuration</h3>
        <span style={{ color: t.textMuted, fontSize: 11 }}>Ask a question against the selected file without building a full KB.</span>
      </div>
      <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2}
        style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "9px 12px", color: t.text, fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button onClick={ask} disabled={!fileId || state === "loading"}
          style={{ background: !fileId ? t.panelBg : "#7C3AED", border: `1px solid ${!fileId ? t.borderMid : "#7C3AED"}`, borderRadius: 6, padding: "8px 20px", color: !fileId ? t.textMuted : "#fff", cursor: !fileId ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13 }}>
          {state === "loading" ? "Asking…" : "Ask"}
        </button>
        {!fileId && <span style={{ color: t.textMuted, fontSize: 12, alignSelf: "center" }}>Select a file above to enable</span>}
      </div>
      {state === "done" && answer && (
        <div style={{ background: "#F5F3FF", border: "1px solid #7C3AED50", borderRadius: 8, padding: 14, marginTop: 12 }}>
          <div style={{ color: "#7C3AED", fontSize: 10, fontWeight: 700, marginBottom: 6 }}>ANSWER · {answer.model}</div>
          <div style={{ color: t.text, fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{answer.answer}</div>
        </div>
      )}
      {state === "error" && <div style={{ color: "#DC2626", fontSize: 12, marginTop: 10 }}>Query failed: {err}</div>}
    </div>
  );
}

// ─── Browse path: catalog of existing KBs ──────────────────────────────────
const CATALOG = [
  { id: "ccb-risk",  name: "CCB Risk Exposures",        owner: "user1", size: "2.4M records", status: "active" },
  { id: "equities",  name: "Equities Reference Data",   owner: "user2", size: "890K records", status: "active" },
  { id: "trade-ops", name: "Trade Operations Playbooks", owner: "user1", size: "3.2K docs",   status: "active" },
  { id: "research",  name: "Global Macro Research",     owner: "user2", size: "1.1K docs",   status: "restricted" },
];

function BrowseCatalog() {
  const { t } = useTheme();
  const { user } = useAuth();
  const { nextPhase, patch } = useJourney();
  const [selected, setSelected] = useState(null);

  const ownedByUser = (kb) => kb.owner === user.userid;

  return (
    <div>
      <p style={{ color: t.textDim, fontSize: 14, lineHeight: 1.6, marginTop: 0, marginBottom: 16 }}>
        Browse knowledge bases across the enterprise. Query ones you have access to directly.
        Request access to others — approval triggers the enterprise-connect detour.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {CATALOG.map((kb) => {
          const owned = ownedByUser(kb);
          return (
            <div key={kb.id} onClick={() => setSelected(kb.id)}
              style={{
                background: selected === kb.id ? "#F0FDF4" : t.cardBg,
                border: `2px solid ${selected === kb.id ? "#059669" : t.border}`,
                borderRadius: 10, padding: 18, cursor: "pointer",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🗂</span>
                  <div style={{ color: t.textStrong, fontSize: 15, fontWeight: 700 }}>{kb.name}</div>
                </div>
                {owned
                  ? <span style={{ background: "#DCFCE7", color: "#16A34A", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3 }}>ENTITLED</span>
                  : <span style={{ background: "#FEF3C7", color: "#B45309", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3 }}>REQUEST</span>}
              </div>
              <div style={{ color: t.textMuted, fontSize: 12 }}>Owner: {kb.owner} · {kb.size}</div>
              {selected === kb.id && (
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  {owned ? (
                    <button onClick={() => { patch({ artifact: { name: kb.name, id: kb.id } }); nextPhase(); }}
                      style={{ background: "#16A34A", color: "#fff", border: "1px solid #16A34A", borderRadius: 6, padding: "7px 16px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                      Open → Knowledge
                    </button>
                  ) : (
                    <button style={{ background: "#B45309", color: "#fff", border: "1px solid #B45309", borderRadius: 6, padding: "7px 16px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                      Request Access
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function CuratePhase() {
  const { user } = useAuth();
  const { t } = useTheme();
  const { pathId, state, patch, nextPhase } = useJourney();
  const { files, loading, error, refresh } = useFiles(user);

  const [qaMode, setQaMode] = useState(false);
  const selected = state.selectedFileIds || [];
  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    patch({ selectedFileIds: next });
  };

  if (pathId === "browse") return <BrowseCatalog />;

  // Connect and Upload paths share the file-selection experience
  return (
    <div>
      <p style={{ color: t.textDim, fontSize: 14, lineHeight: 1.6, marginTop: 0, marginBottom: 18 }}>
        {pathId === "upload"
          ? "Upload documents below, then either ask questions directly or promote them into a full Knowledge Artifact."
          : "Review documents from the connected source. Pick the ones you want to ingest into the Knowledge Artifact."}
      </p>

      {pathId === "upload" && (
        <>
          <DropZone user={user} onUploaded={refresh} />
          <div style={{ height: 18 }} />
        </>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ color: t.textStrong, fontSize: 13, fontWeight: 700 }}>
          Your Documents <span style={{ color: t.textMuted, fontWeight: 500 }}>· {files.length} · {selected.length} selected</span>
        </div>
        <button onClick={refresh}
          style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 4, padding: "4px 12px", color: t.textMuted, cursor: "pointer", fontSize: 11 }}>
          ↻ Refresh
        </button>
      </div>

      <FileTable files={files} loading={loading} error={error} onRefresh={refresh}
        selected={selected} onToggleSelect={toggle} />

      <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {pathId === "upload" && (
          <button onClick={() => setQaMode((v) => !v)}
            style={{ background: qaMode ? "#7C3AED" : "transparent", border: "1px solid #7C3AED", borderRadius: 6, padding: "9px 18px", color: qaMode ? "#fff" : "#7C3AED", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {qaMode ? "✕ Hide Direct Q&A" : "⚡ Ask Now (skip to Q&A)"}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={nextPhase} disabled={selected.length === 0}
          style={{ background: selected.length === 0 ? t.panelBg : "#7C3AED", border: `1px solid ${selected.length === 0 ? t.borderMid : "#7C3AED"}`, borderRadius: 6, padding: "9px 22px", color: selected.length === 0 ? t.textMuted : "#fff", cursor: selected.length === 0 ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13 }}>
          Promote {selected.length > 0 ? `${selected.length} file(s)` : ""} · Configure →
        </button>
      </div>

      {qaMode && <DirectQA user={user} fileId={selected[0] ? String(selected[0]) : null} />}
    </div>
  );
}
