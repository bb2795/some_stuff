import { useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useWorkspace, KB_CATALOG } from "../context/WorkspaceContext";
import DocumentView from "./DocumentView";
import KnowledgeBaseView from "./KnowledgeBaseView";
import StoreView from "./StoreView";

const MONO = "'IBM Plex Mono', monospace";

export default function MainPanel({ files, onUpload, onRefresh, selection }) {
  const { t } = useTheme();

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: t.pageBg }}>
      {selection.kind === "empty"  && <EmptyState files={files} onUpload={onUpload} />}
      {selection.kind === "doc"    && <DocumentView file={selection.file} onRefresh={onRefresh} />}
      {selection.kind === "kb" && (
        selection.kb?.indexed === false
          ? <StoreView store={selection.kb} />
          : <KnowledgeBaseView kb={selection.kb} />
      )}
      {selection.kind === "source" && <SourceView source={selection.source} />}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────
function EmptyState({ files, onUpload }) {
  const { t } = useTheme();
  const { openFlowGraph, openObsidian, setConnectOpen, openDoc } = useWorkspace();
  const [dragging, setDragging] = useState(false);
  const ref = useRef();

  const recent = (files || []).slice(0, 4);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onUpload(e.dataTransfer.files); }}
      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 24, overflow: "auto" }}>
      <div style={{ textAlign: "center", maxWidth: 540 }}>
        <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.6 }}>◉</div>
        <h1 style={{ color: t.textStrong, fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
          Knowledge
        </h1>
      </div>

      {/* Big drop zone */}
      <div onClick={() => ref.current?.click()}
        style={{
          width: "min(720px, 90%)", border: `2px dashed ${dragging ? "#7C3AED" : t.borderMid}`,
          borderRadius: 14, padding: "36px 24px", textAlign: "center", cursor: "pointer",
          background: dragging ? "rgba(124,58,237,0.08)" : t.cardBg, transition: "all 0.15s",
        }}>
        <div style={{ fontSize: 34, marginBottom: 6 }}>📂</div>
        <div style={{ color: t.textStrong, fontSize: 15, fontWeight: 700 }}>Drop files to upload</div>
        <div style={{ color: t.textMuted, fontSize: 12, marginTop: 4 }}>
          PDF · DOCX · TXT · CSV · Parquet — RAG2 API · stored in S3Bucket/ · scoped to you
        </div>
        <input ref={ref} type="file" multiple style={{ display: "none" }}
          onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }} />
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => ref.current?.click()} style={quickActionStyle(t, "#7C3AED")}>📄 Upload documents</button>
        <button onClick={() => setConnectOpen(true)} style={quickActionStyle(t, "#2563EB")}>🔗 Connect a source</button>
        <button onClick={openFlowGraph} style={quickActionStyle(t, "#6366F1")}>▦ View the flow graph</button>
        <button onClick={openObsidian}  style={quickActionStyle(t, "#16A34A")}>◉ Open knowledge graph</button>
      </div>

      {/* Recent uploads */}
      {recent.length > 0 && (
        <div style={{ width: "min(720px, 90%)", marginTop: 14 }}>
          <div style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Recent documents
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
            {recent.map((f) => {
              const id = f.file_id ?? f.id;
              const name = f.original_name ?? f.filename ?? `File ${id}`;
              const size = f.size ?? f.file_size ?? 0;
              return (
                <button key={id} onClick={() => openDoc(f)}
                  style={{
                    background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 8,
                    padding: "10px 12px", cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                  <span style={{ fontSize: 18 }}>▤</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: t.text, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: MONO }}>{name}</div>
                    <div style={{ color: t.textMuted, fontSize: 10, marginTop: 1 }}>{Math.round(size / 1024)}KB · id {id}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Source view (connected bucket/etc) ────────────────────────────────────
function SourceView({ source }) {
  const { t } = useTheme();
  const { setConnectOpen } = useWorkspace();

  return (
    <div style={{ flex: 1, padding: 28, overflow: "auto" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{
            background: `${source.color}20`, color: source.color,
            padding: "3px 8px", borderRadius: 3, fontSize: 10, fontWeight: 700,
          }}>{source.badge}</span>
          <span style={{ color: t.textGhost, fontSize: 11, fontFamily: MONO }}>{source.id}</span>
        </div>
        <h2 style={{ color: t.textStrong, fontSize: 22, fontWeight: 800, margin: 0, fontFamily: MONO }}>
          {source.name}
        </h2>
        <div style={{ color: t.textDim, fontSize: 12, marginTop: 4 }}>
          {source.objects.toLocaleString()} objects · scoped read-only · IAM cross-account role
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <button style={{ background: "#3a7aba", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            Scan & Ingest
          </button>
          <button onClick={() => setConnectOpen(true)} style={{ background: "transparent", color: t.textMuted, border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "8px 16px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            Manage credentials
          </button>
        </div>

        <div style={{ marginTop: 28, background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Inventory preview
          </div>
          {[
            { type: "PDF",     count: 342, pct: 27 },
            { type: "Parquet", count: 580, pct: 47 },
            { type: "CSV",     count: 198, pct: 16 },
            { type: "DOCX",    count: 89,  pct: 7  },
            { type: "JSON",    count: 38,  pct: 3  },
          ].map((r) => (
            <div key={r.type} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
              <span style={{ color: t.text, fontSize: 12, width: 80, fontFamily: MONO }}>{r.type}</span>
              <div style={{ flex: 1, height: 4, background: t.borderSubtle, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${r.pct}%`, height: "100%", background: "#3a7aba" }} />
              </div>
              <span style={{ color: t.textMuted, fontSize: 11, fontFamily: MONO, width: 50, textAlign: "right" }}>{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function quickActionStyle(t, color) {
  return {
    background: t.cardBg, color: t.text,
    border: `1px solid ${color}60`, borderRadius: 8,
    padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  };
}
