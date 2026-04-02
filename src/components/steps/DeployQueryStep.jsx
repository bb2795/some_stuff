import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { listFiles, queryFile } from "../../services/ragApi";
import { useTheme } from "../../context/ThemeContext";
import FeasibilityNote from "../FeasibilityNote";

// ─── Deployment progress animation ───
function DeployingScreen({ onDone }) {
  const { t } = useTheme();
  const [phase, setPhase] = useState(0);
  const steps = [
    "Provisioning vector index (OpenSearch HNSW)…",
    "Embedding chunks via text-embedding-3-small…",
    "Indexing structured rows…",
    "Configuring hybrid retrieval (BM25 + kNN + Cohere rerank)…",
    "Running smoke-test query…",
    "Knowledge base live ✓",
  ];
  useEffect(() => {
    if (phase >= steps.length - 1) { setTimeout(onDone, 800); return; }
    const t = setTimeout(() => setPhase((p) => p + 1), 600);
    return () => clearTimeout(t);
  }, [phase]);
  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: phase < steps.length - 1 ? "#ba8a3a" : "#3a9a5a", boxShadow: `0 0 10px ${phase < steps.length - 1 ? "#ba8a3a60" : "#3a9a5a60"}` }} />
        <span style={{ color: t.text, fontWeight: 700, fontSize: "16px" }}>
          {phase < steps.length - 1 ? "Deploying…" : "Deployment complete"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "10px", opacity: i > phase ? 0.25 : 1, transition: "opacity 0.3s" }}>
            {i < phase && <span style={{ color: "#3a9a5a", flexShrink: 0 }}>✓</span>}
            {i === phase && phase < steps.length - 1 && <span style={{ color: "#ba8a3a", flexShrink: 0, display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>}
            {i === phase && phase === steps.length - 1 && <span style={{ color: "#3a9a5a", flexShrink: 0 }}>✓</span>}
            {i > phase && <span style={{ color: t.textDisabled, flexShrink: 0 }}>○</span>}
            <span style={{ color: i < phase ? "#5a8a5a" : i === phase ? t.text : t.textDisabled, fontSize: "13px" }}>{s}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── KB card in hub listing ───
function KBCard({ onClick }) {
  const { t } = useTheme();
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ color: t.textGhost, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", marginBottom: "10px", letterSpacing: "0.5px" }}>
        Knowledge Hub — My Knowledge Bases
      </div>
      <div onClick={onClick}
        style={{ background: t.greenTint, border: `2px solid ${t.green}50`, borderRadius: "10px", padding: "18px 20px", cursor: "pointer", transition: "all 0.15s", marginBottom: "8px", position: "relative" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.green; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${t.green}50`; }}>
        <div style={{ position: "absolute", top: "14px", right: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3a9a5a", boxShadow: "0 0 8px #3a9a5a80" }} />
          <span style={{ color: "#3a9a5a", fontSize: "11px", fontWeight: 700 }}>LIVE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <div style={{ background: t.greenTint, border: `1px solid ${t.green}50`, borderRadius: "6px", padding: "6px 10px", fontSize: "18px" }}>🗂</div>
          <div>
            <div style={{ color: t.textStrong, fontWeight: 700, fontSize: "16px" }}>My Knowledge Base</div>
            <div style={{ color: t.textDim, fontSize: "12px" }}>Hybrid retrieval · Cohere rerank · Real Q&A via Grok / Claude</div>
          </div>
        </div>
        <div style={{ color: t.blue, fontSize: "12px", fontWeight: 600 }}>Click to open → Query your documents with real LLM answers</div>
      </div>
      {[
        { name: "Equities Research — Global Macro", id: "eq-macro", status: "healthy" },
        { name: "Trade Operations Playbooks", id: "trade-ops", status: "syncing" },
      ].map((kb) => (
        <div key={kb.id} style={{ background: t.cardBg, border: `1px solid ${t.borderSubtle}`, borderRadius: "8px", padding: "12px 18px", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.45 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "16px" }}>🗂</span>
            <div>
              <div style={{ color: t.textDim, fontWeight: 600, fontSize: "13px" }}>{kb.name}</div>
              <div style={{ color: t.textGhost, fontSize: "11px" }}>{kb.id}</div>
            </div>
          </div>
          <span style={{ color: kb.status === "syncing" ? "#ba8a3a" : "#3a9a5a", fontWeight: 700, fontSize: "10px" }}>
            {kb.status === "syncing" ? "⟳ SYNCING" : "● HEALTHY"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Real Q&A console (calls RAG2 /v1/qa) ───
function QueryConsole({ user, onClose }) {
  const { t } = useTheme();
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState(null);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [question, setQuestion] = useState("What is this document about?");
  const [provider, setProvider] = useState("xai");
  const [qaState, setQaState] = useState("idle"); // idle | loading | done | error
  const [answer, setAnswer] = useState(null);
  const [qaError, setQaError] = useState(null);
  const [activeTab, setActiveTab] = useState("query");

  // Fetch only the current user's files (entitlement enforced in listFiles)
  useEffect(() => {
    if (!user) return;
    listFiles(user)
      .then((f) => {
        setFiles(f);
        setFilesLoading(false);
        if (f.length > 0) setSelectedFileId(String(f[0].file_id ?? f[0].id));
      })
      .catch((err) => { setFilesError(err.message); setFilesLoading(false); });
  }, [user]);

  const handleQuery = async () => {
    if (!selectedFileId || !question.trim()) return;
    setQaState("loading");
    setAnswer(null);
    setQaError(null);
    try {
      const res = await queryFile(user, Number(selectedFileId), question.trim(), provider);
      setAnswer(res);
      setQaState("done");
    } catch (err) {
      setQaError(err.message);
      setQaState("error");
    }
  };

  return (
    <div style={{ background: t.cardBg, border: `2px solid ${t.blue}50`, borderRadius: "10px", overflow: "hidden", marginBottom: "20px" }}>
      {/* Header */}
      <div style={{ background: t.panelBg, padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3a9a5a", boxShadow: "0 0 6px #3a9a5a60" }} />
          <span style={{ color: t.textStrong, fontWeight: 700, fontSize: "14px" }}>My Knowledge Base</span>
          <span style={{ color: t.textGhost, fontSize: "12px" }}>Live · {user?.userid}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {["query", "files"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ background: activeTab === tab ? t.blueTint : "transparent", border: `1px solid ${activeTab === tab ? t.blue : "transparent"}`, borderRadius: "4px", padding: "4px 12px", color: activeTab === tab ? t.blue : t.textMuted, fontSize: "12px", fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
              {tab}
            </button>
          ))}
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: "4px", padding: "4px 10px", color: t.textMuted, fontSize: "11px", cursor: "pointer", marginLeft: "6px" }}>
            ✕ Close
          </button>
        </div>
      </div>

      {/* ── Query tab ── */}
      {activeTab === "query" && (
        <div style={{ padding: "16px" }}>

          {/* Entitlement banner */}
          <div style={{ background: t.blueTint, border: `1px solid ${t.blue}40`, borderRadius: "6px", padding: "8px 12px", marginBottom: "14px", display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ color: t.blue }}>🔒</span>
            <span style={{ color: t.textDim, fontSize: "11px" }}>
              Showing only <strong style={{ color: t.blue }}>{user?.userid}</strong>'s documents · Cross-user access blocked
            </span>
          </div>

          {/* File selector */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ color: t.textMuted, fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "6px" }}>DOCUMENT</label>
            {filesLoading && <div style={{ color: t.textGhost, fontSize: "12px" }}>Loading your files…</div>}
            {filesError && (
              <div style={{ background: t.redTint, border: `1px solid ${t.red}40`, borderRadius: "6px", padding: "8px 12px" }}>
                <div style={{ color: t.red, fontSize: "12px" }}>Could not load files: {filesError}</div>
                <div style={{ color: t.textGhost, fontSize: "11px", marginTop: "4px" }}>Is the RAG service running on :8081? Run <span style={{ fontFamily: "monospace" }}>python deploy.py</span>.</div>
              </div>
            )}
            {!filesLoading && !filesError && files.length === 0 && (
              <div style={{ background: t.panelBg, border: `1px solid ${t.borderMid}`, borderRadius: "6px", padding: "10px 14px", color: t.textGhost, fontSize: "12px" }}>
                No documents found for <strong style={{ color: t.textFaint }}>{user?.userid}</strong>. Upload files in Step 1 (Direct Upload).
              </div>
            )}
            {!filesLoading && files.length > 0 && (
              <select value={selectedFileId} onChange={(e) => setSelectedFileId(e.target.value)}
                style={{ width: "100%", background: t.panelBg, border: `1px solid ${t.borderMid}`, borderRadius: "6px", padding: "9px 12px", color: t.text, fontSize: "13px", outline: "none", cursor: "pointer" }}>
                {files.map((f) => {
                  const id = f.file_id ?? f.id;
                  const name = f.original_name ?? f.filename ?? `File ${id}`;
                  return <option key={id} value={String(id)}>{name} (id: {id})</option>;
                })}
              </select>
            )}
          </div>

          {/* Question */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ color: t.textMuted, fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "6px" }}>QUESTION</label>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2}
              style={{ width: "100%", background: t.panelBg, border: `1px solid ${t.borderMid}`, borderRadius: "6px", padding: "10px 14px", color: t.text, fontSize: "14px", outline: "none", resize: "vertical", fontFamily: "'IBM Plex Sans', sans-serif", boxSizing: "border-box" }} />
          </div>

          {/* Provider + submit */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
              {[{ id: "xai", label: "Grok (xAI)" }, { id: "anthropic", label: "Claude" }].map((p) => (
                <button key={p.id} onClick={() => setProvider(p.id)}
                  style={{ background: provider === p.id ? t.blueTint : t.panelBg, border: `1px solid ${provider === p.id ? t.blue : t.borderMid}`, borderRadius: "4px", padding: "6px 14px", color: provider === p.id ? t.blue : t.textMuted, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={handleQuery}
              disabled={qaState === "loading" || !selectedFileId || !question.trim()}
              style={{ flex: 1, background: qaState === "loading" ? t.panelBg : t.green, border: `1px solid ${qaState === "loading" ? t.borderMid : t.green}`, borderRadius: "6px", padding: "9px 20px", color: qaState === "loading" ? t.textMuted : "#ffffff", cursor: qaState === "loading" ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "13px" }}>
              {qaState === "loading" ? "Querying…" : "Ask"}
            </button>
          </div>

          {/* Loading */}
          {qaState === "loading" && (
            <div style={{ padding: "20px", textAlign: "center", color: t.textGhost, fontSize: "13px" }}>
              Sending to <strong style={{ color: provider === "xai" ? "#ba8a3a" : "#5a6aba" }}>{provider === "xai" ? "Grok (xAI)" : "Claude"}</strong> via RAG2 API<span style={{ color: "#3a7aba" }}>…</span>
            </div>
          )}

          {/* Error */}
          {qaState === "error" && (
            <div style={{ background: t.redTint, border: `1px solid ${t.red}40`, borderRadius: "8px", padding: "14px" }}>
              <div style={{ color: t.red, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Query failed</div>
              <div style={{ color: t.textDim, fontSize: "12px" }}>{qaError}</div>
            </div>
          )}

          {/* Real answer */}
          {qaState === "done" && answer && (
            <div style={{ background: t.blueTint, border: `1px solid ${t.blue}50`, borderRadius: "8px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ color: t.blue, fontSize: "11px", fontWeight: 700 }}>ANSWER</div>
                <span style={{ background: t.panelBg, border: `1px solid ${t.blue}40`, color: t.textMuted, fontSize: "10px", fontFamily: "'IBM Plex Mono', monospace", padding: "2px 8px", borderRadius: "3px" }}>
                  {answer.model}
                </span>
              </div>
              <div style={{ color: t.text, fontSize: "14px", lineHeight: "1.75", whiteSpace: "pre-wrap" }}>
                {answer.answer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Files tab ── */}
      {activeTab === "files" && (
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ color: t.textGhost, fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
              {user?.userid}'s Documents
            </div>
            <div style={{ background: t.blueTint, border: `1px solid ${t.blue}40`, borderRadius: "4px", padding: "3px 10px", color: t.textMuted, fontSize: "10px" }}>
              🔒 Other users' files are hidden
            </div>
          </div>
          {filesLoading && <div style={{ color: t.textGhost, fontSize: "12px", padding: "12px 0" }}>Loading…</div>}
          {!filesLoading && files.length === 0 && <div style={{ color: t.textGhost, fontSize: "12px" }}>No files found. Upload via Step 1 → Direct Upload.</div>}
          {!filesLoading && files.map((f) => {
            const id = f.file_id ?? f.id;
            const name = f.original_name ?? f.filename ?? `File ${id}`;
            const size = f.size ?? f.file_size ?? 0;
            return (
              <div key={id} style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px", padding: "8px 10px", borderBottom: `1px solid ${t.borderFaint}`, alignItems: "center" }}>
                <span style={{ color: t.text, fontSize: "12px", fontFamily: "'IBM Plex Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                <span style={{ color: t.textMuted, fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace" }}>id: {id}</span>
                <span style={{ color: t.textGhost, fontSize: "11px", textAlign: "right" }}>{size ? `${(size / 1024).toFixed(0)} KB` : "—"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const accessMethods = [
  { method: "REST API", code: "POST /v1/qa", desc: "Real Q&A via RAG2 pipeline (:8081)" },
  { method: "Agent Tool", code: 'tools: [{ type: "knowledge", kb_id: "..." }]', desc: "Agents query KBs as tools" },
  { method: "Fusion Console", code: "Hub → Knowledge → Query", desc: "Interactive query and exploration" },
];

// ─── Main export ───
export default function DeployQueryStep() {
  const { t } = useTheme();
  const { user } = useAuth();
  const [phase, setPhase] = useState("deploying");

  return (
    <div>
      <p style={{ color: t.textDim, fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <span>
          {phase === "deploying"
            ? "Fusion is building your knowledge base."
            : "Your knowledge base is live. Click it to query your documents — answers powered by Grok or Claude via the RAG2 API."}
        </span>
        <FeasibilityNote
          align="right"
          title="Production-Proven — Infrastructure Is Solved"
          verdict="Every component used here runs in production at AWS, JPMorgan, and Fortune 500 firms today"
          verdictType="success"
          bullets={[
            "OpenSearch HNSW vector index: production default for AWS Bedrock Knowledge Bases — scales to billions of vectors",
            "text-embedding-3-small: OpenAI's production embedding model, used by thousands of RAG deployments daily",
            "Hybrid retrieval (BM25 + kNN + Cohere Rerank): exact stack used by AWS Bedrock's managed RAG pipeline in production",
            "RAG2 API (this demo): live backend running on localhost:8081 — upload, embed, and query working end-to-end right now",
            "The entire infrastructure stack (S3 → IAM → OpenSearch → LLM) is solved. Fusion adds the JPMorgan entitlement layer: Fusion ID → dataspace → LOB-scoped access control on top of proven cloud primitives",
            "Remaining work is product, not plumbing — UI polish, admin tooling, and integration with Fusion's existing auth stack",
          ]}
        />
      </p>

      {phase === "deploying" && <DeployingScreen onDone={() => setPhase("hub")} />}

      {phase !== "deploying" && (
        <>
          <KBCard onClick={() => setPhase("querying")} />
          {phase === "querying" && <QueryConsole user={user} onClose={() => setPhase("hub")} />}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {accessMethods.map((m) => (
              <div key={m.method} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: "6px", padding: "12px" }}>
                <div style={{ color: t.blue, fontWeight: 700, fontSize: "12px", marginBottom: "4px" }}>{m.method}</div>
                <div style={{ color: t.textDim, fontSize: "10px", fontFamily: "'IBM Plex Mono', monospace", marginBottom: "6px", background: t.deepBg, padding: "4px 6px", borderRadius: "3px" }}>{m.code}</div>
                <div style={{ color: t.textFaint, fontSize: "11px" }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
