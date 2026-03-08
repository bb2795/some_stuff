import { useState } from "react";
import { useAuth } from "./context/AuthContext";

// ─── KB catalog — owner controls who can "Make Knowledgebase" ─────────────────
const CATALOG = [
  {
    id: "ccb-risk",
    badge: "S3", badgeColor: "#ba8a3a",
    name: "CCB Risk Exposures",
    owner: "user1",
    tags: [{ label: "Store", color: "#555" }, { label: "CCB Risk", color: "#3a7aba" }],
    path: "s3://fusion-data/ccb-risk/ccb-risk-exposures/",
    desc: "Consolidated credit risk exposure data across all CCB portfolios including PD, LGD, and EAD metrics for regulatory and internal reporting.",
    records: "2.4M", updated: "2025-12-20", region: "Global", classification: "Store",
    topics: ["Risk", "Credit", "Exposure"],
  },
  {
    id: "equities",
    badge: "S3", badgeColor: "#3a9a5a",
    name: "Equities Reference Data",
    owner: "user2",
    tags: [{ label: "Store", color: "#555" }, { label: "Equities Desk", color: "#3a9a5a" }],
    path: "s3://fusion-data/equities/reference-data/",
    desc: "Static and slowly changing reference data for equity instruments including ISINs, exchange listings, sector classifications, and corporate actions.",
    records: "1.2M", updated: "2025-12-19", region: "Global", classification: "Store",
    topics: ["Equities", "Reference", "Instruments"],
  },
];

