import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { listFiles } from "../services/ragApi";
import ConnectSourceStep from "../components/steps/ConnectSourceStep";
import CredentialsStep from "../components/steps/CredentialsStep";

// Configure KB wizard. 9 steps covering every meaningful knob for ingest +
// retrieval. Supports both "create new" and "reconfigure existing" (when
// configureEditId is set). Gold-vs-prod verify step with per-check retries
// + exception detail. Sources step embeds the full existing connect flow.

const MONO = "'IBM Plex Mono', monospace";
const GREEN = "#16A34A";
const BLUE  = "#2563EB";
const RED   = "#DC2626";
const AMBER = "#EA580C";

// ─── Default config ──────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  name: "",
  description: "",
  tags: [],
  visibility: "workspace",

  sourceMode: "existing", // existing | connect | both
  docIds: [],
  connectedSource: null,
  verified: null, // { gold: {...}, prod: {...} }

  extractionTool: "docling",
  extractionParams: {
    format: "Markdown",
    dpi: 200,
    language: "en",
    gpu: "auto",
    preserveTables: true,
    ocrFallback: true,
  },

  chunk: "semantic",
  chunkParams: {
    chunkSize: 1024,
    overlap: 128,
    preserveTables: true,
    preserveCodeBlocks: true,
    splitByPage: false,
  },

  embedding: "openai-text-embedding-3-small",
  embeddingParams: {
    dimensions: 1536,
    batchSize: 256,
    truncation: "end",
    normalize: true,
  },

  vectorStore: "opensearch",
  vectorParams: {
    indexType: "hnsw",
    m: 16,
    ef_construction: 256,
    ef_search: 128,
    metric: "cosine",
    dedup: true,
  },

  retriever: "hybrid",
  retrievalParams: {
    topK: 10,
    rerankTopN: 5,
    reranker: "cohere-rerank-v3",
    hybridAlpha: 0.5,
    scoreThreshold: 0.0,
    mmr: false,
    mmrLambda: 0.5,
    metadataFilters: "",
  },
};

// ─── Step list ───────────────────────────────────────────────────────────
const STEPS = [
  { id: "basics",     label: "Basics" },
  { id: "sources",    label: "Sources" },
  { id: "verify",     label: "Verify Access", condOnConnect: true },
  { id: "extraction", label: "Extraction" },
  { id: "chunking",   label: "Chunking" },
  { id: "embedding",  label: "Embedding" },
  { id: "vector",     label: "Vector Store" },
  { id: "retrieval",  label: "Retrieval" },
  { id: "review",     label: "Review & Deploy" },
];

// ─── Options catalogs ────────────────────────────────────────────────────
const EXTRACTION_TOOLS = [
  { id: "docling",         label: "Docling",              type: "LOCAL", desc: "DocLayNet + TableFormer. Best for structured docs, tables." },
  { id: "docling_granite", label: "Docling + Granite VLM",type: "LOCAL", desc: "IBM Granite VLM for complex visual layouts." },
  { id: "easyocr",         label: "EasyOCR",              type: "LOCAL", desc: "OCR for 80+ languages. Good for scans." },
  { id: "llamaparse",      label: "LlamaParse",           type: "CLOUD", desc: "LlamaIndex cloud parsing. High accuracy for complex PDFs." },
  { id: "landing_ai",      label: "Landing AI",           type: "CLOUD", desc: "Landing AI document extraction API." },
];

const CHUNKERS = [
  { id: "semantic",        label: "Semantic (section headers)",  desc: "Splits at document sections. Preserves tables intact. Best for structured docs." },
  { id: "fixed",           label: "Fixed token window",           desc: "N-token windows with overlap. Simple; may split mid-sentence." },
  { id: "recursive",       label: "Recursive character",          desc: "Paragraph → sentence → char fallback. Good general-purpose." },
  { id: "markdown-header", label: "Markdown header",              desc: "Splits at # / ## / ### boundaries. Preserves heading hierarchy." },
  { id: "sentence",        label: "Sentence",                     desc: "Splits on sentence boundaries. Highest semantic coherence, smallest chunks." },
];

const EMBEDDINGS = [
  { id: "openai-text-embedding-3-small", label: "OpenAI text-embedding-3-small", dims: 1536, provider: "OpenAI"      },
  { id: "openai-text-embedding-3-large", label: "OpenAI text-embedding-3-large", dims: 3072, provider: "OpenAI"      },
  { id: "openai-text-embedding-ada-002", label: "OpenAI text-embedding-ada-002", dims: 1536, provider: "OpenAI"      },
  { id: "cohere-embed-v3-en",            label: "Cohere embed-english-v3.0",     dims: 1024, provider: "Cohere"      },
  { id: "cohere-embed-v3-multi",         label: "Cohere embed-multilingual-v3.0",dims: 1024, provider: "Cohere"      },
  { id: "bge-large-en",                  label: "BGE-large-en-v1.5 (self-host)", dims: 1024, provider: "HuggingFace" },
  { id: "bge-small-en",                  label: "BGE-small-en-v1.5 (self-host)", dims:  384, provider: "HuggingFace" },
  { id: "all-MiniLM-L6-v2",              label: "all-MiniLM-L6-v2 (self-host)",  dims:  384, provider: "HuggingFace" },
  { id: "titan-v1",                      label: "AWS Bedrock Titan Embed v1",    dims: 1536, provider: "AWS Bedrock" },
  { id: "titan-v2",                      label: "AWS Bedrock Titan Embed v2",    dims: 1024, provider: "AWS Bedrock" },
];

const VECTOR_STORES = [
  { id: "opensearch", label: "OpenSearch (managed)",   desc: "Hybrid (BM25 + kNN). Approved infra for JPMC.", supports: ["hnsw", "ivf"] },
  { id: "pgvector",   label: "PostgreSQL + pgvector",  desc: "Lightweight. Leverages existing Postgres.",     supports: ["hnsw", "ivf", "flat"] },
  { id: "pinecone",   label: "Pinecone",               desc: "Managed SaaS. Fast cold start.",                supports: ["hnsw"] },
  { id: "faiss",      label: "FAISS (in-memory)",      desc: "Local dev / small KBs. No persistence.",        supports: ["hnsw", "ivf", "flat"] },
  { id: "mongo",      label: "MongoDB Atlas Vector",   desc: "If your metadata already lives in Mongo.",      supports: ["hnsw"] },
];

const INDEX_TYPES = {
  hnsw: { label: "HNSW",  desc: "Hierarchical graph. Fast recall, higher memory." },
  ivf:  { label: "IVF",   desc: "Inverted file. Lower memory, slightly slower recall." },
  flat: { label: "Flat",  desc: "Exact kNN. Only for small corpora (<100k vectors)." },
};

