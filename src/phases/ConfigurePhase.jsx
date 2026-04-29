import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useJourney } from "../context/JourneyContext";
import { listTools } from "../services/extractionApi";

// 6 inner stages — Extraction is folded in as the first stage.
const STAGES = [
  {
    id: "extract",
    num: 1, name: "Extraction",
    title: "Extraction Tool",
    desc: "Which parser converts documents into markdown? Tools vary by layout fidelity, OCR, and hosting.",
    type: "tool-radio",
    options: [
      { id: "docling",         label: "Docling",              tag: "LOCAL",  desc: "DocLayNet + TableFormer. Best for structured docs, tables. Fully local." },
      { id: "docling_granite", label: "Docling + Granite VLM",tag: "LOCAL",  desc: "IBM Granite vision model for complex visual layouts." },
      { id: "easyocr",         label: "EasyOCR",              tag: "LOCAL",  desc: "80+ languages. Good for scans and images." },
      { id: "llamaparse",      label: "LlamaParse",           tag: "CLOUD",  desc: "LlamaIndex cloud parsing. High accuracy for complex PDFs." },
      { id: "landing_ai",      label: "Landing AI",           tag: "CLOUD",  desc: "Landing AI document extraction API." },
    ],
    params: [
      { key: "format",   label: "Output format", value: "Markdown" },
      { key: "dpi",      label: "DPI",           value: "200" },
      { key: "language", label: "Language",      value: "en" },
    ],
  },
  {
    id: "splitting", num: 2, name: "Splitting",
    title: "Chunking Strategy",
    desc: "How are documents broken up before embedding? Determines retrieval granularity.",
    type: "option-radio",
    key: "chunk",
    options: [
      { id: "semantic",  label: "Semantic (by section headers)", desc: "Splits at document section boundaries. Preserves tables intact." },
      { id: "fixed",     label: "Fixed Token Window",            desc: "512 or 1024 token chunks with overlap. Simple but may split mid-sentence." },
      { id: "recursive", label: "Recursive Character",           desc: "Paragraph → sentence → character fallback. Good general-purpose." },
    ],
    params: [
      { key: "chunkSize", label: "Max chunk size", value: "1024 tokens" },
      { key: "overlap",   label: "Overlap",        value: "128 tokens" },
    ],
  },
  {
    id: "embeddings", num: 3, name: "Embeddings",
    title: "Embedding Model",
    desc: "What turns each chunk into a vector? Dimension and domain strength vary by provider.",
    type: "option-radio",
    key: "embedding",
    options: [
      { id: "openai-text-embedding-3-small", label: "OpenAI text-embedding-3-small (1536d)", desc: "High quality, fast, cost-effective. Default." },
      { id: "cohere-embed-v3",                label: "Cohere embed-english-v3.0 (1024d)",   desc: "Strong multilingual support." },
      { id: "bge-large-en",                   label: "BGE-large-en-v1.5 (self-hosted, 1024d)", desc: "Open source, self-hosted. No data leaves infra." },
      { id: "titan-v2",                        label: "AWS Bedrock Titan Embed v2 (1024d)", desc: "Native AWS integration." },
    ],
    params: [
      { key: "batch", label: "Batch size", value: "256" },
    ],
  },
  {
    id: "vec", num: 4, name: "Vector Store",
    title: "Vector Database",
    desc: "Where do vectors live? Affects retrieval latency, cost, and operational model.",
    type: "option-radio",
    key: "vectorStore",
    options: [
      { id: "opensearch", label: "OpenSearch (managed)", desc: "Hybrid search (BM25 + kNN). Approved infrastructure." },
      { id: "pgvector",   label: "PostgreSQL + pgvector", desc: "Lightweight. Good for smaller KBs." },
    ],
    params: [
      { key: "index", label: "Index type",        value: "HNSW" },
      { key: "m",     label: "m (connections)",   value: "16" },
    ],
  },
  {
    id: "retriever", num: 5, name: "Retriever",
    title: "Retrieval Strategy",
    desc: "How are relevant chunks found and ranked at query time?",
    type: "option-radio",
    key: "retriever",
    options: [
      { id: "hybrid", label: "Hybrid (BM25 + Vector + Metadata)", desc: "Combines lexical, semantic, and metadata. Recommended." },
      { id: "vector", label: "Vector Only (kNN)",                 desc: "Pure semantic similarity." },
      { id: "bm25",   label: "BM25 Only (Lexical)",               desc: "Keyword search. Fast, deterministic." },
    ],
    params: [
      { key: "topK",     label: "Top-K",      value: "10" },
      { key: "reranker", label: "Reranker",   value: "Cohere Rerank v3" },
    ],
  },
  {
    id: "review", num: 6, name: "Review",
    title: "Configuration Summary",
    desc: "Review before deploying. The Process phase will execute against these settings.",
    type: "summary",
  },
];

