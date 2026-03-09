import { useState } from "react";
import { useAuth } from "./context/AuthContext";

// ─── Theme tokens ──────────────────────────────────────────────────────────────
const DARK = {
  pageBg: "#0a0a0a", sidebarBg: "#080808", cardBg: "#0d0d0d",
  topbarBg: "#080808",
  border: "#222", borderSubtle: "#1a1a1a", borderHover: "#333",
  text: "#e0e0e0", textStrong: "#ffffff", textMuted: "#555", textDim: "#888",
  inputBg: "#111", inputBorder: "#2a2a2a",
  statsBg: "#111", statsText: "#bbb",
  tagBg: "18", chipBg: "#111", chipBorder: "#2a2a2a", chipText: "#666",
  activeNav: "#1a2a3a", activeNavBorder: "#3a7aba",
  btnPrimary: "#1a2a3a", btnPrimaryBorder: "#3a7aba", btnPrimaryText: "#fff",
  btnSecondary: "#111", btnSecondaryBorder: "#2a2a2a", btnSecondaryText: "#888",
  btnDisabledBg: "#111", btnDisabledBorder: "#222", btnDisabledText: "#444",
  accessGrantedBg: "#0a2a0a", accessGrantedBorder: "#2a6a2a", accessGrantedText: "#3a9a5a",
  noAccessBg: "#1a1a1a", noAccessBorder: "#2a2a2a", noAccessText: "#555",
  ragBg: "#0a1a2a", ragBorder: "#1a3a5a", ragText: "#3a7aba",
  pathBg: "#080808", pathBorder: "#1a1a1a", pathText: "#4a7a9a",
  uploadBg: "#080808", uploadBorder: "#2a2a2a", uploadBorderHover: "#3a7aba",
  uploadIcon: "#1a2a3a", uploadIconBorder: "#3a7aba", uploadIconColor: "#3a7aba",
  uploadTitle: "#ccc", uploadSub: "#555",
  noticeBg: "transparent",
  modalBg: "#0d0d0d", modalBorder: "#2a2a2a", modalOverlay: "rgba(0,0,0,0.7)",
  answerBg: "#080808", answerBorder: "#1a3a5a",
  newTileBg: "#080808", newTileBgHover: "#0a1020",
  newTileBorder: "#2a2a2a", newTileBorderHover: "#3a7aba",
  newTileIcon: "#111", newTileIconHover: "#1a2a4a",
  newTileIconBorder: "#2a2a2a", newTileIconBorderHover: "#3a7aba",
  newTileIconColor: "#444", newTileIconColorHover: "#3a7aba",
  newTileTitle: "#555", newTileTitleHover: "#ccc",
  newTileSubText: "#444",
  newTileBtn: "transparent", newTileBtnHover: "#1a2a3a",
  newTileBtnBorder: "#2a2a2a", newTileBtnBorderHover: "#3a7aba",
  newTileBtnText: "#444", newTileBtnTextHover: "#7aabea",
  toggleBg: "#111", toggleBorder: "#2a2a2a", toggleText: "#888",
  switchBorder: "#222",
};

