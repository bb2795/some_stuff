import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import FeasibilityNote from "../FeasibilityNote";

const stages = [
  {
    num: 1,
    name: "Splitting",
    config: {
      title: "Chunking Strategy",
      options: [
        {
          name: "Semantic (by section headers)",
          selected: true,
          desc: "Splits at document section boundaries. Preserves tables and lists intact. Best for structured docs like 10-Qs.",
        },
        {
          name: "Fixed Token Window",
          selected: false,
          desc: "512 or 1024 token chunks with overlap. Simple but may split mid-sentence or mid-table.",
        },
        {
          name: "Recursive Character",
          selected: false,
          desc: "Splits on paragraph, sentence, then character boundaries. Good general-purpose fallback.",
        },
      ],
      params: [
        { label: "Max Chunk Size", value: "1024 tokens" },
        { label: "Overlap", value: "128 tokens" },
        { label: "Preserve Tables", value: "Yes (keep intact)" },
      ],
    },
  },
  {
    num: 2,
    name: "Embeddings",
    config: {
      title: "Embeddings Provider",
      options: [
        {
          name: "OpenAI Embeddings — text-embedding-3-small (1536d)",
          selected: true,
          desc: "High quality, fast, cost-effective. Default for most use cases.",
        },
        {
          name: "Cohere Embeddings — embed-english-v3.0",
          selected: false,
          desc: "Strong multilingual support. Good for cross-language knowledge bases.",
        },
        {
          name: "HuggingFace — BAAI/bge-large-en-v1.5",
          selected: false,
          desc: "Open source, self-hosted. No data leaves JPM infrastructure.",
        },
        {
          name: "AWS Bedrock — Amazon Titan Embed v2",
          selected: false,
          desc: "Native AWS integration. Runs within JPM's Bedrock deployment.",
        },
      ],
      params: [
        { label: "Model", value: "text-embedding-3-small" },
        { label: "Dimensions", value: "1536" },
        { label: "Batch Size", value: "256" },
      ],
    },
  },
  {
    num: 3,
    name: "Vector Store",
    config: {
      title: "Vector Database",
      options: [
        {
          name: "OpenSearch (JPM Managed)",
          selected: true,
          desc: "Managed OpenSearch cluster. Hybrid search (BM25 + kNN) built in. Approved infrastructure.",
        },
        {
          name: "PostgreSQL + pgvector",
          selected: false,
          desc: "Lightweight. Good for smaller KBs. Leverage existing Postgres infrastructure.",
        },
      ],
      params: [
        { label: "Index Type", value: "HNSW (Approximate kNN)" },
        { label: "ef_construction", value: "256" },
        { label: "m (connections)", value: "16" },
      ],
    },
  },
  {
    num: 4,
    name: "Retriever",
    config: {
      title: "Retrieval Strategy",
      options: [
        {
          name: "Hybrid (BM25 + Vector + Metadata)",
          selected: true,
          desc: "Combines lexical, semantic, and metadata search. Recommended for domain-specific content.",
        },
        {
          name: "Vector Only (kNN)",
          selected: false,
          desc: "Pure semantic similarity. Simpler but misses exact-match terms like 'Reg CC' or 'SOFR'.",
        },
        {
          name: "BM25 Only (Lexical)",
          selected: false,
          desc: "Keyword search. Fast and deterministic but no paraphrase handling.",
        },
      ],
      params: [
        { label: "Top-K", value: "10" },
        { label: "Reranker", value: "Cohere Rerank v3" },
        { label: "Rerank Top-N", value: "5" },
        { label: "Metadata Filters", value: "domain, period, authority ≥ 0.70" },
      ],
    },
  },
  {
    num: 5,
    name: "Review",
    config: {
      title: "Configuration Summary",
      options: [],
      params: [
        { label: "Splitting", value: "Semantic (by section), 1024 max, tables intact" },
        { label: "Embeddings", value: "OpenAI text-embedding-3-small (1536d)" },
        { label: "Vector Store", value: "OpenSearch HNSW (managed)" },
        { label: "Retriever", value: "Hybrid (BM25 + Vector + Metadata), Cohere rerank" },
        { label: "Documents", value: "5 active, 1 excluded (superseded)" },
        { label: "Estimated Chunks", value: "~890 chunks across 127 sections" },
      ],
    },
  },
];

