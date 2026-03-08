import { useState } from "react";
import { useAuth } from "./context/AuthContext";

// ─── Static dataset catalog ────────────────────────────────────────────────────
const CATALOG = [
  {
    type: "S3", badge: "S3", badgeColor: "#ba8a3a",
    name: "CCB Risk Exposures",
    tags: [{ label: "Store", color: "#555" }, { label: "CCB Risk", color: "#3a7aba" }],
    path: "s3://fusion-data/ccb-risk/ccb-risk-exposures/",
    desc: "Consolidated credit risk exposure data across all CCB portfolios including PD, LGD, and EAD metrics for regulatory and internal reporting.",
    records: "2.4M", updated: "2025-12-20", region: "Global", classification: "Store",
    access: true, topics: ["Risk", "Credit", "Exposure"],
  },
  {
    type: "KB", badge: "KB", badgeColor: "#3a7aba",
    name: "CIB Client Master",
    tags: [{ label: "Knowledgebase", color: "#3a7aba" }, { label: "CIB Client 360", color: "#555" }],
    path: "s3://fusion-data/cib-client-360/cib-client-master/",
    desc: "Golden source client reference data for CIB including legal entity hierarchy, KYC records, onboarding status, and relationship mappings.",
    records: "850K", updated: "2025-12-18", region: "Global", classification: "Knowledgebase",
    access: true, topics: ["Client", "KYC", "Reference"],
  },
  {
    type: "S3", badge: "S3", badgeColor: "#ba8a3a",
    name: "Consumer Loan Book",
    tags: [{ label: "Store", color: "#555" }, { label: "Consumer Lending", color: "#8a5a3a" }],
    path: "s3://fusion-data/consumer-lending/consumer-loan-book/",
    desc: "Golden source consumer lending portfolio data including mortgage, auto, student, and personal loan positions with payment history.",
    records: "12.8M", updated: "2025-12-22", region: "North America", classification: "Store",
    access: false, topics: ["Lending", "Consumer", "Portfolio"],
  },
  {
    type: "KB", badge: "KB", badgeColor: "#3a7aba",
    name: "Regulatory Reports Knowledge Base",
    tags: [{ label: "Knowledgebase", color: "#3a7aba" }, { label: "CCB Risk", color: "#3a7aba" }],
    path: "s3://fusion-data/ccb-risk/regulatory-reports-knowledge-base/",
    desc: "Comprehensive knowledge base of regulatory reporting requirements, filing templates, submission guidelines, and compliance guidelines documents.",
    records: "15K", updated: "2025-11-30", region: "Global", classification: "Knowledgebase",
    access: true, topics: ["Regulatory", "Compliance", "Templates"],
  },
  {
    type: "S3", badge: "S3", badgeColor: "#ba8a3a",
    name: "Treasury Positions",
    tags: [{ label: "Store", color: "#555" }, { label: "Treasury Services", color: "#5a8a6a" }],
    path: "s3://fusion-data/treasury-services/treasury-positions/",
    desc: "Real-time treasury position data including cash balances, intraday funding, and intercompany flows.",
    records: "340K", updated: "2025-12-21", region: "Global", classification: "Store",
    access: true, topics: ["Treasury", "Cash", "Positions"],
  },
  {
    type: "KB", badge: "KB", badgeColor: "#3a7aba",
    name: "AML Typologies Knowledge Base",
    tags: [{ label: "Knowledgebase", color: "#3a7aba" }, { label: "CIB Client 360", color: "#555" }],
    path: "s3://fusion-data/cib-client-360/aml-typologies-knowledge-base/",
    desc: "Curated knowledge base of anti-money laundering typologies, red flag indicators, case studies, and investigation guidelines documents.",
    records: "8.2K", updated: "2025-12-10", region: "Global", classification: "Knowledgebase",
    access: true, topics: ["AML", "Compliance", "Risk"],
  },
  {
    type: "S3", badge: "S3", badgeColor: "#ba8a3a",
    name: "Equities Reference Data",
    tags: [{ label: "Store", color: "#555" }, { label: "Equities Desk", color: "#3a9a5a" }],
    path: "s3://fusion-data/equities/reference-data/",
    desc: "Static and slowly changing reference data for equity instruments including ISINs, exchange listings, sector classifications, and corporate actions.",
    records: "1.2M", updated: "2025-12-19", region: "Global", classification: "Store",
    access: true, topics: ["Equities", "Reference", "Instruments"],
  },
  {
    type: "KB", badge: "KB", badgeColor: "#3a7aba",
    name: "Credit Policy Knowledge Base",
    tags: [{ label: "Knowledgebase", color: "#3a7aba" }, { label: "CCB Risk", color: "#3a7aba" }],
    path: "s3://fusion-data/ccb-risk/credit-policy-knowledge-base/",
    desc: "Internal credit policy documents, underwriting standards, and decision frameworks for consumer and commercial credit products.",
    records: "4.1K", updated: "2025-12-05", region: "Global", classification: "Knowledgebase",
    access: true, topics: ["Credit", "Policy", "Underwriting"],
  },
  {
    type: "S3", badge: "S3", badgeColor: "#ba8a3a",
    name: "Market Risk Scenarios",
    tags: [{ label: "Store", color: "#555" }, { label: "Risk Management", color: "#8a3a5a" }],
    path: "s3://fusion-data/risk/market-risk-scenarios/",
    desc: "Historical and hypothetical stress test scenarios for market risk including VaR models, ES calculations, and regulatory scenario sets.",
    records: "67K", updated: "2025-12-17", region: "Global", classification: "Store",
    access: false, topics: ["Market Risk", "Stress Test", "VaR"],
  },
  {
    type: "KB", badge: "KB", badgeColor: "#3a7aba",
    name: "Trade Surveillance KB",
    tags: [{ label: "Knowledgebase", color: "#3a7aba" }, { label: "Compliance", color: "#8a5aba" }],
    path: "s3://fusion-data/compliance/trade-surveillance-kb/",
    desc: "Knowledge base of trade surveillance patterns, alert typologies, regulatory guidance on market abuse, and investigation playbooks.",
    records: "3.8K", updated: "2025-11-28", region: "Global", classification: "Knowledgebase",
    access: true, topics: ["Surveillance", "Compliance", "Patterns"],
  },
];