const LIGHT = {
  pageBg: "#d8dadd", sidebarBg: "#e2e2e2", cardBg: "#e2e2e2",
  topbarBg: "#e2e2e2",
  border: "#c4c4c4", borderSubtle: "#d0d0d0", borderHover: "#999",
  text: "#333333", textStrong: "#111111", textMuted: "#777", textDim: "#555",
  inputBg: "#d4d4d4", inputBorder: "#b8b8b8",
  statsBg: "#dadada", statsText: "#444",
  tagBg: "18", chipBg: "#d4d4d4", chipBorder: "#bbb", chipText: "#555",
  activeNav: "#c8d4f0", activeNavBorder: "#3a7aba",
  btnPrimary: "#1a2a3a", btnPrimaryBorder: "#3a7aba", btnPrimaryText: "#fff",
  btnSecondary: "#d4d4d4", btnSecondaryBorder: "#b8b8b8", btnSecondaryText: "#444",
  btnDisabledBg: "#d0d0d0", btnDisabledBorder: "#bbb", btnDisabledText: "#888",
  accessGrantedBg: "#c8e8c8", accessGrantedBorder: "#80b880", accessGrantedText: "#1a5a1a",
  noAccessBg: "#d4d4d4", noAccessBorder: "#bbb", noAccessText: "#888",
  ragBg: "#c8d4f0", ragBorder: "#80a0cc", ragText: "#2a5a9a",
  pathBg: "#d4d4d4", pathBorder: "#c0c0c0", pathText: "#3a6a8a",
  uploadBg: "#dadada", uploadBorder: "#b8b8b8", uploadBorderHover: "#3a7aba",
  uploadIcon: "#c8d4f0", uploadIconBorder: "#80a0cc", uploadIconColor: "#3a7aba",
  uploadTitle: "#222", uploadSub: "#666",
  noticeBg: "transparent",
  modalBg: "#e2e2e2", modalBorder: "#b8b8b8", modalOverlay: "rgba(0,0,0,0.4)",
  answerBg: "#d4d8f0", answerBorder: "#a0b0d8",
  newTileBg: "#dadada", newTileBgHover: "#ccd4f0",
  newTileBorder: "#b8b8b8", newTileBorderHover: "#3a7aba",
  newTileIcon: "#d0d0d0", newTileIconHover: "#c8d4f0",
  newTileIconBorder: "#b8b8b8", newTileIconBorderHover: "#80a0cc",
  newTileIconColor: "#888", newTileIconColorHover: "#3a7aba",
  newTileTitle: "#888", newTileTitleHover: "#222",
  newTileSubText: "#888",
  newTileBtn: "transparent", newTileBtnHover: "#c8d4f0",
  newTileBtnBorder: "#b8b8b8", newTileBtnBorderHover: "#80a0cc",
  newTileBtnText: "#888", newTileBtnTextHover: "#3a7aba",
  toggleBg: "#d0d0d0", toggleBorder: "#b8b8b8", toggleText: "#555",
  switchBorder: "#c4c4c4",
};

// ─── KB catalog — owner controls who can query / make KB ──────────────────────
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

