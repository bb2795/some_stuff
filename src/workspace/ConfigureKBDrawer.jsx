import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { listFiles } from "../services/ragApi";

// Drawer to configure a new KB over selected documents.
// Writes to userKBs so the new KB appears in the sidebar immediately.

const MONO = "'IBM Plex Mono', monospace";
const GREEN = "#16A34A";

const CHUNKERS = [
  { id: "semantic", label: "Semantic (by section headers)", desc: "Preserves tables and lists intact. Best for structured docs." },
  { id: "fixed",    label: "Fixed 1024 · overlap 128",       desc: "Simple token-window chunks." },
  { id: "recursive",label: "Recursive character",            desc: "Paragraph → sentence → char fallback." },
];

const EMBEDDINGS = [
  { id: "openai-text-embedding-3-small", label: "OpenAI text-embedding-3-small", dims: 1536 },
  { id: "cohere-embed-v3",               label: "Cohere embed-english-v3.0",     dims: 1024 },
  { id: "bge-large-en",                  label: "BGE-large-en-v1.5 (self-hosted)", dims: 1024 },
  { id: "titan-v2",                      label: "AWS Bedrock Titan Embed v2",    dims: 1024 },
];

const VECTOR_STORES = [
  { id: "opensearch", label: "OpenSearch · HNSW (managed)" },
  { id: "pgvector",   label: "PostgreSQL + pgvector" },
];