const RETRIEVERS = [
  { id: "hybrid",  label: "Hybrid (BM25 + Vector + Metadata)", desc: "Combines lexical, semantic, metadata. Recommended." },
  { id: "vector",  label: "Vector only (kNN)",                 desc: "Pure semantic similarity." },
  { id: "bm25",    label: "BM25 only (lexical)",               desc: "Keyword search. Fast, deterministic." },
  { id: "splade",  label: "SPLADE (learned sparse)",           desc: "Learned sparse embeddings. State-of-the-art lexical recall." },
];

const RERANKERS = [
  { id: "none",             label: "None" },
  { id: "cohere-rerank-v3", label: "Cohere Rerank v3" },
  { id: "bge-reranker-v2",  label: "bge-reranker-v2 (self-host)" },
  { id: "jina-reranker",    label: "Jina reranker-base" },
];

// ─── Main wizard ─────────────────────────────────────────────────────────

export default function ConfigureKBWizard({ onClose }) {
  const { user } = useAuth();
  const { t } = useTheme();
  const {
    selectedDocIds, clearDocSelection,
    createUserKB, updateUserKB, getUserKB, openKB,
    configureEditId, configureCloneSource,
  } = useWorkspace();

  const editing = !!configureEditId;
  const cloning = !!configureCloneSource;
  const existing = editing ? getUserKB(configureEditId) : null;

  // Hydrate cfg from:
  //   - existing user KB (edit mode)
  //   - catalog/user KB presets (clone mode; creates new)
  //   - defaults (new mode, optional selected docs)
  const [cfg, setCfg] = useState(() => {
    const source = existing || configureCloneSource?.presets || configureCloneSource || null;
    if (source) {
      return {
        ...DEFAULT_CONFIG,
        name:        cloning ? `${configureCloneSource.name} (clone)` : (source.name ?? ""),
        description: source.description ?? DEFAULT_CONFIG.description,
        tags:        source.tags ?? DEFAULT_CONFIG.tags,
        visibility:  source.visibility ?? DEFAULT_CONFIG.visibility,
        docIds:      cloning ? [...selectedDocIds] : (source.docIds ?? []),
        extractionTool:   source.extractionTool ?? DEFAULT_CONFIG.extractionTool,
        extractionParams: { ...DEFAULT_CONFIG.extractionParams, ...(source.extractionParams ?? {}) },
        chunk:            source.chunk ?? DEFAULT_CONFIG.chunk,
        chunkParams:      { ...DEFAULT_CONFIG.chunkParams, ...(source.chunkParams ?? {}) },
        embedding:        source.embedding ?? DEFAULT_CONFIG.embedding,
        embeddingParams:  { ...DEFAULT_CONFIG.embeddingParams, ...(source.embeddingParams ?? {}) },
        vectorStore:      source.vectorStore ?? DEFAULT_CONFIG.vectorStore,
        vectorParams:     { ...DEFAULT_CONFIG.vectorParams, ...(source.vectorParams ?? {}) },
        retriever:        source.retriever ?? DEFAULT_CONFIG.retriever,
        retrievalParams:  { ...DEFAULT_CONFIG.retrievalParams, ...(source.retrievalParams ?? {}) },
      };
    }
    return { ...DEFAULT_CONFIG, docIds: [...selectedDocIds] };
  });

  const [stepIdx, setStepIdx] = useState(0);
  const [files, setFiles] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => { listFiles(user).then(setFiles).catch(() => setFiles([])); }, [user]);

  // Active step list — skip verify if not connecting
  const activeSteps = useMemo(() =>
    STEPS.filter((s) => !s.condOnConnect || cfg.sourceMode === "connect" || cfg.sourceMode === "both"),
  [cfg.sourceMode]);
  const step = activeSteps[stepIdx];

  // Auto-suggest name for new KB
  useEffect(() => {
    if (editing || cfg.name) return;
    if (cfg.docIds.length === 1) {
      const f = files.find((x) => (x.file_id ?? x.id) === cfg.docIds[0]);
      const n = f?.original_name ?? f?.filename;
      if (n) setCfg((c) => ({ ...c, name: n.replace(/\.[^.]+$/, "") + "-kb" }));
    } else if (cfg.docIds.length > 1) {
      setCfg((c) => ({ ...c, name: `kb-${new Date().toISOString().slice(0, 10)}` }));
    }
  }, [editing, cfg.docIds, files, cfg.name]);

  const patch = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const patchParams = (key, updates) => setCfg((c) => ({ ...c, [key]: { ...c[key], ...updates } }));

  const canNext = (() => {
    if (step.id === "basics")  return !!cfg.name.trim();
    if (step.id === "sources") return cfg.docIds.length > 0 || cfg.sourceMode === "connect" || cfg.sourceMode === "both";
    return true;
  })();

  const submit = async () => {
    if (!cfg.name.trim()) return;
    setCreating(true);
    await new Promise((r) => setTimeout(r, 900));
    // Editing an un-indexed Store → flip indexed:true so it becomes a KB.
    // Editing an already-indexed KB → keep indexed:true (reconfigure).
    // Creating new → defaults to indexed:true in createUserKB.
    const payload = { ...cfg, indexed: true, kbType: cfg.kbType || "vector" };
    if (editing) {
      updateUserKB(configureEditId, payload);
    } else {
      const kb = createUserKB(payload);
      clearDocSelection();
      openKB(kb);
    }
    setCreating(false);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
      <div style={{
        position: "relative", width: "min(980px, 96vw)", height: "100vh",
        background: t.pageBg, borderLeft: `1px solid ${t.border}`,
        boxShadow: "-10px 0 40px rgba(0,0,0,0.35)",
        display: "flex", flexDirection: "column",
        animation: "wizSlide 0.2s ease-out",
      }}>
        <style>{`@keyframes wizSlide { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${t.border}`, background: t.sidebarBg, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 5, padding: "5px 10px", color: t.textMuted, cursor: "pointer", fontSize: 12 }}>✕</button>
          <div style={{ flex: 1 }}>
            <div style={{ color: t.textStrong, fontSize: 14, fontWeight: 800 }}>
              {editing
                ? (existing && existing.indexed === false
                    ? `Index Store — "${existing.name || cfg.name}"`
                    : `Reconfigure "${existing?.name || cfg.name}"`)
                : cloning
                  ? `Configure from template — ${configureCloneSource.name}`
                  : "Configure a new knowledge base"}
            </div>
            <div style={{ color: t.textMuted, fontSize: 11 }}>
              {editing
                ? (existing && existing.indexed === false
                    ? "Promote this Store to a queryable KB by attaching an ingestion + retrieval config."
                    : "Updates will re-index affected documents.")
                : cloning
                  ? "Settings seeded from the catalog. Pick your documents, adjust, and deploy as a new KB."
                  : "Ingest → chunk → embed → index → retrieve."}
            </div>
          </div>
          {cloning && (
            <span style={{ background: "#2563EB18", color: "#2563EB", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 10, letterSpacing: 0.5 }}>
              TEMPLATE · {configureCloneSource.id}
            </span>
          )}
          <span style={{ color: t.textDisabled, fontSize: 11, fontFamily: MONO }}>Step {stepIdx + 1}/{activeSteps.length}</span>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          {/* Left rail — step nav */}
          <div style={{ width: 200, flexShrink: 0, background: t.sidebarBg, borderRight: `1px solid ${t.border}`, overflow: "auto", padding: "14px 0" }}>
            {activeSteps.map((s, i) => {
              const past = i < stepIdx;
              const active = i === stepIdx;
              return (
                <button key={s.id} onClick={() => setStepIdx(i)}
                  style={{
                    display: "flex", width: "100%", textAlign: "left", alignItems: "center", gap: 10,
                    padding: "8px 14px", background: active ? `${BLUE}14` : "transparent",
                    border: "none", borderLeft: `3px solid ${active ? BLUE : "transparent"}`,
                    cursor: "pointer",
                  }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 10, flexShrink: 0,
                    background: past ? GREEN : (active ? BLUE : t.panelBg),
                    color: (past || active) ? "#fff" : t.textMuted,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 800,
                  }}>{past ? "✓" : i + 1}</span>
                  <span style={{ color: active ? t.textStrong : t.text, fontSize: 12, fontWeight: active ? 700 : 500 }}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: "auto", padding: "22px 28px" }}>
            {step.id === "basics"     && <BasicsStep cfg={cfg} patch={patch} t={t} />}
            {step.id === "sources"    && <SourcesStep cfg={cfg} patch={patch} files={files} t={t} />}
            {step.id === "verify"     && <VerifyStep cfg={cfg} patch={patch} t={t} />}
            {step.id === "extraction" && <ExtractionStep cfg={cfg} patch={patch} patchParams={patchParams} t={t} />}
            {step.id === "chunking"   && <ChunkingStep cfg={cfg} patch={patch} patchParams={patchParams} t={t} />}
            {step.id === "embedding"  && <EmbeddingStep cfg={cfg} patch={patch} patchParams={patchParams} t={t} />}
            {step.id === "vector"     && <VectorStoreStep cfg={cfg} patch={patch} patchParams={patchParams} t={t} />}
            {step.id === "retrieval"  && <RetrievalStep cfg={cfg} patch={patch} patchParams={patchParams} t={t} />}
            {step.id === "review"     && <ReviewStep cfg={cfg} files={files} t={t} editing={editing} />}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 20px", borderTop: `1px solid ${t.border}`, background: t.sidebarBg, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <button onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            disabled={stepIdx === 0}
            style={{
              background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 6,
              padding: "8px 18px", color: stepIdx === 0 ? t.textDisabled : t.textMuted,
              cursor: stepIdx === 0 ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600,
            }}>
            ← Back
          </button>

          <div style={{ color: t.textMuted, fontSize: 11 }}>
            <strong style={{ color: t.text }}>{step.label}</strong>
          </div>

          {stepIdx < activeSteps.length - 1 ? (
            <button onClick={() => setStepIdx((i) => i + 1)} disabled={!canNext}
              style={{
                background: canNext ? BLUE : t.panelBg,
                border: `1px solid ${canNext ? BLUE : t.borderMid}`,
                color: canNext ? "#fff" : t.textMuted,
                borderRadius: 6, padding: "8px 22px", fontSize: 12, fontWeight: 700,
                cursor: canNext ? "pointer" : "not-allowed",
              }}>
              Next →
            </button>
          ) : (
            <button onClick={submit} disabled={creating || !cfg.name.trim()}
              style={{
                background: creating || !cfg.name.trim() ? t.panelBg : GREEN,
                border: `1px solid ${creating || !cfg.name.trim() ? t.borderMid : GREEN}`,
                color: creating || !cfg.name.trim() ? t.textMuted : "#fff",
                borderRadius: 6, padding: "8px 22px", fontSize: 12, fontWeight: 700,
                cursor: creating || !cfg.name.trim() ? "not-allowed" : "pointer",
              }}>
              {creating ? "Deploying…" : editing ? "Update & Re-index" : "Create & Deploy"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step: Basics ────────────────────────────────────────────────────────

function BasicsStep({ cfg, patch, t }) {
  const [tagInput, setTagInput] = useState("");
  return (
    <>
      <StepHeader title="Basics" subtitle="Name, description, and visibility for this knowledge base." />

      <Field label="Name" required t={t}>
        <input type="text" value={cfg.name} onChange={(e) => patch("name", e.target.value)}
          placeholder="ccb-risk-q3-2025"
          style={inputStyle(t, true)} />
      </Field>

      <Field label="Description" t={t}>
        <textarea rows={3} value={cfg.description} onChange={(e) => patch("description", e.target.value)}
          placeholder="What does this KB contain? Who should use it?"
          style={{ ...inputStyle(t), resize: "vertical", fontFamily: "inherit", minHeight: 70 }} />
      </Field>

      <Field label="Tags" hint="Press Enter to add" t={t}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {cfg.tags.map((tag, i) => (
            <span key={i} style={{
              background: `${BLUE}15`, color: BLUE, fontSize: 10, fontWeight: 700,
              padding: "3px 8px", borderRadius: 10, display: "flex", alignItems: "center", gap: 5,
            }}>
              {tag}
              <button onClick={() => patch("tags", cfg.tags.filter((_, j) => j !== i))}
                style={{ background: "transparent", border: "none", color: BLUE, cursor: "pointer", padding: 0, fontSize: 10 }}>✕</button>
            </span>
          ))}
          <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                e.preventDefault();
                patch("tags", [...cfg.tags, tagInput.trim()]);
                setTagInput("");
              }
            }}
            placeholder={cfg.tags.length === 0 ? "e.g. risk · credit · q3-2025" : "Add…"}
            style={{ ...inputStyle(t), width: cfg.tags.length === 0 ? "100%" : 180 }} />
        </div>
      </Field>

      <Field label="Visibility" t={t}>
        <RadioGroup
          value={cfg.visibility} onChange={(v) => patch("visibility", v)} t={t}
          options={[
            { id: "private",   label: "Private",             desc: "Only you can query this KB." },
            { id: "workspace", label: "Workspace",           desc: "Anyone in this workspace." },
            { id: "lob",       label: "Line of Business",    desc: "Anyone in your LoB with the right entitlement." },
          ]} />
      </Field>
    </>
  );
}

// ─── Step: Sources ───────────────────────────────────────────────────────

function SourcesStep({ cfg, patch, files, t }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [connectSubstep, setConnectSubstep] = useState("source"); // source | creds

  const filtered = query
    ? files.filter((f) => (f.original_name ?? f.filename ?? "").toLowerCase().includes(query.toLowerCase()))
    : files;

  const toggleDoc = (id) => {
    patch("docIds", cfg.docIds.includes(id) ? cfg.docIds.filter((x) => x !== id) : [...cfg.docIds, id]);
  };

  return (
    <>
      <StepHeader title="Sources" subtitle="What gets ingested? Pick existing documents, connect a new source, or both." />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, padding: 3, background: t.panelBg, borderRadius: 8 }}>
        {[
          { id: "existing", label: "Pick existing documents", icon: "▤" },
          { id: "connect",  label: "Connect a new source",    icon: "🔗" },
          { id: "both",     label: "Both",                    icon: "⊕" },
        ].map((tab) => {
          const active = cfg.sourceMode === tab.id;
          return (
            <button key={tab.id} onClick={() => patch("sourceMode", tab.id)}
              style={{
                flex: 1, background: active ? BLUE : "transparent",
                color: active ? "#fff" : t.textMuted,
                border: "none", borderRadius: 5, padding: "8px 10px",
                fontSize: 12, fontWeight: active ? 700 : 600, cursor: "pointer",
              }}>
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {(cfg.sourceMode === "existing" || cfg.sourceMode === "both") && (
        <Panel title={`Existing documents — ${cfg.docIds.length} selected`} t={t}>
          <div style={{ marginBottom: 10, display: "flex", gap: 8 }}>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={`Filter ${files.length} documents…`}
              style={{ ...inputStyle(t), flex: 1 }} />
            <button onClick={() => patch("docIds", filtered.map((f) => f.file_id ?? f.id))}
              style={smallBtn(t)}>Select all filtered</button>
            <button onClick={() => patch("docIds", [])}
              style={smallBtn(t)}>Clear</button>
          </div>
          <div style={{ maxHeight: 320, overflow: "auto" }}>
            {filtered.length === 0 && <EmptyHint label="No documents. Drop files in the workspace first, or connect a source below." t={t} />}
            {filtered.map((f) => {
              const id = f.file_id ?? f.id;
              const name = f.original_name ?? f.filename ?? `File ${id}`;
              const size = f.size ?? f.file_size ?? 0;
              const picked = cfg.docIds.includes(id);
              return (
                <div key={id} onClick={() => toggleDoc(id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", marginBottom: 3, borderRadius: 5,
                    background: picked ? `${GREEN}14` : t.cardBg,
                    border: `1px solid ${picked ? GREEN : t.border}`,
                    cursor: "pointer",
                  }}>
                  <input type="checkbox" checked={picked} readOnly style={{ accentColor: GREEN, margin: 0 }} />
                  <span style={{ color: "#7C3AED", fontSize: 12 }}>▤</span>
                  <span style={{ flex: 1, color: t.text, fontSize: 12, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name}
                  </span>
                  <span style={{ color: t.textMuted, fontSize: 10, fontFamily: MONO }}>
                    {Math.round(size / 1024)}KB · id {id}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {(cfg.sourceMode === "connect" || cfg.sourceMode === "both") && (
        <Panel title="Connect a new source" t={t}>
          <div style={{ display: "flex", gap: 4, marginBottom: 14, padding: 3, background: t.panelBg, borderRadius: 6 }}>
            {["source", "creds"].map((s, i) => (
              <button key={s} onClick={() => setConnectSubstep(s)}
                style={{
                  flex: 1, background: connectSubstep === s ? BLUE : "transparent",
                  color: connectSubstep === s ? "#fff" : t.textMuted,
                  border: "none", borderRadius: 4, padding: "6px 10px",
                  fontSize: 11, fontWeight: connectSubstep === s ? 700 : 600, cursor: "pointer",
                }}>
                {i + 1}. {s === "source" ? "Pick source" : "Credentials"}
              </button>
            ))}
          </div>
          <div style={{
            background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14,
            maxHeight: 480, overflow: "auto",
          }}>
            {connectSubstep === "source" && <ConnectSourceStep />}
            {connectSubstep === "creds"  && <CredentialsStep />}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: t.textMuted }}>
            Next step will verify access in Gold and Production environments.
          </div>
        </Panel>
      )}
    </>
  );
}

// ─── Step: Verify (Gold vs Prod with retries + exceptions) ──────────────

const VERIFY_CHECKS = [
  { id: "assume",    label: "Assume role",            desc: "sts:AssumeRole with ExternalId" },
  { id: "list",      label: "List bucket contents",   desc: "s3:ListBucket" },
  { id: "read",      label: "Read sample object",     desc: "s3:GetObject" },
  { id: "events",    label: "Event notifications",    desc: "SNS/SQS subscription" },
  { id: "network",   label: "Network reachability",   desc: "VPC endpoint latency" },
  { id: "classif",   label: "Classification tags",    desc: "s3:GetObjectTagging" },
];

const EXCEPTION_POOL = [
  { code: "AccessDenied",     hint: "Role trust policy missing ExternalId condition." },
  { code: "NetworkTimeout",   hint: "VPC endpoint unreachable; check security groups." },
  { code: "BucketNotFound",   hint: "Bucket name or region mismatch." },
  { code: "ClassifMissing",   hint: "Classification tags not present on sampled objects." },
];

function VerifyStep({ cfg, patch, t }) {
  const [env, setEnv] = useState("gold"); // gold | prod
  // per-env check state: { [env]: { [checkId]: { status, latency, error, attempts } } }
  const [state, setState] = useState(() => ({
    gold: Object.fromEntries(VERIFY_CHECKS.map((c) => [c.id, { status: "pending", attempts: 0 }])),
    prod: Object.fromEntries(VERIFY_CHECKS.map((c) => [c.id, { status: "pending", attempts: 0 }])),
  }));

  const envState = state[env];
  const goldAllPassed = VERIFY_CHECKS.every((c) => state.gold[c.id].status === "pass");
  const prodAllPassed = VERIFY_CHECKS.every((c) => state.prod[c.id].status === "pass");

  // Simulate running all checks in the current env, with some random failures
  const runAll = async (targetEnv = env) => {
    for (const check of VERIFY_CHECKS) {
      setState((s) => ({ ...s, [targetEnv]: { ...s[targetEnv], [check.id]: { ...s[targetEnv][check.id], status: "running" } } }));
      await sleep(350 + Math.random() * 400);
      // prod is slightly more failure-prone
      const fail = Math.random() < (targetEnv === "prod" ? 0.2 : 0.08);
      const attempts = (state[targetEnv][check.id].attempts || 0) + 1;
      setState((s) => ({
        ...s,
        [targetEnv]: {
          ...s[targetEnv],
          [check.id]: fail
            ? {
                status: "fail", attempts,
                latency: Math.round(80 + Math.random() * 400),
                traceId: `trace-${Math.random().toString(36).slice(2, 10)}`,
                exception: EXCEPTION_POOL[Math.floor(Math.random() * EXCEPTION_POOL.length)],
              }
            : {
                status: "pass", attempts,
                latency: Math.round(50 + Math.random() * 250),
              },
        },
      }));
    }
  };

  const retryOne = async (checkId) => {
    setState((s) => ({ ...s, [env]: { ...s[env], [checkId]: { ...s[env][checkId], status: "running" } } }));
    await sleep(500 + Math.random() * 600);
    // higher pass rate on retry
    const fail = Math.random() < 0.2;
    setState((s) => ({
      ...s,
      [env]: {
        ...s[env],
        [checkId]: fail
          ? { ...s[env][checkId], status: "fail", attempts: (s[env][checkId].attempts || 0) + 1, latency: Math.round(100 + Math.random() * 400), exception: EXCEPTION_POOL[Math.floor(Math.random() * EXCEPTION_POOL.length)], traceId: `trace-${Math.random().toString(36).slice(2, 10)}` }
          : { ...s[env][checkId], status: "pass", attempts: (s[env][checkId].attempts || 0) + 1, latency: Math.round(50 + Math.random() * 200) },
      },
    }));
  };

  useEffect(() => {
    if (goldAllPassed && prodAllPassed) {
      patch("verified", { gold: state.gold, prod: state.prod });
    } else {
      patch("verified", null);
    }
  }, [goldAllPassed, prodAllPassed]); // eslint-disable-line

  return (
    <>
      <StepHeader title="Verify Access" subtitle="Run credential checks against Gold (staging) and Production. Retry failed checks; skip with warning at your own risk." />

      {/* Env tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <EnvTab label="Gold (staging)"  env="gold" active={env} passed={goldAllPassed}
          onClick={() => setEnv("gold")} t={t} />
        <EnvTab label="Production"      env="prod" active={env} passed={prodAllPassed}
          disabled={!goldAllPassed}
          onClick={() => goldAllPassed && setEnv("prod")} t={t} />
      </div>

      {!goldAllPassed && env === "prod" && (
        <div style={{ background: `${AMBER}14`, border: `1px solid ${AMBER}60`, borderRadius: 6, padding: "8px 12px", marginBottom: 12, color: AMBER, fontSize: 11 }}>
          ⚠ Gold checks must pass before running Production checks.
        </div>
      )}

      {/* Check list */}
      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
        {VERIFY_CHECKS.map((c, i) => {
          const s = envState[c.id];
          return (
            <div key={c.id} style={{ borderBottom: i < VERIFY_CHECKS.length - 1 ? `1px solid ${t.borderFaint}` : "none" }}>
              <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 100px 60px 100px", gap: 8, padding: "10px 14px", alignItems: "center" }}>
                <span style={{ textAlign: "center" }}>
                  {s.status === "pass"    && <span style={{ color: GREEN, fontSize: 14, fontWeight: 800 }}>✓</span>}
                  {s.status === "fail"    && <span style={{ color: RED,   fontSize: 14, fontWeight: 800 }}>✗</span>}
                  {s.status === "running" && <Spinner color={BLUE} />}
                  {s.status === "pending" && <span style={{ color: t.textDisabled, fontSize: 12 }}>○</span>}
                </span>
                <div>
                  <div style={{ color: t.text, fontSize: 12, fontWeight: 600 }}>{c.label}</div>
                  <div style={{ color: t.textMuted, fontSize: 10, fontFamily: MONO }}>{c.desc}</div>
                </div>
                <span style={{
                  color: s.status === "pass" ? GREEN : s.status === "fail" ? RED : t.textDisabled,
                  fontSize: 11, fontWeight: 700,
                  textAlign: "center", textTransform: "uppercase", letterSpacing: 0.8,
                }}>
                  {s.status}
                </span>
                <span style={{ color: t.textMuted, fontSize: 11, fontFamily: MONO, textAlign: "right" }}>
                  {s.latency != null ? `${s.latency}ms` : "—"}
                </span>
                <div style={{ textAlign: "right" }}>
                  {s.status === "fail" && (
                    <button onClick={() => retryOne(c.id)}
                      style={{ background: AMBER, color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                      Retry ({s.attempts})
                    </button>
                  )}
                  {s.status === "pass" && s.attempts > 1 && (
                    <span style={{ color: t.textDisabled, fontSize: 10, fontFamily: MONO }}>×{s.attempts}</span>
                  )}
                </div>
              </div>
              {s.status === "fail" && s.exception && (
                <div style={{
                  background: `${RED}10`, borderTop: `1px solid ${RED}30`,
                  padding: "8px 14px 10px 50px",
                }}>
                  <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
                    <span style={{ color: RED, fontWeight: 800, fontFamily: MONO }}>{s.exception.code}</span>
                    <span style={{ color: t.textDisabled, fontFamily: MONO }}>trace: {s.traceId}</span>
                  </div>
                  <div style={{ color: t.textMuted, fontSize: 11, marginTop: 3 }}>
                    <strong style={{ color: t.text }}>Remediation: </strong>{s.exception.hint}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => runAll()}
          style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          ▶ Run all {env === "gold" ? "Gold" : "Production"} checks
        </button>
        {VERIFY_CHECKS.some((c) => envState[c.id].status === "fail") && (
          <button onClick={() => {
            for (const c of VERIFY_CHECKS) if (envState[c.id].status === "fail") retryOne(c.id);
          }}
            style={{ background: AMBER, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            ↻ Retry all failed
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => patch("verified", { gold: null, prod: null, skipped: true })}
          style={{ background: "transparent", border: `1px solid ${AMBER}`, color: AMBER, borderRadius: 6, padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          Skip verification (at my own risk)
        </button>
      </div>
    </>
  );
}

function EnvTab({ label, env, active, passed, onClick, disabled, t }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        background: active === env ? (passed ? GREEN : BLUE) : t.cardBg,
        color: active === env ? "#fff" : (disabled ? t.textDisabled : t.text),
        border: `1px solid ${active === env ? (passed ? GREEN : BLUE) : t.border}`,
        borderRadius: 6, padding: "7px 16px",
        cursor: disabled ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600,
        display: "flex", alignItems: "center", gap: 6,
        opacity: disabled ? 0.5 : 1,
      }}>
      {passed && <span style={{ color: active === env ? "#fff" : GREEN }}>✓</span>}
      {label}
    </button>
  );
}

// ─── Step: Extraction ────────────────────────────────────────────────────

function ExtractionStep({ cfg, patch, patchParams, t }) {
  return (
    <>
      <StepHeader title="Extraction" subtitle="Which parser converts raw bytes into markdown? Tools vary by layout fidelity, OCR, and hosting." />

      <RadioGroup
        value={cfg.extractionTool} onChange={(v) => patch("extractionTool", v)} t={t}
        options={EXTRACTION_TOOLS.map((x) => ({
          id: x.id, label: x.label, desc: x.desc,
          badge: { text: x.type, color: x.type === "CLOUD" ? AMBER : BLUE },
        }))} />

      <div style={{ height: 14 }} />
      <Panel title="Parse parameters" t={t}>
        <Grid2>
          <Field inline label="Output format" t={t}>
            <Select value={cfg.extractionParams.format} onChange={(v) => patchParams("extractionParams", { format: v })}
              options={["Markdown", "JSON", "Plain text"]} t={t} />
          </Field>
          <Field inline label="DPI (rasterization)" t={t}>
            <Select value={cfg.extractionParams.dpi} onChange={(v) => patchParams("extractionParams", { dpi: Number(v) })}
              options={[150, 200, 300, 600]} t={t} />
          </Field>
          <Field inline label="Language (OCR hint)" t={t}>
            <Select value={cfg.extractionParams.language} onChange={(v) => patchParams("extractionParams", { language: v })}
              options={["en", "en-US", "fr", "de", "es", "ja", "zh"]} t={t} />
          </Field>
          <Field inline label="GPU mode" t={t}>
            <Select value={cfg.extractionParams.gpu} onChange={(v) => patchParams("extractionParams", { gpu: v })}
              options={["auto", "force-gpu", "force-cpu"]} t={t} />
          </Field>
        </Grid2>
        <CheckRow label="Preserve tables (don't split mid-row)" checked={cfg.extractionParams.preserveTables}
          onChange={(v) => patchParams("extractionParams", { preserveTables: v })} t={t} />
        <CheckRow label="Fall back to OCR if native text extraction produces empty pages" checked={cfg.extractionParams.ocrFallback}
          onChange={(v) => patchParams("extractionParams", { ocrFallback: v })} t={t} />
      </Panel>
    </>
  );
}

// ─── Step: Chunking ──────────────────────────────────────────────────────

function ChunkingStep({ cfg, patch, patchParams, t }) {
  return (
    <>
      <StepHeader title="Chunking" subtitle="How documents are split before embedding. Determines retrieval granularity." />

      <RadioGroup value={cfg.chunk} onChange={(v) => patch("chunk", v)} t={t}
        options={CHUNKERS.map((c) => ({ id: c.id, label: c.label, desc: c.desc }))} />

      <div style={{ height: 14 }} />
      <Panel title="Chunk parameters" t={t}>
        <Grid2>
          <Field inline label="Max chunk size (tokens)" t={t}>
            <Select value={cfg.chunkParams.chunkSize} onChange={(v) => patchParams("chunkParams", { chunkSize: Number(v) })}
              options={[256, 384, 512, 768, 1024, 1536, 2048]} t={t} />
          </Field>
          <Field inline label="Overlap (tokens)" t={t}>
            <Select value={cfg.chunkParams.overlap} onChange={(v) => patchParams("chunkParams", { overlap: Number(v) })}
              options={[0, 32, 64, 128, 256]} t={t} />
          </Field>
        </Grid2>
        <CheckRow label="Preserve tables (keep intact within a chunk)" checked={cfg.chunkParams.preserveTables}
          onChange={(v) => patchParams("chunkParams", { preserveTables: v })} t={t} />
        <CheckRow label="Preserve code blocks" checked={cfg.chunkParams.preserveCodeBlocks}
          onChange={(v) => patchParams("chunkParams", { preserveCodeBlocks: v })} t={t} />
        <CheckRow label="Force split at page boundaries" checked={cfg.chunkParams.splitByPage}
          onChange={(v) => patchParams("chunkParams", { splitByPage: v })} t={t} />
      </Panel>
    </>
  );
}

// ─── Step: Embedding ─────────────────────────────────────────────────────

function EmbeddingStep({ cfg, patch, patchParams, t }) {
  const byProvider = EMBEDDINGS.reduce((acc, e) => {
    (acc[e.provider] = acc[e.provider] || []).push(e);
    return acc;
  }, {});

  return (
    <>
      <StepHeader title="Embedding" subtitle="What turns each chunk into a vector? Dimensions and domain strength vary by provider." />

      {Object.entries(byProvider).map(([provider, models]) => (
        <div key={provider} style={{ marginBottom: 10 }}>
          <div style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>
            {provider}
          </div>
          <RadioGroup value={cfg.embedding} onChange={(v) => {
            patch("embedding", v);
            const m = EMBEDDINGS.find((e) => e.id === v);
            if (m) patchParams("embeddingParams", { dimensions: m.dims });
          }} t={t}
            options={models.map((m) => ({
              id: m.id, label: m.label,
              badge: { text: `${m.dims}d`, color: BLUE },
            }))} />
        </div>
      ))}

      <Panel title="Embedding parameters" t={t}>
        <Grid2>
          <Field inline label="Batch size" t={t}>
            <Select value={cfg.embeddingParams.batchSize} onChange={(v) => patchParams("embeddingParams", { batchSize: Number(v) })}
              options={[32, 64, 128, 256, 512]} t={t} />
          </Field>
          <Field inline label="Truncation" t={t}>
            <Select value={cfg.embeddingParams.truncation} onChange={(v) => patchParams("embeddingParams", { truncation: v })}
              options={["start", "end", "middle", "none"]} t={t} />
          </Field>
        </Grid2>
        <CheckRow label="L2-normalize vectors (required for cosine)" checked={cfg.embeddingParams.normalize}
          onChange={(v) => patchParams("embeddingParams", { normalize: v })} t={t} />
      </Panel>
    </>
  );
}

// ─── Step: Vector Store ──────────────────────────────────────────────────

function VectorStoreStep({ cfg, patch, patchParams, t }) {
  const store = VECTOR_STORES.find((v) => v.id === cfg.vectorStore) || VECTOR_STORES[0];

  return (
    <>
      <StepHeader title="Vector Store" subtitle="Where vectors live. Affects retrieval latency, cost, and operational model." />

      <RadioGroup value={cfg.vectorStore} onChange={(v) => patch("vectorStore", v)} t={t}
        options={VECTOR_STORES.map((s) => ({ id: s.id, label: s.label, desc: s.desc }))} />

      <Panel title={`${store.label} index parameters`} t={t}>
        <Grid2>
          <Field inline label="Index type" t={t}>
            <Select value={cfg.vectorParams.indexType} onChange={(v) => patchParams("vectorParams", { indexType: v })}
              options={store.supports.map((s) => ({ value: s, label: INDEX_TYPES[s].label }))} t={t} />
            <div style={{ color: t.textMuted, fontSize: 10, marginTop: 4 }}>
              {INDEX_TYPES[cfg.vectorParams.indexType]?.desc}
            </div>
          </Field>
          <Field inline label="Similarity metric" t={t}>
            <Select value={cfg.vectorParams.metric} onChange={(v) => patchParams("vectorParams", { metric: v })}
              options={[
                { value: "cosine", label: "Cosine" },
                { value: "dot",    label: "Dot product" },
                { value: "l2",     label: "L2 (Euclidean)" },
              ]} t={t} />
          </Field>
          {cfg.vectorParams.indexType === "hnsw" && (
            <>
              <Field inline label="m (graph connections)" t={t}>
                <Select value={cfg.vectorParams.m} onChange={(v) => patchParams("vectorParams", { m: Number(v) })}
                  options={[8, 16, 32, 64]} t={t} />
              </Field>
              <Field inline label="ef_construction" t={t}>
                <Select value={cfg.vectorParams.ef_construction} onChange={(v) => patchParams("vectorParams", { ef_construction: Number(v) })}
                  options={[128, 256, 400, 800]} t={t} />
              </Field>
              <Field inline label="ef_search (query-time)" t={t}>
                <Select value={cfg.vectorParams.ef_search} onChange={(v) => patchParams("vectorParams", { ef_search: Number(v) })}
                  options={[64, 128, 256, 512]} t={t} />
              </Field>
            </>
          )}
        </Grid2>
        <CheckRow label="Deduplicate identical chunks before indexing" checked={cfg.vectorParams.dedup}
          onChange={(v) => patchParams("vectorParams", { dedup: v })} t={t} />
      </Panel>
    </>
  );
}

// ─── Step: Retrieval ─────────────────────────────────────────────────────

function RetrievalStep({ cfg, patch, patchParams, t }) {
  return (
    <>
      <StepHeader title="Retrieval" subtitle="How relevant chunks are found and ranked at query time." />

      <RadioGroup value={cfg.retriever} onChange={(v) => patch("retriever", v)} t={t}
        options={RETRIEVERS.map((r) => ({ id: r.id, label: r.label, desc: r.desc }))} />

      <Panel title="Retrieval parameters" t={t}>
        <Grid2>
          <Field inline label="Top-K (candidates)" t={t}>
            <Select value={cfg.retrievalParams.topK} onChange={(v) => patchParams("retrievalParams", { topK: Number(v) })}
              options={[5, 10, 20, 50, 100]} t={t} />
          </Field>
          <Field inline label="Rerank top-N (final)" t={t}>
            <Select value={cfg.retrievalParams.rerankTopN} onChange={(v) => patchParams("retrievalParams", { rerankTopN: Number(v) })}
              options={[3, 5, 10, 20]} t={t} />
          </Field>
          <Field inline label="Reranker" t={t}>
            <Select value={cfg.retrievalParams.reranker} onChange={(v) => patchParams("retrievalParams", { reranker: v })}
              options={RERANKERS.map((r) => ({ value: r.id, label: r.label }))} t={t} />
          </Field>
          <Field inline label="Score threshold" t={t}>
            <Select value={cfg.retrievalParams.scoreThreshold} onChange={(v) => patchParams("retrievalParams", { scoreThreshold: Number(v) })}
              options={[0.0, 0.3, 0.5, 0.7, 0.85]} t={t} />
          </Field>
          {cfg.retriever === "hybrid" && (
            <Field inline label="Hybrid α (vector ← → BM25)" t={t}>
              <Select value={cfg.retrievalParams.hybridAlpha} onChange={(v) => patchParams("retrievalParams", { hybridAlpha: Number(v) })}
                options={[0.2, 0.4, 0.5, 0.6, 0.8]} t={t} />
            </Field>
          )}
        </Grid2>
        <CheckRow label="Use MMR (maximal marginal relevance) to diversify results" checked={cfg.retrievalParams.mmr}
          onChange={(v) => patchParams("retrievalParams", { mmr: v })} t={t} />
        {cfg.retrievalParams.mmr && (
          <div style={{ marginLeft: 24, marginTop: -6, marginBottom: 10 }}>
            <Field inline label="MMR λ (relevance ↔ diversity)" t={t}>
              <Select value={cfg.retrievalParams.mmrLambda} onChange={(v) => patchParams("retrievalParams", { mmrLambda: Number(v) })}
                options={[0.2, 0.5, 0.7, 0.9]} t={t} />
            </Field>
          </div>
        )}
        <Field label="Metadata filters (key=value, comma-separated)" t={t}>
          <input type="text" value={cfg.retrievalParams.metadataFilters}
            onChange={(e) => patchParams("retrievalParams", { metadataFilters: e.target.value })}
            placeholder="e.g. domain=ccb-risk, authority>=0.7, period=Q3-2025"
            style={inputStyle(t)} />
        </Field>
      </Panel>
    </>
  );
}

// ─── Step: Review ────────────────────────────────────────────────────────

function ReviewStep({ cfg, files, t, editing }) {
  const memberDocs = cfg.docIds.map((id) => files.find((f) => (f.file_id ?? f.id) === id)).filter(Boolean);
  return (
    <>
      <StepHeader title={editing ? "Review & Update" : "Review & Deploy"} subtitle="Verify the configuration before we ingest." />

      <SummaryPanel title="Basics" t={t}>
        <Row k="Name"        v={cfg.name} t={t} mono />
        <Row k="Description" v={cfg.description || "—"} t={t} />
        <Row k="Tags"        v={cfg.tags.length ? cfg.tags.join(", ") : "—"} t={t} />
        <Row k="Visibility"  v={cfg.visibility} t={t} mono />
      </SummaryPanel>

      <SummaryPanel title={`Sources · ${memberDocs.length} docs`} t={t}>
        <Row k="Source mode" v={cfg.sourceMode} t={t} mono />
        {memberDocs.slice(0, 6).map((f) => (
          <Row key={f.file_id ?? f.id} k={`doc ${f.file_id ?? f.id}`}
            v={f.original_name ?? f.filename ?? "—"} t={t} mono />
        ))}
        {memberDocs.length > 6 && <Row k="" v={`+ ${memberDocs.length - 6} more`} t={t} />}
      </SummaryPanel>

      {(cfg.sourceMode === "connect" || cfg.sourceMode === "both") && (
        <SummaryPanel title="Verification" t={t}>
          <Row k="Gold"       v={cfg.verified?.skipped ? "skipped ⚠" : cfg.verified?.gold ? "all checks passed ✓" : "not run"} t={t} />
          <Row k="Production" v={cfg.verified?.skipped ? "skipped ⚠" : cfg.verified?.prod ? "all checks passed ✓" : "not run"} t={t} />
        </SummaryPanel>
      )}

      <SummaryPanel title="Extraction" t={t}>
        <Row k="Tool"   v={cfg.extractionTool} t={t} mono />
        <Row k="Format" v={cfg.extractionParams.format} t={t} />
        <Row k="DPI"    v={cfg.extractionParams.dpi} t={t} mono />
        <Row k="Lang"   v={cfg.extractionParams.language} t={t} mono />
        <Row k="GPU"    v={cfg.extractionParams.gpu} t={t} mono />
        <Row k="Preserve tables · OCR fallback"
             v={`${cfg.extractionParams.preserveTables ? "✓" : "✕"} · ${cfg.extractionParams.ocrFallback ? "✓" : "✕"}`} t={t} />
      </SummaryPanel>

      <SummaryPanel title="Chunking" t={t}>
        <Row k="Strategy"                     v={cfg.chunk} t={t} mono />
        <Row k="Max size · overlap"           v={`${cfg.chunkParams.chunkSize} · ${cfg.chunkParams.overlap}`} t={t} mono />
        <Row k="Preserve tables · code · page"
             v={`${cfg.chunkParams.preserveTables ? "✓" : "✕"} · ${cfg.chunkParams.preserveCodeBlocks ? "✓" : "✕"} · ${cfg.chunkParams.splitByPage ? "✓" : "✕"}`} t={t} />
      </SummaryPanel>

      <SummaryPanel title="Embedding" t={t}>
        <Row k="Model"      v={cfg.embedding} t={t} mono />
        <Row k="Dims · batch · truncation · normalize"
             v={`${cfg.embeddingParams.dimensions} · ${cfg.embeddingParams.batchSize} · ${cfg.embeddingParams.truncation} · ${cfg.embeddingParams.normalize ? "✓" : "✕"}`} t={t} mono />
      </SummaryPanel>

      <SummaryPanel title="Vector store" t={t}>
        <Row k="Engine"                    v={cfg.vectorStore} t={t} mono />
        <Row k="Index · metric · dedup"    v={`${cfg.vectorParams.indexType} · ${cfg.vectorParams.metric} · ${cfg.vectorParams.dedup ? "✓" : "✕"}`} t={t} mono />
        {cfg.vectorParams.indexType === "hnsw" && (
          <Row k="HNSW m · ef_construction · ef_search"
               v={`${cfg.vectorParams.m} · ${cfg.vectorParams.ef_construction} · ${cfg.vectorParams.ef_search}`} t={t} mono />
        )}
      </SummaryPanel>

      <SummaryPanel title="Retrieval" t={t}>
        <Row k="Strategy"               v={cfg.retriever} t={t} mono />
        <Row k="top-K · rerank top-N"   v={`${cfg.retrievalParams.topK} · ${cfg.retrievalParams.rerankTopN}`} t={t} mono />
        <Row k="Reranker"               v={cfg.retrievalParams.reranker} t={t} mono />
        <Row k="Score threshold"        v={cfg.retrievalParams.scoreThreshold} t={t} mono />
        {cfg.retriever === "hybrid" && <Row k="Hybrid α" v={cfg.retrievalParams.hybridAlpha} t={t} mono />}
        {cfg.retrievalParams.mmr && <Row k="MMR λ" v={cfg.retrievalParams.mmrLambda} t={t} mono />}
        <Row k="Metadata filters"       v={cfg.retrievalParams.metadataFilters || "—"} t={t} mono />
      </SummaryPanel>
    </>
  );
}

// ─── Shared atoms ────────────────────────────────────────────────────────

function StepHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px" }}>{title}</h2>
      <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.75 }}>{subtitle}</p>
    </div>
  );
}

function Field({ label, required, hint, inline, children, t }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: inline ? "flex" : "block", alignItems: "center", gap: 8,
        color: t.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6,
      }}>
        <span>
          {label}
          {required && <span style={{ color: RED, marginLeft: 4 }}>*</span>}
        </span>
        {hint && <span style={{ color: t.textDisabled, fontSize: 10, fontWeight: 500, letterSpacing: 0, textTransform: "none" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Panel({ title, children, t }) {
  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <div style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function SummaryPanel({ title, children, t }) {
  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
      <div style={{ color: BLUE, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v, t, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
      <span style={{ color: t.textMuted, fontSize: 11 }}>{k}</span>
      <span style={{ color: t.text, fontSize: 11, textAlign: "right", fontFamily: mono ? MONO : "inherit", maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {String(v)}
      </span>
    </div>
  );
}

function RadioGroup({ value, onChange, options, t }) {
  return (
    <div>
      {options.map((opt) => {
        const sel = value === opt.id;
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)}
            style={{
              display: "block", width: "100%", textAlign: "left", marginBottom: 6,
              background: sel ? `${GREEN}12` : t.cardBg,
              border: `2px solid ${sel ? GREEN : t.border}`,
              borderRadius: 8, padding: "10px 14px", cursor: "pointer",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 14, height: 14, borderRadius: 7,
                border: `2px solid ${sel ? GREEN : t.textDisabled}`,
                background: sel ? GREEN : "transparent",
                flexShrink: 0,
              }} />
              <span style={{ color: sel ? t.textStrong : t.text, fontSize: 13, fontWeight: 600 }}>{opt.label}</span>
              {opt.badge && (
                <span style={{
                  background: `${opt.badge.color}18`, color: opt.badge.color, border: `1px solid ${opt.badge.color}40`,
                  fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3, letterSpacing: 0.4,
                }}>{opt.badge.text}</span>
              )}
            </div>
            {opt.desc && (
              <div style={{ color: t.textMuted, fontSize: 11, marginTop: 4, marginLeft: 24, lineHeight: 1.55 }}>{opt.desc}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CheckRow({ label, checked, onChange, t }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: GREEN, margin: 0 }} />
      <span style={{ color: t.text, fontSize: 12 }}>{label}</span>
    </label>
  );
}

function Select({ value, onChange, options, t }) {
  const normOpts = options.map((o) => typeof o === "object" ? o : { value: o, label: String(o) });
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle(t), appearance: "auto" }}>
      {normOpts.map((o) => (
        <option key={String(o.value)} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Grid2({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 6 }}>{children}</div>;
}

function EmptyHint({ label, t }) {
  return (
    <div style={{ padding: 18, textAlign: "center", color: t.textMuted, fontSize: 12, background: t.panelBg, borderRadius: 6 }}>
      {label}
    </div>
  );
}

function Spinner({ color = BLUE }) {
  return (
    <>
      <span style={{
        display: "inline-block", width: 12, height: 12,
        border: "2px solid #ccc", borderTopColor: color, borderRadius: "50%",
        animation: "wspin 0.7s linear infinite",
      }} />
      <style>{`@keyframes wspin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function inputStyle(t, mono) {
  return {
    width: "100%", boxSizing: "border-box",
    background: t.inputBg, border: `1px solid ${t.borderSubtle}`, borderRadius: 6,
    padding: "8px 10px", color: t.text, fontSize: 12, outline: "none",
    fontFamily: mono ? MONO : "inherit",
  };
}

function smallBtn(t) {
  return {
    background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 5,
    padding: "6px 10px", color: t.textMuted, cursor: "pointer", fontSize: 10, fontWeight: 600,
    whiteSpace: "nowrap", flexShrink: 0,
  };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