// ─── Q&A dialog ───────────────────────────────────────────────────────────────
function QueryDialog({ item, t, onClose }) {
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
    <div style={{ position: "fixed", inset: 0, background: t.modalOverlay, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: t.modalBg, border: `1px solid ${t.modalBorder}`, borderRadius: "12px", width: "640px", maxWidth: "90vw", padding: "28px" }}
        onClick={(e) => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ background: `${item.badgeColor}20`, border: `1px solid ${item.badgeColor}50`, color: item.badgeColor, padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>{item.badge}</span>
              <span style={{ color: t.textStrong, fontSize: "16px", fontWeight: 700 }}>{item.name}</span>
              <span style={{ background: t.accessGrantedBg, border: `1px solid ${t.accessGrantedBorder}`, color: t.accessGrantedText, padding: "1px 6px", borderRadius: "3px", fontSize: "9px", fontWeight: 700 }}>LIVE</span>
            </div>
            <div style={{ color: t.textMuted, fontSize: "12px" }}>Query this knowledge base with natural language</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", fontSize: "18px", padding: "2px 6px" }}>✕</button>
        </div>

        {/* Provider toggle */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
          {[{ id: "xai", label: "Grok (xAI)" }, { id: "anthropic", label: "Claude" }].map((p) => (
            <button key={p.id} onClick={() => setProvider(p.id)}
              style={{ background: provider === p.id ? t.btnPrimary : t.inputBg, border: `1px solid ${provider === p.id ? t.btnPrimaryBorder : t.inputBorder}`, borderRadius: "6px", padding: "6px 14px", color: provider === p.id ? "#7aabea" : t.textMuted, cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
              {p.label}
            </button>
          ))}
        </div>

        <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this knowledge base..."
          rows={3}
          style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "6px", padding: "10px 12px", color: t.text, fontSize: "13px", resize: "vertical", fontFamily: "'IBM Plex Sans', sans-serif", outline: "none", boxSizing: "border-box", marginBottom: "10px" }} />

        <button onClick={handleAsk} disabled={loading || !question.trim()}
          style={{ width: "100%", background: loading ? t.inputBg : t.btnPrimary, border: `1px solid ${loading ? t.inputBorder : t.btnPrimaryBorder}`, borderRadius: "6px", padding: "10px", color: loading ? t.textMuted : "#fff", cursor: loading || !question.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px", marginBottom: "14px" }}>
          {loading ? "Querying…" : "Ask"}
        </button>

        {answer && (
          <div style={{ background: t.answerBg, border: `1px solid ${t.answerBorder}`, borderRadius: "8px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ color: "#3a7aba", fontSize: "11px", fontWeight: 700 }}>ANSWER</span>
              {answer.model && <span style={{ background: t.ragBg, border: `1px solid ${t.ragBorder}`, color: t.ragText, padding: "1px 7px", borderRadius: "3px", fontSize: "10px" }}>{answer.model}</span>}
            </div>
            <div style={{ color: t.text, fontSize: "13px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{answer.answer}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KB tile ───────────────────────────────────────────────────────────────────
function KBTile({ item, canEdit, t, onQuery }) {
  return (
    <div style={{
      background: t.cardBg, border: `1px solid ${canEdit ? t.border : t.borderSubtle}`,
      borderRadius: "10px", display: "flex", flexDirection: "column", overflow: "hidden",
      transition: "border-color 0.15s", opacity: canEdit ? 1 : 0.55,
    }}
      onMouseEnter={(e) => canEdit && (e.currentTarget.style.borderColor = t.borderHover)}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = canEdit ? t.border : t.borderSubtle}
    >
      <div style={{ padding: "14px 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
          <span style={{ background: `${item.badgeColor}20`, border: `1px solid ${item.badgeColor}50`, color: item.badgeColor, padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, flexShrink: 0, marginTop: "2px" }}>{item.badge}</span>
          <span style={{ color: t.textStrong, fontSize: "13px", fontWeight: 700, lineHeight: 1.3 }}>{item.name}</span>
        </div>

        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
          {item.tags.map((tag) => (
            <span key={tag.label} style={{ background: `${tag.color}18`, border: `1px solid ${tag.color}40`, color: tag.color, padding: "1px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 600 }}>{tag.label}</span>
          ))}
        </div>

        <div style={{ background: t.pathBg, border: `1px solid ${t.pathBorder}`, borderRadius: "4px", padding: "5px 8px", fontFamily: "'IBM Plex Mono', monospace", color: t.pathText, fontSize: "10px", marginBottom: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.path}</div>

        <p style={{ color: t.textDim, fontSize: "11px", lineHeight: "1.5", margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.desc}</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${t.borderSubtle}`, borderBottom: `1px solid ${t.borderSubtle}` }}>
        {[["RECORDS", item.records], ["UPDATED", item.updated], ["REGION", item.region], ["CLASSIFICATION", item.classification]].map(([k, v]) => (
          <div key={k} style={{ padding: "8px 12px", background: t.statsBg, borderRight: k === "RECORDS" || k === "REGION" ? `1px solid ${t.borderSubtle}` : "none" }}>
            <div style={{ color: t.textMuted, fontSize: "9px", fontWeight: 700, marginBottom: "2px" }}>{k}</div>
            <div style={{ color: t.statsText, fontSize: "11px", fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Access + topics */}
      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${t.borderSubtle}`, display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ background: canEdit ? t.accessGrantedBg : t.noAccessBg, border: `1px solid ${canEdit ? t.accessGrantedBorder : t.noAccessBorder}`, color: canEdit ? t.accessGrantedText : t.noAccessText, padding: "2px 7px", borderRadius: "3px", fontSize: "10px", fontWeight: 700 }}>
          {canEdit ? "Access Granted" : "No Access"}
        </span>
        <span style={{ background: t.ragBg, border: `1px solid ${t.ragBorder}`, color: t.ragText, padding: "2px 7px", borderRadius: "3px", fontSize: "10px", fontWeight: 600 }}>RAG Pipeline</span>
        {item.topics.map((topic) => (
          <span key={topic} style={{ background: t.chipBg, border: `1px solid ${t.chipBorder}`, color: t.chipText, padding: "2px 6px", borderRadius: "3px", fontSize: "10px" }}>{topic}</span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: "10px 12px", display: "flex", gap: "6px", marginTop: "auto" }}>
        <button style={{ flex: 1, background: t.btnSecondary, border: `1px solid ${t.btnSecondaryBorder}`, borderRadius: "5px", padding: "7px 0", color: t.btnSecondaryText, cursor: "pointer", fontSize: "11px", fontWeight: 600 }}>Preview</button>
        {canEdit ? (
          <button onClick={onQuery}
            style={{ flex: 2, background: t.btnPrimary, border: `1px solid ${t.btnPrimaryBorder}`, borderRadius: "5px", padding: "7px 0", color: t.btnPrimaryText, cursor: "pointer", fontSize: "11px", fontWeight: 700 }}>
            Query Docs
          </button>
        ) : (
          <button disabled
            style={{ flex: 2, background: t.btnDisabledBg, border: `1px solid ${t.btnDisabledBorder}`, borderRadius: "5px", padding: "7px 0", color: t.btnDisabledText, cursor: "not-allowed", fontSize: "11px" }}>
            No Access
          </button>
        )}
        <button style={{ flex: 1, background: t.btnSecondary, border: `1px solid ${t.btnSecondaryBorder}`, borderRadius: "5px", padding: "7px 0", color: t.textMuted, cursor: "pointer", fontSize: "11px" }}>Config</button>
      </div>
    </div>
  );
}

// ─── "Untitled (New)" create tile ─────────────────────────────────────────────
function NewKBTile({ t, onCreate }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onCreate} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? t.newTileBgHover : t.newTileBg, border: `1px dashed ${hovered ? t.newTileBorderHover : t.newTileBorder}`, borderRadius: "10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "280px", cursor: "pointer", transition: "all 0.15s", gap: "14px", padding: "28px" }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: hovered ? t.newTileIconHover : t.newTileIcon, border: `1px solid ${hovered ? t.newTileIconBorderHover : t.newTileIconBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", color: hovered ? t.newTileIconColorHover : t.newTileIconColor, transition: "all 0.15s" }}>+</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: hovered ? t.newTileTitleHover : t.newTileTitle, fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>Untitled (New)</div>
        <div style={{ color: t.newTileSubText, fontSize: "11px", lineHeight: "1.5" }}>Start the KB creation workflow —<br />connect a source, load docs, configure RAG</div>
      </div>
      <div style={{ background: hovered ? t.newTileBtnHover : t.newTileBtn, border: `1px solid ${hovered ? t.newTileBtnBorderHover : t.newTileBtnBorder}`, borderRadius: "6px", padding: "7px 18px", color: hovered ? t.newTileBtnTextHover : t.newTileBtnText, fontSize: "12px", fontWeight: 700, transition: "all 0.15s" }}>
        Create New KB →
      </div>
    </div>
  );
}

// ─── Main KBHub ───────────────────────────────────────────────────────────────
export default function KBHub({ onCreateNew, onUploadDocs }) {
  const { user, setUser } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [queryTarget, setQueryTarget] = useState(null);
  const [search, setSearch] = useState("");

  if (!user) return null;

  const t = isDark ? DARK : LIGHT;

  const filtered = CATALOG.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.desc.toLowerCase().includes(search.toLowerCase()) ||
      d.topics.some((topic) => topic.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: t.pageBg, color: t.text, fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif", overflow: "hidden" }}>

      {/* ── Left Sidebar ── */}
      <div style={{ width: "200px", flexShrink: 0, background: t.sidebarBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontWeight: 800, fontSize: "15px", color: t.textStrong, letterSpacing: "-0.5px" }}>Knowledge</div>
          <div style={{ color: t.textMuted, fontSize: "11px" }}>on Fusion</div>
        </div>

        <nav style={{ flex: 1, padding: "10px 0" }}>
          <div style={{ background: t.activeNav, borderLeft: `2px solid ${t.activeNavBorder}`, padding: "9px 18px", color: t.textStrong }}>
            <div style={{ fontSize: "13px", fontWeight: 700 }}>Knowledge</div>
          </div>
        </nav>

        <div style={{ borderTop: `1px solid ${t.switchBorder}`, padding: "12px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: `${user.color}20`, border: `1px solid ${user.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: user.color, fontWeight: 700, flexShrink: 0 }}>
              {user.userid.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: user.color }}>{user.userid}</div>
              <div style={{ fontSize: "10px", color: t.textMuted }}>{user.label}</div>
            </div>
          </div>

          {/* Theme toggle */}
          <button onClick={() => setIsDark((v) => !v)}
            style={{ width: "100%", background: t.toggleBg, border: `1px solid ${t.toggleBorder}`, borderRadius: "4px", padding: "5px 0", color: t.toggleText, cursor: "pointer", fontSize: "11px", marginBottom: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            {isDark ? "☀ Light mode" : "🌙 Dark mode"}
          </button>

          <button onClick={() => setUser(null)}
            style={{ width: "100%", background: "transparent", border: `1px solid ${t.switchBorder}`, borderRadius: "4px", padding: "5px 0", color: t.textMuted, cursor: "pointer", fontSize: "11px" }}>
            Switch user
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ padding: "18px 28px 14px", borderBottom: `1px solid ${t.border}`, background: t.topbarBg, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: t.textStrong, letterSpacing: "-0.5px" }}>Knowledge</h1>
              <div style={{ color: t.textMuted, fontSize: "13px", marginTop: "2px" }}>Your knowledge bases &amp; datasets</div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search datasets..."
                style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "6px", padding: "8px 14px", color: t.text, fontSize: "13px", outline: "none", width: "200px", fontFamily: "'IBM Plex Sans', sans-serif" }} />
              <button onClick={onCreateNew}
                style={{ background: t.btnPrimary, border: `1px solid ${t.btnPrimaryBorder}`, borderRadius: "6px", padding: "8px 18px", color: t.btnPrimaryText, cursor: "pointer", fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap" }}>
                + Create New KB
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {/* Upload strip */}
          <div onClick={onUploadDocs}
            style={{ border: `1px dashed ${t.uploadBorder}`, borderRadius: "8px", padding: "14px 20px", marginBottom: "28px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", background: t.uploadBg, transition: "border-color 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = t.uploadBorderHover}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = t.uploadBorder}>
            <span style={{ width: "28px", height: "28px", background: t.uploadIcon, border: `1px solid ${t.uploadIconBorder}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: t.uploadIconColor, fontSize: "16px", flexShrink: 0 }}>+</span>
            <div>
              <div style={{ color: t.uploadTitle, fontSize: "13px", fontWeight: 600 }}>Upload documents to create S3 dataset</div>
              <div style={{ color: t.uploadSub, fontSize: "11px" }}>Drop files here or click to browse. Supports PDF, CSV, JSON, TXT, MD, DOCX, XLSX, Parquet</div>
            </div>
          </div>

          {/* Entitlement notice */}
          <div style={{ color: t.textMuted, fontSize: "12px", marginBottom: "16px" }}>
            Showing datasets for <span style={{ color: user.color, fontWeight: 700 }}>{user.userid}</span>
            <span style={{ color: t.textMuted }}> · You can query datasets you own · others show No Access</span>
          </div>

          {/* 3-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {filtered.map((item) => (
              <KBTile key={item.id} item={item} canEdit={item.owner === user.userid} t={t}
                onQuery={() => setQueryTarget(item)} />
            ))}
            <NewKBTile t={t} onCreate={onCreateNew} />
          </div>
        </div>
      </div>

      {queryTarget && <QueryDialog item={queryTarget} t={t} onClose={() => setQueryTarget(null)} />}
    </div>
  );
}