// ─── KB tile ───────────────────────────────────────────────────────────────────
function KBTile({ item, canEdit, onMakeKB }) {
  return (
    <div style={{
      background: "#0d0d0d", border: `1px solid ${canEdit ? "#2a3a2a" : "#222"}`,
      borderRadius: "10px", display: "flex", flexDirection: "column", overflow: "hidden",
      transition: "border-color 0.15s", opacity: canEdit ? 1 : 0.6,
    }}
      onMouseEnter={(e) => canEdit && (e.currentTarget.style.borderColor = "#3a5a3a")}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = canEdit ? "#2a3a2a" : "#222"}
    >
      {/* Header */}
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

      {/* Access + topics */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #1a1a1a", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{
          background: canEdit ? "#0a2a0a" : "#1a1a1a",
          border: `1px solid ${canEdit ? "#2a6a2a" : "#2a2a2a"}`,
          color: canEdit ? "#3a9a5a" : "#555",
          padding: "2px 7px", borderRadius: "3px", fontSize: "10px", fontWeight: 700,
        }}>{canEdit ? "Access Granted" : "No Access"}</span>
        <span style={{ background: "#0a1a2a", border: "1px solid #1a3a5a", color: "#3a7aba", padding: "2px 7px", borderRadius: "3px", fontSize: "10px", fontWeight: 600 }}>
          RAG Pipeline
        </span>
        {item.topics.map((t) => (
          <span key={t} style={{ background: "#111", border: "1px solid #2a2a2a", color: "#666", padding: "2px 6px", borderRadius: "3px", fontSize: "10px" }}>{t}</span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: "10px 12px", display: "flex", gap: "6px", marginTop: "auto" }}>
        <button style={{ flex: 1, background: "#111", border: "1px solid #2a2a2a", borderRadius: "5px", padding: "7px 0", color: "#888", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}>
          Preview
        </button>
        {canEdit ? (
          <button onClick={onMakeKB}
            style={{ flex: 2, background: "#111827", border: "1px solid #3a4a6a", borderRadius: "5px", padding: "7px 0", color: "#fff", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}>
            Make Knowledgebase
          </button>
        ) : (
          <button disabled
            style={{ flex: 2, background: "#111", border: "1px solid #222", borderRadius: "5px", padding: "7px 0", color: "#444", cursor: "not-allowed", fontSize: "11px", fontWeight: 600 }}>
            No Access
          </button>
        )}
        <button style={{ flex: 1, background: "#111", border: "1px solid #2a2a2a", borderRadius: "5px", padding: "7px 0", color: "#666", cursor: "pointer", fontSize: "11px" }}>
          Advanced Config
        </button>
      </div>
    </div>
  );
}

// ─── "Untitled (New)" create tile ─────────────────────────────────────────────
function NewKBTile({ onCreate }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onCreate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#0a1020" : "#080808",
        border: `1px dashed ${hovered ? "#3a7aba" : "#2a2a2a"}`,
        borderRadius: "10px", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: "280px", cursor: "pointer", transition: "all 0.15s",
        gap: "14px", padding: "28px",
      }}
    >
      <div style={{
        width: "48px", height: "48px", borderRadius: "50%",
        background: hovered ? "#1a2a4a" : "#111",
        border: `1px solid ${hovered ? "#3a7aba" : "#2a2a2a"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "24px", color: hovered ? "#3a7aba" : "#444",
        transition: "all 0.15s",
      }}>+</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: hovered ? "#ccc" : "#555", fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>Untitled (New)</div>
        <div style={{ color: "#444", fontSize: "11px", lineHeight: "1.5" }}>Start the KB creation workflow —<br />connect a source, load docs, configure RAG</div>
      </div>
      <div style={{
        background: hovered ? "#1a2a3a" : "transparent",
        border: `1px solid ${hovered ? "#3a7aba" : "#2a2a2a"}`,
        borderRadius: "6px", padding: "7px 18px",
        color: hovered ? "#7aabea" : "#444", fontSize: "12px", fontWeight: 700,
        transition: "all 0.15s",
      }}>
        Create New KB →
      </div>
    </div>
  );
}

// ─── Main KBHub component ──────────────────────────────────────────────────────
export default function KBHub({ onCreateNew, onUploadDocs }) {
  const { user, setUser } = useAuth();
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
        <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ fontWeight: 800, fontSize: "15px", color: "#fff", letterSpacing: "-0.5px" }}>Knowledge</div>
          <div style={{ color: "#444", fontSize: "11px" }}>on Fusion</div>
        </div>

        <nav style={{ flex: 1, padding: "10px 0" }}>
          <div style={{ background: "#1a2a3a", borderLeft: "2px solid #3a7aba", padding: "9px 18px", color: "#fff" }}>
            <div style={{ fontSize: "13px", fontWeight: 700 }}>Knowledge</div>
          </div>
        </nav>

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
              <div style={{ color: "#555", fontSize: "13px", marginTop: "2px" }}>Your knowledge bases &amp; datasets</div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search datasets..."
                style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "8px 14px", color: "#ccc", fontSize: "13px", outline: "none", width: "200px", fontFamily: "'IBM Plex Sans', sans-serif" }}
              />
              <button onClick={onCreateNew}
                style={{ background: "#1a2a3a", border: "1px solid #3a7aba", borderRadius: "6px", padding: "8px 18px", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap" }}>
                + Create New KB
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {/* Upload strip */}
          <div
            onClick={onUploadDocs}
            style={{ border: "1px dashed #2a2a2a", borderRadius: "8px", padding: "14px 20px", marginBottom: "28px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", background: "#080808", transition: "border-color 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#3a7aba"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "#2a2a2a"}
          >
            <span style={{ width: "28px", height: "28px", background: "#1a2a3a", border: "1px solid #3a7aba", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3a7aba", fontSize: "16px", flexShrink: 0 }}>+</span>
            <div>
              <div style={{ color: "#ccc", fontSize: "13px", fontWeight: 600 }}>Upload documents to create S3 dataset</div>
              <div style={{ color: "#555", fontSize: "11px" }}>Drop files here or click to browse. Supports PDF, CSV, JSON, TXT, MD, DOCX, XLSX, Parquet</div>
            </div>
          </div>

          {/* Entitlement notice */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <div style={{ color: "#555", fontSize: "12px" }}>
              Showing datasets for <span style={{ color: user.color, fontWeight: 700 }}>{user.userid}</span>
              <span style={{ color: "#444" }}> · You can create knowledge bases only from datasets you own</span>
            </div>
          </div>

          {/* 3-column grid: 2 catalog tiles + 1 "new" tile */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {filtered.map((item) => (
              <KBTile
                key={item.id}
                item={item}
                canEdit={item.owner === user.userid}
                onMakeKB={onCreateNew}
              />
            ))}
            <NewKBTile onCreate={onCreateNew} />
          </div>
        </div>
      </div>
    </div>
  );
}