export default function ConfigureRAGStep({ onDeploy }) {
  const { t } = useTheme();
  const [activeStage, setActiveStage] = useState(1);
  const stage = stages.find((s) => s.num === activeStage);

  return (
    <div>
      <p style={{ color: t.textDim, fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px 0" }}>
        Configure how documents are split, embedded, stored, and retrieved. Defaults are tuned for financial documents —
        power users can customize every knob.
      </p>

      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: "10px", overflow: "hidden" }}>
        {/* Header bar */}
        <div
          style={{
            background: t.panelBg,
            padding: "14px 20px",
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ color: t.textStrong, fontWeight: 700, fontSize: "14px" }}>RAG</span>
          <span style={{ color: t.textMuted, fontSize: "13px" }}>Advanced RAG Config</span>
          <span style={{ color: t.textGhost, fontSize: "13px" }}>·</span>
          <span style={{ color: t.textDim, fontSize: "13px", fontWeight: 500 }}>CCB Risk Exposures</span>
          <FeasibilityNote
            align="right"
            title="RAG Pipeline — Mirrors AWS Bedrock Knowledge Bases"
            verdict="Every stage here maps directly to a production AWS Bedrock or LangChain component"
            verdictType="success"
            bullets={[
              "AWS Bedrock Knowledge Bases: supports Titan Embed v2 and Cohere Embed as embedding providers — same models shown here",
              "Vector stores: Bedrock natively supports OpenSearch Serverless, Aurora pgvector, Pinecone, Mongo Atlas — all options in this config",
              "Chunking: Bedrock supports Fixed, Hierarchical, and Semantic chunking strategies — matching the options in stage 1",
              "Hybrid search (BM25 + kNN): OpenSearch 2.9+ natively supports hybrid search with the Neural Query plugin — production-proven at Amazon scale",
              "Cohere Rerank v3 is the reranker used by AWS Bedrock's managed RAG pipeline in production",
              "Incremental sync via S3 event notifications: Bedrock Knowledge Bases uses the same SNS/SQS trigger mechanism for real-time updates",
            ]}
          />
        </div>

        {/* Stage tabs */}
        <div
          style={{
            display: "flex",
            padding: "14px 20px",
            borderBottom: `1px solid ${t.borderSubtle}`,
            gap: "16px",
          }}
        >
          {stages.map((s) => (
            <button
              key={s.num}
              onClick={() => setActiveStage(s.num)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: s.num === activeStage ? "#2a6a3a" : s.num < activeStage ? "#1a4a2a" : t.border,
                  border: `2px solid ${s.num === activeStage ? "#3a9a5a" : s.num < activeStage ? "#3a9a5a" : t.textDisabled}`,
                  color: s.num <= activeStage ? t.textStrong : t.textMuted,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {s.num < activeStage ? "✓" : s.num}
              </div>
              <span
                style={{
                  color: s.num === activeStage ? t.textStrong : t.textFaint,
                  fontSize: "13px",
                  fontWeight: s.num === activeStage ? 600 : 400,
                }}
              >
                {s.name}
              </span>
            </button>
          ))}
        </div>

        {/* Config content */}
        <div style={{ padding: "20px" }}>
          <div style={{ color: t.text, fontSize: "15px", fontWeight: 600, marginBottom: "14px" }}>
            {stage.config.title}
          </div>

          {/* Options */}
          {stage.config.options.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
              {stage.config.options.map((opt) => (
                <div
                  key={opt.name}
                  style={{
                    background: opt.selected ? t.greenTint : t.panelBg,
                    border: `1px solid ${opt.selected ? "#2a5a3a" : t.border}`,
                    borderRadius: "6px",
                    padding: "12px 14px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "4px",
                        border: `2px solid ${opt.selected ? "#3a9a5a" : t.textDisabled}`,
                        background: opt.selected ? "#3a9a5a" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {opt.selected && (
                        <span style={{ color: t.textStrong, fontSize: "10px", fontWeight: 700 }}>✓</span>
                      )}
                    </div>
                    <span style={{ color: opt.selected ? t.text : t.textDim, fontSize: "13px", fontWeight: 600 }}>
                      {opt.name}
                    </span>
                  </div>
                  <div style={{ color: t.textFaint, fontSize: "12px", marginLeft: "24px", lineHeight: "1.4" }}>
                    {opt.desc}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Parameters */}
          <div
            style={{ background: t.deepBg, border: `1px solid ${t.borderSubtle}`, borderRadius: "6px", padding: "14px" }}
          >
            <div
              style={{
                color: t.textMuted,
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              {activeStage === 5 ? "FULL CONFIGURATION" : "PARAMETERS"}
            </div>
            {stage.config.params.map((p) => (
              <div
                key={p.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  borderBottom: `1px solid ${t.borderFaint}`,
                }}
              >
                <span style={{ color: t.textMuted, fontSize: "12px" }}>{p.label}</span>
                <span style={{ color: t.textDim, fontSize: "12px", fontFamily: "'IBM Plex Mono', monospace" }}>
                  {p.value}
                </span>
              </div>
            ))}
          </div>

          {/* Nav buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
            <button
              onClick={() => setActiveStage(Math.max(1, activeStage - 1))}
              style={{
                background: t.panelBg,
                border: `1px solid ${t.borderMid}`,
                borderRadius: "6px",
                padding: "10px 24px",
                color: t.textMuted,
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Back
            </button>
            <button
              onClick={() => {
                if (activeStage === 5) {
                  onDeploy?.();
                } else {
                  setActiveStage(activeStage + 1);
                }
              }}
              style={{
                background: activeStage === 5 ? "#2a6a3a" : t.border,
                border: `1px solid ${activeStage === 5 ? "#3a9a5a" : t.textDisabled}`,
                borderRadius: "6px",
                padding: "10px 24px",
                color: t.textStrong,
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {activeStage === 5 ? "Deploy Knowledge Base" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