export default function ConfigurePhase() {
  const { t } = useTheme();
  const { state, patch, patchRag, nextPhase } = useJourney();
  const [active, setActive] = useState("extract");
  const [toolHealth, setToolHealth] = useState(null);

  useEffect(() => {
    listTools().then(setToolHealth).catch(() => setToolHealth({ error: true }));
  }, []);

  const stage = STAGES.find((s) => s.id === active);
  const idx = STAGES.indexOf(stage);

  const selectTool = (id) => patch({ extractionTool: id });
  const selectRag = (key, id) => patchRag({ [key]: id });

  const goNext = () => {
    if (idx < STAGES.length - 1) setActive(STAGES[idx + 1].id);
    else nextPhase();
  };
  const goPrev = () => { if (idx > 0) setActive(STAGES[idx - 1].id); };

  return (
    <div>
      <p style={{ color: t.textDim, fontSize: 14, lineHeight: 1.6, marginTop: 0, marginBottom: 20 }}>
        Configure how documents move from raw bytes to retrievable knowledge. Every stage here is a real knob —
        defaults are tuned for financial documents.
      </p>

      {/* Sub-stage rail */}
      <div style={{ display: "flex", gap: 2, marginBottom: 18, background: t.panelBg, borderRadius: 8, padding: 4 }}>
        {STAGES.map((s) => {
          const ok = s.id === active;
          return (
            <button key={s.id} onClick={() => setActive(s.id)}
              style={{
                flex: 1, background: ok ? "#DC2626" : "transparent",
                border: "none", borderRadius: 6, padding: "9px 10px", cursor: "pointer",
                color: ok ? "#fff" : t.textMuted, fontSize: 12, fontWeight: ok ? 700 : 600,
              }}>
              {s.num}. {s.name}
            </button>
          );
        })}
      </div>

      {/* Stage body */}
      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 22 }}>
        <h3 style={{ color: t.textStrong, fontSize: 18, fontWeight: 700, margin: 0 }}>{stage.title}</h3>
        <p style={{ color: t.textDim, fontSize: 13, lineHeight: 1.6, marginTop: 6, marginBottom: 18 }}>{stage.desc}</p>

        {/* Tool-radio (Extraction) */}
        {stage.type === "tool-radio" && (
          <div>
            {stage.options.map((opt) => {
              const sel = state.extractionTool === opt.id;
              const avail = toolHealth?.tools?.[opt.id]?.available;
              return (
                <button key={opt.id} onClick={() => selectTool(opt.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", marginBottom: 6,
                    background: sel ? "#FEF2F2" : t.panelBg,
                    border: `2px solid ${sel ? "#DC2626" : t.border}`, borderRadius: 8,
                    padding: "11px 14px", cursor: "pointer",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: 7,
                      border: `2px solid ${sel ? "#DC2626" : t.textDisabled}`,
                      background: sel ? "#DC2626" : "transparent",
                    }} />
                    <span style={{ color: sel ? t.textStrong : t.text, fontSize: 13, fontWeight: 600 }}>{opt.label}</span>
                    <span style={{ background: opt.tag === "CLOUD" ? "#FEF3C7" : "#E0E7FF", color: opt.tag === "CLOUD" ? "#B45309" : "#4338CA", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>{opt.tag}</span>
                    {toolHealth && (
                      avail
                        ? <span style={{ background: "#DCFCE7", color: "#16A34A", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>● READY</span>
                        : <span style={{ background: "#FEE2E2", color: "#DC2626", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>● UNAVAILABLE</span>
                    )}
                  </div>
                  <div style={{ color: t.textMuted, fontSize: 12, marginTop: 4, marginLeft: 22 }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Option-radio (all other stages) */}
        {stage.type === "option-radio" && (
          <div>
            {stage.options.map((opt) => {
              const sel = state.rag[stage.key] === opt.id;
              return (
                <button key={opt.id} onClick={() => selectRag(stage.key, opt.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", marginBottom: 6,
                    background: sel ? "#FEF2F2" : t.panelBg,
                    border: `2px solid ${sel ? "#DC2626" : t.border}`, borderRadius: 8,
                    padding: "11px 14px", cursor: "pointer",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: 7,
                      border: `2px solid ${sel ? "#DC2626" : t.textDisabled}`,
                      background: sel ? "#DC2626" : "transparent",
                    }} />
                    <span style={{ color: sel ? t.textStrong : t.text, fontSize: 13, fontWeight: 600 }}>{opt.label}</span>
                  </div>
                  <div style={{ color: t.textMuted, fontSize: 12, marginTop: 4, marginLeft: 22 }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Params */}
        {stage.params && stage.params.length > 0 && (
          <div style={{ marginTop: 16, background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 6, padding: 12 }}>
            <div style={{ color: t.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 8, letterSpacing: 1 }}>Parameters</div>
            {stage.params.map((p) => (
              <div key={p.key} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
                <span style={{ color: t.textMuted, fontSize: 12 }}>{p.label}</span>
                <span style={{ color: t.text, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>{p.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {stage.type === "summary" && (
          <div style={{ background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: 16 }}>
            {[
              { label: "Extraction Tool", value: state.extractionTool },
              { label: "Chunking",        value: `${state.rag.chunk} · ${state.rag.chunkSize} tok · ${state.rag.overlap} overlap` },
              { label: "Embeddings",      value: state.rag.embedding },
              { label: "Vector Store",    value: state.rag.vectorStore },
              { label: "Retriever",       value: state.rag.retriever },
              { label: "Files selected",  value: `${(state.selectedFileIds || []).length} file(s)` },
            ].map((r) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
                <span style={{ color: t.textMuted, fontSize: 13 }}>{r.label}</span>
                <span style={{ color: t.textStrong, fontSize: 13, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{r.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          <button onClick={goPrev} disabled={idx === 0}
            style={{
              background: idx === 0 ? "transparent" : t.panelBg,
              border: `1px solid ${idx === 0 ? "transparent" : t.borderMid}`,
              borderRadius: 6, padding: "9px 22px",
              color: idx === 0 ? "transparent" : t.textMuted,
              cursor: idx === 0 ? "default" : "pointer", fontWeight: 600, fontSize: 13,
            }}>
            ← Back
          </button>
          <button onClick={goNext}
            style={{
              background: idx === STAGES.length - 1 ? "#16A34A" : "#DC2626",
              border: `1px solid ${idx === STAGES.length - 1 ? "#16A34A" : "#DC2626"}`,
              borderRadius: 6, padding: "9px 22px", color: "#fff",
              cursor: "pointer", fontWeight: 700, fontSize: 13,
            }}>
            {idx === STAGES.length - 1 ? "Deploy & Process →" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