// ─── Dataset card ──────────────────────────────────────────────────────────────
function DatasetCard({ item, onMakeKB, onQuery }) {
  const isKB = item.type === "KB";

  return (
    <div style={{
      background: "#0d0d0d", border: "1px solid #222", borderRadius: "10px",
      display: "flex", flexDirection: "column", overflow: "hidden",
      transition: "border-color 0.15s",
    }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#333"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "#222"}
    >
      {/* Card header */}
      <div style={{ padding: "14px 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
          <span style={{
            background: `${item.badgeColor}20`, border: `1px solid ${item.badgeColor}50`,
            color: item.badgeColor, padding: "2px 7px", borderRadius: "4px",
            fontSize: "10px", fontWeight: 700, flexShrink: 0, marginTop: "2px",
          }}>{item.badge}</span>
          <span style={{ color: "#fff", fontSize: "13px", fontWeight: 700, lineHeight: 1.3 }}>{item.name}</span>
        </div>

        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
          {item.tags.map((t) => (
            <span key={t.label} style={{
              background: `${t.color}18`, border: `1px solid ${t.color}40`,
              color: t.color, padding: "1px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 600,
            }}>{t.label}</span>
          ))}
        </div>

        <div style={{
          background: "#080808", border: "1px solid #1a1a1a", borderRadius: "4px",
          padding: "5px 8px", fontFamily: "'IBM Plex Mono', monospace",
          color: "#4a7a9a", fontSize: "10px", marginBottom: "8px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{item.path}</div>

        <p style={{ color: "#888", fontSize: "11px", lineHeight: "1.5", margin: 0,
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{item.desc}</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a" }}>
        {[["RECORDS", item.records], ["UPDATED", item.updated], ["REGION", item.region], ["CLASSIFICATION", item.classification]].map(([k, v]) => (
          <div key={k} style={{ padding: "8px 12px", borderRight: k === "RECORDS" || k === "REGION" ? "1px solid #1a1a1a" : "none" }}>
            <div style={{ color: "#444", fontSize: "9px", fontWeight: 700, marginBottom: "2px" }}>{k}</div>
            <div style={{ color: "#bbb", fontSize: "11px", fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Access + topic tags */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #1a1a1a", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{
          background: item.access ? "#0a2a0a" : "#2a0a0a",
          border: `1px solid ${item.access ? "#2a6a2a" : "#6a2a2a"}`,
          color: item.access ? "#3a9a5a" : "#ba4a4a",
          padding: "2px 7px", borderRadius: "3px", fontSize: "10px", fontWeight: 700,
        }}>{item.access ? "Access Granted" : "No Access"}</span>
        <span style={{ background: "#0a1a2a", border: "1px solid #1a3a5a", color: "#3a7aba", padding: "2px 7px", borderRadius: "3px", fontSize: "10px", fontWeight: 600 }}>
          RAG Pipeline
        </span>
        {item.topics.map((t) => (
          <span key={t} style={{ background: "#111", border: "1px solid #2a2a2a", color: "#666", padding: "2px 6px", borderRadius: "3px", fontSize: "10px" }}>{t}</span>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ padding: "10px 12px", display: "flex", gap: "6px", marginTop: "auto" }}>
        <button style={{ flex: 1, background: "#111", border: "1px solid #2a2a2a", borderRadius: "5px", padding: "7px 0", color: "#888", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}>
          Preview
        </button>
        {!item.access ? (
          <button style={{ flex: 1.5, background: "#111", border: "1px solid #3a2a2a", borderRadius: "5px", padding: "7px 0", color: "#ba6a6a", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}>
            Request Access
          </button>
        ) : isKB ? (
          <button onClick={onQuery}
            style={{ flex: 1.5, background: "#1a2a4a", border: "1px solid #3a6aba", borderRadius: "5px", padding: "7px 0", color: "#7aabea", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}>
            Open &amp; Query
          </button>
        ) : (
          <button onClick={onMakeKB}
            style={{ flex: 1.5, background: "#111827", border: "1px solid #3a4a6a", borderRadius: "5px", padding: "7px 0", color: "#fff", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}>
            Make Knowledgebase
          </button>
        )}
        {item.access && (
          <button style={{ flex: 1, background: "#111", border: "1px solid #2a2a2a", borderRadius: "5px", padding: "7px 0", color: "#666", cursor: "pointer", fontSize: "11px" }}>
            Advanced Config
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Inline query panel ────────────────────────────────────────────────────────
function QueryPanel({ item, onClose }) {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("xai");

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/v1/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.userid, authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ kb_name: item.name, question, provider }),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      setAnswer(await res.json());
    } catch (err) {
      setAnswer({ answer: `Error: ${err.message}`, model: "—" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: "12px", width: "640px", maxWidth: "90vw", padding: "28px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ background: "#3a7aba20", border: "1px solid #3a7aba50", color: "#3a7aba", padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>KB</span>
              <span style={{ color: "#fff", fontSize: "16px", fontWeight: 700 }}>{item.name}</span>
              <span style={{ background: "#0a2a0a", border: "1px solid #2a6a2a", color: "#3a9a5a", padding: "1px 6px", borderRadius: "3px", fontSize: "9px", fontWeight: 700 }}>LIVE</span>
            </div>
            <div style={{ color: "#555", fontSize: "12px" }}>Query this knowledge base with natural language</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "18px", padding: "2px 6px" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
          {[{ id: "xai", label: "Grok (xAI)" }, { id: "anthropic", label: "Claude" }].map((p) => (
            <button key={p.id} onClick={() => setProvider(p.id)}
              style={{ background: provider === p.id ? "#1a2a3a" : "#0d0d0d", border: `1px solid ${provider === p.id ? "#3a7aba" : "#2a2a2a"}`, borderRadius: "6px", padding: "6px 14px", color: provider === p.id ? "#7aabea" : "#555", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
              {p.label}
            </button>
          ))}
        </div>

        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question about this knowledge base..." rows={3}
          style={{ width: "100%", background: "#080808", border: "1px solid #333", borderRadius: "6px", padding: "10px 12px", color: "#ddd", fontSize: "13px", resize: "vertical", fontFamily: "'IBM Plex Sans', sans-serif", outline: "none", boxSizing: "border-box", marginBottom: "10px" }} />

        <button onClick={handleAsk} disabled={loading || !question.trim()}
          style={{ width: "100%", background: loading ? "#111" : "#1a2a3a", border: `1px solid ${loading ? "#333" : "#3a7aba"}`, borderRadius: "6px", padding: "10px", color: loading ? "#555" : "#fff", cursor: loading || !question.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px", marginBottom: "14px" }}>
          {loading ? "Querying…" : "Ask"}
        </button>

        {answer && (
          <div style={{ background: "#080808", border: "1px solid #1a3a5a", borderRadius: "8px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ color: "#3a7aba", fontSize: "11px", fontWeight: 700 }}>ANSWER</span>
              {answer.model && <span style={{ background: "#0a1a2a", border: "1px solid #1a3a5a", color: "#4a8aaa", padding: "1px 7px", borderRadius: "3px", fontSize: "10px" }}>{answer.model}</span>}
            </div>
            <div style={{ color: "#ccc", fontSize: "13px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{answer.answer}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main KBHub component ──────────────────────────────────────────────────────
export default function KBHub({ onCreateNew, onUploadDocs }) {
  const { user, setUser } = useAuth();
  const [queryTarget, setQueryTarget] = useState(null);
  const [search, setSearch] = useState("");

  if (!user) return null;

  const filtered = CATALOG.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.desc.toLowerCase().includes(search.toLowerCase()) ||
      d.topics.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif", overflow: "hidden" }}>

      {/* ── Left Sidebar ── */}
      <div style={{ width: "200px", flexShrink: 0, background: "#080808", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column" }}>
        {/* Logo */}
        <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ fontWeight: 800, fontSize: "15px", color: "#fff", letterSpacing: "-0.5px" }}>Knowledge</div>
          <div style={{ color: "#444", fontSize: "11px" }}>on Fusion</div>
        </div>

        {/* Single nav item */}
        <nav style={{ flex: 1, padding: "10px 0" }}>
          <div style={{
            width: "100%", textAlign: "left", background: "#1a2a3a",
            borderLeft: "2px solid #3a7aba",
            padding: "9px 18px", color: "#fff",
          }}>
            <div style={{ fontSize: "13px", fontWeight: 700 }}>Knowledge</div>
          </div>
        </nav>

        {/* Bottom: user + stats */}
        <div style={{ borderTop: "1px solid #1a1a1a", padding: "12px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: `${user.color}20`, border: `1px solid ${user.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: user.color, fontWeight: 700, flexShrink: 0 }}>
              {user.userid.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: user.color }}>{user.userid}</div>
              <div style={{ fontSize: "10px", color: "#444" }}>{user.label}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>4</div>
              <div style={{ fontSize: "10px", color: "#555" }}>Deployed</div>
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#3a9a5a" }}>2</div>
              <div style={{ fontSize: "10px", color: "#555" }}>Running</div>
            </div>
          </div>
          <button onClick={() => setUser(null)}
            style={{ width: "100%", background: "transparent", border: "1px solid #222", borderRadius: "4px", padding: "5px 0", color: "#555", cursor: "pointer", fontSize: "11px" }}>
            Switch user
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ padding: "18px 28px 14px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Knowledge</h1>
              <div style={{ color: "#555", fontSize: "13px", marginTop: "2px" }}>S3 datasets, source datasets &amp; data products</div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search datasets..."
                style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "8px 14px", color: "#ccc", fontSize: "13px", outline: "none", width: "220px", fontFamily: "'IBM Plex Sans', sans-serif" }}
              />
              <button onClick={onCreateNew}
                style={{ background: "#1a2a3a", border: "1px solid #3a7aba", borderRadius: "6px", padding: "8px 18px", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap" }}>
                + Create New KB
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
          {/* Upload strip — goes to Direct Upload in step 1 */}
          <div
            onClick={onUploadDocs}
            style={{ border: "1px dashed #2a2a2a", borderRadius: "8px", padding: "14px 20px", marginBottom: "20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", background: "#080808", transition: "border-color 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#3a7aba"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "#2a2a2a"}
          >
            <span style={{ width: "28px", height: "28px", background: "#1a2a3a", border: "1px solid #3a7aba", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3a7aba", fontSize: "16px", flexShrink: 0 }}>+</span>
            <div>
              <div style={{ color: "#ccc", fontSize: "13px", fontWeight: 600 }}>Upload documents to create S3 dataset</div>
              <div style={{ color: "#555", fontSize: "11px" }}>Drop files here or click to browse. Supports PDF, CSV, JSON, TXT, MD, DOCX, XLSX, Parquet</div>
            </div>
          </div>

          {/* Count */}
          <div style={{ color: "#555", fontSize: "12px", marginBottom: "14px" }}>
            Showing <strong style={{ color: "#aaa" }}>{filtered.length}</strong> of {CATALOG.length} datasets
          </div>

          {/* Card grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
            {filtered.map((item) => (
              <DatasetCard key={item.name} item={item} onMakeKB={onCreateNew} onQuery={() => setQueryTarget(item)} />
            ))}
          </div>
        </div>
      </div>

      {queryTarget && <QueryPanel item={queryTarget} onClose={() => setQueryTarget(null)} />}
    </div>
  );
}