export default function ConfigureKBDrawer({ onClose }) {
  const { user } = useAuth();
  const { t } = useTheme();
  const { selectedDocIds, createUserKB, clearDocSelection, openKB } = useWorkspace();

  const [files, setFiles] = useState([]);
  const [name, setName] = useState("");
  const [chunk, setChunk] = useState("semantic");
  const [embedding, setEmbedding] = useState("openai-text-embedding-3-small");
  const [vectorStore, setVectorStore] = useState("opensearch");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listFiles(user).then(setFiles).catch(() => setFiles([]));
  }, [user]);

  // Default name suggestion
  useEffect(() => {
    if (name) return;
    if (selectedDocIds.length === 1) {
      const f = files.find((x) => (x.file_id ?? x.id) === selectedDocIds[0]);
      const n = f?.original_name ?? f?.filename;
      if (n) setName(n.replace(/\.[^.]+$/, "") + "-kb");
    } else if (selectedDocIds.length > 1) {
      setName(`kb-${new Date().toISOString().slice(0, 10)}`);
    }
  }, [files, selectedDocIds, name]);

  const memberFiles = files.filter((f) => selectedDocIds.includes(f.file_id ?? f.id));

  const create = async () => {
    if (!name.trim() || selectedDocIds.length === 0) return;
    setCreating(true);
    // Simulate ingestion delay for a bit of UX feedback
    await new Promise((r) => setTimeout(r, 900));
    const kb = createUserKB({
      name: name.trim(),
      docIds: selectedDocIds,
      chunk, embedding, vectorStore,
    });
    clearDocSelection();
    setCreating(false);
    openKB(kb);
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", justifyContent: "flex-end",
    }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
      <div style={{
        position: "relative", width: "min(720px, 92vw)", height: "100vh",
        background: t.pageBg, borderLeft: `1px solid ${t.border}`,
        boxShadow: "-10px 0 40px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column",
        animation: "slideIn 0.2s ease-out",
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${t.border}`, background: t.sidebarBg, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 5, padding: "5px 10px", color: t.textMuted, cursor: "pointer", fontSize: 12 }}>✕</button>
          <div style={{ flex: 1 }}>
            <div style={{ color: t.textStrong, fontSize: 14, fontWeight: 800 }}>Configure a new knowledge base</div>
            <div style={{ color: t.textMuted, fontSize: 11 }}>
              {selectedDocIds.length > 0
                ? `Indexing ${selectedDocIds.length} document${selectedDocIds.length === 1 ? "" : "s"} · scoped to ${user.userid}`
                : "Select documents in the sidebar first."}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
          {/* Member docs */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              Member documents · {memberFiles.length}
            </div>
            {memberFiles.length === 0 && (
              <div style={{ color: t.textMuted, fontSize: 12 }}>No documents selected. Close this, tick documents in the sidebar, and try again.</div>
            )}
            {memberFiles.map((f) => {
              const id = f.file_id ?? f.id;
              const name = f.original_name ?? f.filename ?? `File ${id}`;
              const size = f.size ?? f.file_size ?? 0;
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
                  <span style={{ color: "#7C3AED" }}>▤</span>
                  <span style={{ flex: 1, color: t.text, fontSize: 12, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                  <span style={{ color: t.textMuted, fontSize: 10, fontFamily: MONO }}>{Math.round(size / 1024)}KB · id {id}</span>
                </div>
              );
            })}
          </div>

          {/* Name */}
          <Field label="Knowledge base name" t={t}>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ccb-risk-q3-2025"
              style={{
                width: "100%", background: t.inputBg, border: `1px solid ${t.borderSubtle}`,
                borderRadius: 6, padding: "9px 12px", color: t.text, fontSize: 13,
                outline: "none", fontFamily: MONO, boxSizing: "border-box",
              }} />
          </Field>

          <Field label="Chunking strategy" t={t}>
            {CHUNKERS.map((c) => (
              <OptionRow key={c.id} selected={chunk === c.id} onClick={() => setChunk(c.id)}
                title={c.label} desc={c.desc} t={t} />
            ))}
          </Field>

          <Field label="Embedding model" t={t}>
            {EMBEDDINGS.map((e) => (
              <OptionRow key={e.id} selected={embedding === e.id} onClick={() => setEmbedding(e.id)}
                title={e.label} desc={`${e.dims}-dimensional vectors`} t={t} />
            ))}
          </Field>

          <Field label="Vector store" t={t}>
            {VECTOR_STORES.map((v) => (
              <OptionRow key={v.id} selected={vectorStore === v.id} onClick={() => setVectorStore(v.id)}
                title={v.label} t={t} />
            ))}
          </Field>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${t.border}`, background: t.sidebarBg, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: t.textMuted, fontSize: 11 }}>
            <strong style={{ color: t.text }}>{selectedDocIds.length}</strong> docs ·
            <strong style={{ color: t.text }}> {chunk}</strong> ·
            <strong style={{ color: t.text }}> {embedding.split("-")[0]}</strong> ·
            <strong style={{ color: t.text }}> {vectorStore}</strong>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose}
              style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "8px 18px", color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={create}
              disabled={creating || !name.trim() || selectedDocIds.length === 0}
              style={{
                background: creating || !name.trim() || selectedDocIds.length === 0 ? t.panelBg : GREEN,
                border: `1px solid ${creating || !name.trim() || selectedDocIds.length === 0 ? t.borderMid : GREEN}`,
                color: creating || !name.trim() || selectedDocIds.length === 0 ? t.textMuted : "#fff",
                borderRadius: 6, padding: "8px 22px", fontSize: 12, fontWeight: 700,
                cursor: creating || !name.trim() || selectedDocIds.length === 0 ? "not-allowed" : "pointer",
              }}>
              {creating ? "Creating…" : "Create knowledge base"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, t }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ color: t.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function OptionRow({ selected, onClick, title, desc, t }) {
  return (
    <button onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left", marginBottom: 5,
        background: selected ? `${GREEN}12` : t.cardBg,
        border: `2px solid ${selected ? GREEN : t.border}`,
        borderRadius: 8, padding: "9px 12px", cursor: "pointer",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 14, height: 14, borderRadius: 7,
          border: `2px solid ${selected ? GREEN : t.textDisabled}`,
          background: selected ? GREEN : "transparent",
        }} />
        <span style={{ color: selected ? t.textStrong : t.text, fontSize: 12, fontWeight: 600 }}>
          {title}
        </span>
      </div>
      {desc && (
        <div style={{ color: t.textMuted, fontSize: 11, marginTop: 3, marginLeft: 22 }}>{desc}</div>
      )}
    </button>
  );
}
