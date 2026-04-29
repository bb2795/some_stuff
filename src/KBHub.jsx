import { useState, useEffect, useRef } from "react";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import { listFiles, queryFile, uploadFile, deleteFile } from "./services/ragApi";

// ─── Theme tokens ──────────────────────────────────────────────────────────────
const DARK = {
  pageBg: "#0a0a0a", panelBg: "#0d0d0d", panelHeaderBg: "#080808",
  topbarBg: "#080808",
  border: "#222", borderSubtle: "#1a1a1a", borderHover: "#333",
  text: "#e0e0e0", textStrong: "#ffffff", textMuted: "#555", textDim: "#888",
  inputBg: "#111", inputBorder: "#2a2a2a",
  statsBg: "#111", statsText: "#bbb",
  chipBg: "#111", chipBorder: "#2a2a2a", chipText: "#666",
  activeNav: "#1a2a3a", activeNavBorder: "#3a7aba",
  btnPrimary: "#1a2a3a", btnPrimaryBorder: "#3a7aba", btnPrimaryText: "#fff",
  btnAccentLabel: "#7aabea",
  btnSecondary: "#111", btnSecondaryBorder: "#2a2a2a", btnSecondaryText: "#888",
  btnDisabledBg: "#111", btnDisabledBorder: "#222", btnDisabledText: "#444",
  accessGrantedBg: "#0a2a0a", accessGrantedBorder: "#2a6a2a", accessGrantedText: "#3a9a5a",
  noAccessBg: "#1a1a1a", noAccessBorder: "#2a2a2a", noAccessText: "#555",
  ragBg: "#0a1a2a", ragBorder: "#1a3a5a", ragText: "#3a7aba",
  pathBg: "#080808", pathBorder: "#1a1a1a", pathText: "#4a7a9a",
  uploadIcon: "#1a2a3a", uploadIconBorder: "#3a7aba", uploadIconColor: "#3a7aba",
  modalBg: "#0d0d0d", modalBorder: "#2a2a2a", modalOverlay: "rgba(0,0,0,0.7)",
  answerBg: "#080808", answerBorder: "#1a3a5a",
  tileBg: "#111", tileBorder: "#2a2a2a", tileHoverBg: "#1a2a3a", tileHoverBorder: "#3a7aba",
  selectedItemBg: "#1a2a3a", selectedItemBorder: "#3a7aba",
  itemHoverBg: "#0f1a25",
  toggleBg: "#111", toggleBorder: "#2a2a2a", toggleText: "#888",
  switchBorder: "#222",
};

const LIGHT = {
  pageBg: "#d8dadd", panelBg: "#e0e2e5", panelHeaderBg: "#d8dadd",
  topbarBg: "#e2e2e2",
  border: "#c4c4c4", borderSubtle: "#d0d0d0", borderHover: "#999",
  text: "#333333", textStrong: "#111111", textMuted: "#777", textDim: "#555",
  inputBg: "#d4d4d4", inputBorder: "#b8b8b8",
  statsBg: "#dadada", statsText: "#444",
  chipBg: "#d4d4d4", chipBorder: "#bbb", chipText: "#555",
  activeNav: "#c8d4f0", activeNavBorder: "#3a7aba",
  btnPrimary: "#1a2a3a", btnPrimaryBorder: "#3a7aba", btnPrimaryText: "#fff",
  btnAccentLabel: "#ffffff",
  btnSecondary: "#d4d4d4", btnSecondaryBorder: "#b8b8b8", btnSecondaryText: "#444",
  btnDisabledBg: "#d0d0d0", btnDisabledBorder: "#bbb", btnDisabledText: "#888",
  accessGrantedBg: "#c8e8c8", accessGrantedBorder: "#80b880", accessGrantedText: "#1a5a1a",
  noAccessBg: "#d4d4d4", noAccessBorder: "#bbb", noAccessText: "#888",
  ragBg: "#c8d4f0", ragBorder: "#80a0cc", ragText: "#2a5a9a",
  pathBg: "#d4d4d4", pathBorder: "#c0c0c0", pathText: "#3a6a8a",
  uploadIcon: "#c8d4f0", uploadIconBorder: "#80a0cc", uploadIconColor: "#3a7aba",
  modalBg: "#e2e2e2", modalBorder: "#b8b8b8", modalOverlay: "rgba(0,0,0,0.4)",
  answerBg: "#d4d8f0", answerBorder: "#a0b0d8",
  tileBg: "#dadada", tileBorder: "#b8b8b8", tileHoverBg: "#c8d4f0", tileHoverBorder: "#3a7aba",
  selectedItemBg: "#c8d4f0", selectedItemBorder: "#3a7aba",
  itemHoverBg: "#d4dce8",
  toggleBg: "#d0d0d0", toggleBorder: "#b8b8b8", toggleText: "#555",
  switchBorder: "#c4c4c4",
};

// ─── KB catalog ────────────────────────────────────────────────────────────────
const CATALOG = [
  {
    id: "ccb-risk",
    badge: "S3", badgeColor: "#ba8a3a",
    name: "CCB Risk Exposures",
    owner: "user1",
    tags: [{ label: "Store", color: "#555" }, { label: "CCB Risk", color: "#3a7aba" }],
    path: "s3://kb-data/ccb-risk/ccb-risk-exposures/",
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
    path: "s3://kb-data/equities/reference-data/",
    desc: "Static and slowly changing reference data for equity instruments including ISINs, exchange listings, sector classifications, and corporate actions.",
    records: "1.2M", updated: "2025-12-19", region: "Global", classification: "Store",
    topics: ["Equities", "Reference", "Instruments"],
  },
];

// ─── Add Source Modal ──────────────────────────────────────────────────────────
function AddSourceModal({ t, onClose, onSelectPrimary, onUpload }) {
  const PRIMARY = [
    { id: "s3", label: "S3 Bucket", icon: "🪣", desc: "Connect an AWS S3 bucket as a knowledge source" },
    { id: "sharepoint", label: "SharePoint", icon: "📋", desc: "Import documents from Microsoft SharePoint" },
    { id: "upload", label: "Data Product Direct Upload", icon: "⬆", desc: "Upload files directly to create a dataset" },
  ];
  const SECONDARY = ["Websites", "Google Drive", "Copied text"];
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: t.modalOverlay, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: t.modalBg, border: `1px solid ${t.modalBorder}`, borderRadius: "14px", width: "520px", maxWidth: "90vw", padding: "28px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "22px" }}>
          <div>
            <div style={{ color: t.textStrong, fontSize: "18px", fontWeight: 800, marginBottom: "4px" }}>Add Data Sources</div>
            <div style={{ color: t.textMuted, fontSize: "13px" }}>Select a source for your Knowledge Base creation flow</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", fontSize: "18px", padding: "2px 6px", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Primary options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "22px" }}>
          {PRIMARY.map((src) => (
            <div
              key={src.id}
              onMouseEnter={() => setHoveredId(src.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => src.id === "upload" ? onUpload() : onSelectPrimary(src.id)}
              style={{
                background: hoveredId === src.id ? t.tileHoverBg : t.tileBg,
                border: `1px solid ${hoveredId === src.id ? t.tileHoverBorder : t.tileBorder}`,
                borderRadius: "9px", padding: "14px 16px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "14px", transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "22px", flexShrink: 0 }}>{src.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: t.textStrong, fontSize: "14px", fontWeight: 700 }}>{src.label}</div>
                <div style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>{src.desc}</div>
              </div>
              <span style={{ color: t.textMuted, fontSize: "18px" }}>›</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <div style={{ flex: 1, height: "1px", background: t.border }} />
          <span style={{ color: t.textMuted, fontSize: "11px" }}>or add from</span>
          <div style={{ flex: 1, height: "1px", background: t.border }} />
        </div>

        {/* Secondary options */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {SECONDARY.map((label) => (
            <button
              key={label} disabled
              style={{ background: t.btnSecondary, border: `1px solid ${t.btnSecondaryBorder}`, borderRadius: "6px", padding: "7px 14px", color: t.textMuted, cursor: "not-allowed", fontSize: "12px", opacity: 0.55 }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ color: t.textMuted, fontSize: "10px", marginTop: "8px" }}>Coming soon</div>
      </div>
    </div>
  );
}

// ─── Q&A dialog (preserved) ────────────────────────────────────────────────────
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
    <div
      style={{ position: "fixed", inset: 0, background: t.modalOverlay, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: t.modalBg, border: `1px solid ${t.modalBorder}`, borderRadius: "12px", width: "640px", maxWidth: "90vw", padding: "28px" }}
        onClick={(e) => e.stopPropagation()}
      >
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

        <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
          {[{ id: "xai", label: "Grok (xAI)" }, { id: "anthropic", label: "Claude" }].map((p) => (
            <button key={p.id} onClick={() => setProvider(p.id)}
              style={{ background: provider === p.id ? t.btnPrimary : t.inputBg, border: `1px solid ${provider === p.id ? t.btnPrimaryBorder : t.inputBorder}`, borderRadius: "6px", padding: "6px 14px", color: provider === p.id ? t.btnAccentLabel : t.textMuted, cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
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
              <span style={{ color: t.ragText, fontSize: "11px", fontWeight: 700 }}>ANSWER</span>
              {answer.model && <span style={{ background: t.ragBg, border: `1px solid ${t.ragBorder}`, color: t.ragText, padding: "1px 7px", borderRadius: "3px", fontSize: "10px" }}>{answer.model}</span>}
            </div>
            <div style={{ color: t.text, fontSize: "13px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{answer.answer}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KB list item (left panel) ─────────────────────────────────────────────────
function KBListItem({ item, canEdit, t, isSelected, onSelect, onQuery }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "9px 10px", borderRadius: "7px", cursor: "pointer", marginBottom: "2px",
        background: isSelected ? t.selectedItemBg : hovered ? t.itemHoverBg : "transparent",
        border: `1px solid ${isSelected ? t.selectedItemBorder : "transparent"}`,
        transition: "all 0.12s", opacity: canEdit ? 1 : 0.5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "3px" }}>
        <span style={{ background: `${item.badgeColor}20`, border: `1px solid ${item.badgeColor}50`, color: item.badgeColor, padding: "1px 5px", borderRadius: "3px", fontSize: "9px", fontWeight: 700, flexShrink: 0 }}>{item.badge}</span>
        <span style={{ color: t.textStrong, fontSize: "12px", fontWeight: 700, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onQuery(); }}
            style={{ background: t.btnPrimary, border: `1px solid ${t.btnPrimaryBorder}`, borderRadius: "4px", padding: "2px 8px", color: t.btnAccentLabel, cursor: "pointer", fontSize: "10px", fontWeight: 600, flexShrink: 0 }}
          >
            Query
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: "5px", alignItems: "center", color: t.textMuted, fontSize: "10px" }}>
        {canEdit
          ? <span style={{ color: t.accessGrantedText }}>Access Granted</span>
          : <span style={{ color: t.noAccessText }}>No Access</span>
        }
        <span>·</span>
        {item.topics.slice(0, 2).map((topic) => <span key={topic}>{topic}</span>)}
      </div>
    </div>
  );
}

// ─── Inline chat panel (center panel) ─────────────────────────────────────────
function InlineChatPanel({ item, t, user, canEdit }) {
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

  if (!canEdit) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
        <div style={{ fontSize: "32px" }}>🔒</div>
        <div style={{ color: t.textDim, fontSize: "14px", fontWeight: 600 }}>No access to this knowledge base</div>
        <div style={{ color: t.textMuted, fontSize: "12px" }}>This KB is owned by another user</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Source info */}
      <div style={{ background: t.ragBg, border: `1px solid ${t.ragBorder}`, borderRadius: "8px", padding: "12px 14px" }}>
        <div style={{ color: t.ragText, fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", marginBottom: "5px" }}>CONNECTED SOURCE</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: t.pathText, fontSize: "11px", marginBottom: "4px" }}>{item.path}</div>
        <div style={{ color: t.textMuted, fontSize: "11px" }}>{item.records} records · {item.region} · updated {item.updated}</div>
      </div>

      {/* Provider toggle */}
      <div style={{ display: "flex", gap: "6px" }}>
        {[{ id: "xai", label: "Grok (xAI)" }, { id: "anthropic", label: "Claude" }].map((p) => (
          <button key={p.id} onClick={() => setProvider(p.id)}
            style={{ background: provider === p.id ? t.btnPrimary : t.inputBg, border: `1px solid ${provider === p.id ? t.btnPrimaryBorder : t.inputBorder}`, borderRadius: "6px", padding: "6px 14px", color: provider === p.id ? t.btnAccentLabel : t.textMuted, cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Question input */}
      <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
        placeholder={`Ask a question about ${item.name}...`}
        rows={3}
        style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "7px", padding: "10px 12px", color: t.text, fontSize: "13px", resize: "vertical", fontFamily: "'IBM Plex Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />

      <button onClick={handleAsk} disabled={loading || !question.trim()}
        style={{ background: loading ? t.inputBg : t.btnPrimary, border: `1px solid ${loading ? t.inputBorder : t.btnPrimaryBorder}`, borderRadius: "7px", padding: "10px", color: loading ? t.textMuted : "#fff", cursor: loading || !question.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px" }}>
        {loading ? "Querying…" : "Ask"}
      </button>

      {answer && (
        <div style={{ background: t.answerBg, border: `1px solid ${t.answerBorder}`, borderRadius: "8px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ color: t.ragText, fontSize: "11px", fontWeight: 700 }}>ANSWER</span>
            {answer.model && <span style={{ background: t.ragBg, border: `1px solid ${t.ragBorder}`, color: t.ragText, padding: "1px 7px", borderRadius: "3px", fontSize: "10px" }}>{answer.model}</span>}
          </div>
          <div style={{ color: t.text, fontSize: "13px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{answer.answer}</div>
        </div>
      )}
    </div>
  );
}

// ─── Uploaded doc list item (left panel) ──────────────────────────────────────
function DocListItem({ file, t, isSelected, onSelect, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const name = file.original_name ?? file.filename ?? `File ${file.file_id ?? file.id}`;
  const size = file.size ?? file.file_size ?? 0;
  const ext = name.includes(".") ? name.split(".").pop().toUpperCase() : "FILE";

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
    } catch (err) {
      setDeleting(false);
      setDeleteError(err.message ?? "Delete failed");
      setTimeout(() => setDeleteError(null), 3000);
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ marginBottom: "2px" }}
    >
      <div
        onClick={() => !deleting && onSelect()}
        style={{
          padding: "7px 10px", borderRadius: "6px", cursor: deleting ? "default" : "pointer",
          background: isSelected ? t.selectedItemBg : hovered ? t.itemHoverBg : "transparent",
          border: `1px solid ${isSelected ? t.selectedItemBorder : "transparent"}`,
          transition: "all 0.12s",
          display: "flex", alignItems: "center", gap: "8px",
          opacity: deleting ? 0.5 : 1,
        }}
      >
        <span style={{ background: t.ragBg, border: `1px solid ${t.ragBorder}`, color: t.ragText, padding: "1px 4px", borderRadius: "3px", fontSize: "8px", fontWeight: 700, flexShrink: 0 }}>{ext}</span>
        <span style={{ color: t.textStrong, fontSize: "11px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
        {!hovered && size > 0 && <span style={{ color: t.textMuted, fontSize: "10px", flexShrink: 0 }}>{(size / 1024).toFixed(0)}KB</span>}
        {hovered && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete document"
            style={{
              flexShrink: 0, background: "#cc444420", border: "1px solid #cc444460",
              borderRadius: "3px", padding: "1px 7px",
              color: "#cc4444", cursor: "pointer", fontSize: "11px", fontWeight: 700,
              lineHeight: 1.4,
            }}
          >
            {deleting ? "…" : "✕"}
          </button>
        )}
      </div>
      {deleteError && (
        <div style={{ color: "#cc4444", fontSize: "10px", padding: "2px 10px 4px", lineHeight: 1.4 }}>
          {deleteError}
        </div>
      )}
    </div>
  );
}

// ─── Doc Q&A panel (center panel — file-level) ────────────────────────────────
function DocChatPanel({ file, t, user }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("xai");

  const name = file.original_name ?? file.filename ?? `File ${file.file_id ?? file.id}`;
  const fileId = file.file_id ?? file.id;
  const size = file.size ?? file.file_size ?? 0;

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await queryFile(user, Number(fileId), question.trim(), provider);
      setAnswer(res);
    } catch (err) {
      setAnswer({ answer: `Error: ${err.message}`, model: "—" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* File info */}
      <div style={{ background: t.ragBg, border: `1px solid ${t.ragBorder}`, borderRadius: "8px", padding: "12px 14px" }}>
        <div style={{ color: t.ragText, fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", marginBottom: "5px" }}>UPLOADED DOCUMENT</div>
        <div style={{ color: t.textStrong, fontSize: "13px", fontWeight: 600, marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ color: t.textMuted, fontSize: "11px" }}>
          id: {fileId}{size > 0 ? ` · ${(size / 1024).toFixed(0)} KB` : ""}
        </div>
      </div>

      {/* Provider toggle */}
      <div style={{ display: "flex", gap: "6px" }}>
        {[{ id: "xai", label: "Grok (xAI)" }, { id: "anthropic", label: "Claude" }].map((p) => (
          <button key={p.id} onClick={() => setProvider(p.id)}
            style={{ background: provider === p.id ? t.btnPrimary : t.inputBg, border: `1px solid ${provider === p.id ? t.btnPrimaryBorder : t.inputBorder}`, borderRadius: "6px", padding: "6px 14px", color: provider === p.id ? t.btnAccentLabel : t.textMuted, cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Question input */}
      <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
        placeholder={`Ask a question about ${name}…`}
        rows={3}
        style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "7px", padding: "10px 12px", color: t.text, fontSize: "13px", resize: "vertical", fontFamily: "'IBM Plex Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />

      <button onClick={handleAsk} disabled={loading || !question.trim()}
        style={{ background: loading ? t.inputBg : t.btnPrimary, border: `1px solid ${loading ? t.inputBorder : t.btnPrimaryBorder}`, borderRadius: "7px", padding: "10px", color: loading ? t.textMuted : "#fff", cursor: loading || !question.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px" }}>
        {loading ? "Querying…" : "Ask"}
      </button>

      {answer && (
        <div style={{ background: t.answerBg, border: `1px solid ${t.answerBorder}`, borderRadius: "8px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ color: t.ragText, fontSize: "11px", fontWeight: 700 }}>ANSWER</span>
            {answer.model && <span style={{ background: t.ragBg, border: `1px solid ${t.ragBorder}`, color: t.ragText, padding: "1px 7px", borderRadius: "3px", fontSize: "10px" }}>{answer.model}</span>}
          </div>
          <div style={{ color: t.text, fontSize: "13px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{answer.answer}</div>
        </div>
      )}
    </div>
  );
}

// ─── Center panel drop-zone / empty state ─────────────────────────────────────
function CenterEmpty({ t, user, onFileUploaded, onConfigureRAG }) {
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastUploaded, setLastUploaded] = useState(null);
  const [error, setError] = useState(null);

  const handleFiles = (fileList) => {
    const file = fileList[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    setProgress(0);
    setLastUploaded(null);
    uploadFile(user, file, (pct) => setProgress(pct))
      .then((result) => {
        setUploading(false);
        setLastUploaded(result);
        onFileUploaded(result);
      })
      .catch((err) => {
        setUploading(false);
        setError(err.message);
      });
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: "16px" }}>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          width: "100%", maxWidth: "420px",
          border: `2px dashed ${dragging ? t.btnPrimaryBorder : t.borderMid}`,
          borderRadius: "14px",
          padding: "40px 24px",
          textAlign: "center",
          cursor: uploading ? "default" : "pointer",
          background: dragging ? t.activeNav : t.panelBg,
          transition: "all 0.15s",
        }}
      >
        <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)} />

        <div style={{ fontSize: "32px", marginBottom: "10px" }}>📂</div>
        <div style={{ color: t.textDim, fontSize: "14px", fontWeight: 700, marginBottom: "5px" }}>
          Drop files here or click to upload
        </div>
        <div style={{ color: t.textMuted, fontSize: "12px" }}>
          PDF, DOCX, TXT, CSV, Parquet
        </div>

        {uploading && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ height: "4px", background: t.borderSubtle, borderRadius: "2px", overflow: "hidden", marginBottom: "6px" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: t.btnPrimaryBorder, borderRadius: "2px", transition: "width 0.2s" }} />
            </div>
            <div style={{ color: t.textMuted, fontSize: "11px" }}>Uploading… {progress}%</div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: "12px", color: t.red ?? "#cc4444", fontSize: "11px" }}>
            ✗ {error}
          </div>
        )}
      </div>

      {/* Post-upload prompt */}
      {lastUploaded && (
        <div style={{ width: "100%", maxWidth: "420px", background: t.activeNav, border: `1px solid ${t.activeNavBorder}`, borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <div style={{ color: t.textStrong, fontSize: "13px", fontWeight: 700, marginBottom: "2px" }}>
              ✓ Uploaded — document is in My Documents
            </div>
            <div style={{ color: t.textMuted, fontSize: "11px" }}>
              {lastUploaded.original_name ?? lastUploaded.filename ?? "File"} · id: {lastUploaded.file_id ?? lastUploaded.id}
            </div>
          </div>
          <button
            onClick={onConfigureRAG}
            style={{ flexShrink: 0, background: t.btnPrimary, border: `1px solid ${t.btnPrimaryBorder}`, borderRadius: "7px", padding: "8px 16px", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "12px", whiteSpace: "nowrap" }}
          >
            Configure RAG →
          </button>
        </div>
      )}

      <div style={{ color: t.textMuted, fontSize: "12px" }}>or select a knowledge base from Sources</div>
    </div>
  );
}

// ─── Studio tile ───────────────────────────────────────────────────────────────
function StudioTile({ label, icon, t }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? t.tileHoverBg : t.tileBg,
        border: `1px solid ${hovered ? t.tileHoverBorder : t.tileBorder}`,
        borderRadius: "9px", padding: "18px 12px", minHeight: "80px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px",
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: "22px" }}>{icon}</span>
      <span style={{ color: hovered ? t.textStrong : t.textDim, fontSize: "11px", fontWeight: 600, textAlign: "center" }}>{label}</span>
    </div>
  );
}

// ─── RAG Config Modal ─────────────────────────────────────────────────────────
const RAG_OPTIONS = {
  chunking: [
    { id: "semantic", label: "Semantic (by section headers)", desc: "Splits at document section boundaries. Preserves tables and lists intact." },
    { id: "fixed", label: "Fixed Token Window (512 / 1024)", desc: "Simple fixed-size chunks with overlap. Good general fallback." },
    { id: "recursive", label: "Recursive Character", desc: "Splits on paragraph → sentence → character. Best for unstructured text." },
  ],
  embeddings: [
    { id: "openai", label: "OpenAI text-embedding-3-small (1536d)", desc: "High quality, fast, cost-effective. Default." },
    { id: "cohere", label: "Cohere embed-english-v3.0", desc: "Strong multilingual support." },
    { id: "titan", label: "AWS Bedrock — Amazon Titan Embed v2", desc: "Native AWS. Runs within JPM's Bedrock deployment." },
    { id: "hf", label: "HuggingFace BAAI/bge-large-en-v1.5", desc: "Open source, self-hosted — no data leaves JPM infra." },
  ],
  vectorStore: [
    { id: "opensearch", label: "OpenSearch (JPM Managed)", desc: "Hybrid search (BM25 + kNN) built in. Approved infra." },
    { id: "pgvector", label: "PostgreSQL + pgvector", desc: "Lightweight. Good for smaller KBs." },
  ],
  retriever: [
    { id: "hybrid", label: "Hybrid (BM25 + Vector + Metadata)", desc: "Recommended for domain-specific financial content." },
    { id: "vector", label: "Vector Only (kNN)", desc: "Pure semantic similarity." },
    { id: "bm25", label: "BM25 Only (Lexical)", desc: "Keyword search — fast, deterministic." },
  ],
};

function RAGConfigModal({ t, isDark, onClose }) {
  const [cfg, setCfg] = useState({ chunking: "semantic", embeddings: "openai", vectorStore: "opensearch", retriever: "hybrid" });
  const [saved, setSaved] = useState(false);

  const Section = ({ label, field, options }) => (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", marginBottom: "8px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {options.map((opt) => (
          <div key={opt.id} onClick={() => { setCfg((c) => ({ ...c, [field]: opt.id })); setSaved(false); }}
            style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", borderRadius: "7px", cursor: "pointer", background: cfg[field] === opt.id ? t.activeNav : t.inputBg, border: `1px solid ${cfg[field] === opt.id ? t.activeNavBorder : t.inputBorder}`, transition: "all 0.12s" }}
          >
            <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: `2px solid ${cfg[field] === opt.id ? t.btnPrimaryBorder : t.textDisabled}`, background: cfg[field] === opt.id ? t.btnPrimaryBorder : "transparent", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <div style={{ color: cfg[field] === opt.id ? t.textStrong : t.textDim, fontSize: "13px", fontWeight: 600 }}>{opt.label}</div>
              <div style={{ color: t.textMuted, fontSize: "11px", marginTop: "2px", lineHeight: "1.4" }}>{opt.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: isDark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "560px", maxHeight: "85vh", background: t.modalBg, border: `1px solid ${t.modalBorder}`, borderRadius: "14px", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.8)" : "0 12px 48px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ color: t.textStrong, fontSize: "16px", fontWeight: 700 }}>Configure Knowledge Base</div>
            <div style={{ color: t.textMuted, fontSize: "12px", marginTop: "2px" }}>RAG pipeline settings — applied to all documents in this KB</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "4px" }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px" }}>
          <Section label="Chunking Strategy" field="chunking" options={RAG_OPTIONS.chunking} />
          <Section label="Embedding Provider" field="embeddings" options={RAG_OPTIONS.embeddings} />
          <Section label="Vector Store" field="vectorStore" options={RAG_OPTIONS.vectorStore} />
          <Section label="Retrieval Strategy" field="retriever" options={RAG_OPTIONS.retriever} />

          {/* Params summary */}
          <div style={{ background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "14px 16px" }}>
            <div style={{ color: t.textMuted, fontSize: "11px", fontWeight: 700, marginBottom: "10px", textTransform: "uppercase" }}>Active Config Summary</div>
            {[
              { label: "Chunk Size", value: "1024 tokens · 128 overlap" },
              { label: "Embedding Dim", value: cfg.embeddings === "openai" ? "1536d" : cfg.embeddings === "titan" ? "1024d" : "768d" },
              { label: "Index Type", value: cfg.vectorStore === "opensearch" ? "HNSW (Approximate kNN)" : "pgvector IVFFlat" },
              { label: "Top-K", value: "10 · reranked to 5 via Cohere Rerank v3" },
            ].map((p) => (
              <div key={p.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
                <span style={{ color: t.textMuted, fontSize: "12px" }}>{p.label}</span>
                <span style={{ color: t.textDim, fontSize: "12px", fontFamily: "'IBM Plex Mono', monospace" }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${t.border}`, display: "flex", gap: "10px", justifyContent: "flex-end", flexShrink: 0, background: t.panelHeaderBg }}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: "7px", padding: "9px 20px", color: t.textMuted, cursor: "pointer", fontSize: "13px" }}>Cancel</button>
          <button onClick={() => { setSaved(true); setTimeout(onClose, 800); }}
            style={{ background: saved ? t.accessGrantedBg : t.btnPrimary, border: `1px solid ${saved ? t.accessGrantedBorder : t.btnPrimaryBorder}`, borderRadius: "7px", padding: "9px 24px", color: saved ? t.accessGrantedText : "#fff", cursor: "pointer", fontWeight: 700, fontSize: "13px", transition: "all 0.2s" }}>
            {saved ? "✓ Saved" : "Apply Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Studio tiles config ───────────────────────────────────────────────────────
const STUDIO_TILES = [
  { label: "Agents", icon: "🤖" },
  { label: "RAG", icon: "🗄" },
  { label: "MCP", icon: "🔌" },
  { label: "Prompt Library", icon: "⌨" },
];

// ─── Main KBHub ───────────────────────────────────────────────────────────────
export default function KBHub({ onCreateNew, onUploadDocs, onOpenKnowledge, onOpenExtraction }) {
  const { user, setUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [queryTarget, setQueryTarget] = useState(null);
  const [selectedKB, setSelectedKB] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [webSearch, setWebSearch] = useState("");
  const [webFilter, setWebFilter] = useState("Web");
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState(null);
  const [docsExpanded, setDocsExpanded] = useState(true);
  const [kbTitle, setKbTitle] = useState("Untitled Knowledge base");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showRAGModal, setShowRAGModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFilesLoading(true);
    setFilesError(null);
    listFiles(user)
      .then((f) => { setFiles(f); setFilesLoading(false); })
      .catch((err) => { setFilesError(err.message); setFilesLoading(false); });
  }, [user]);

  const handleFileUploaded = (result) => {
    setFiles((prev) => {
      const id = result.file_id ?? result.id;
      if (prev.some((f) => (f.file_id ?? f.id) === id)) return prev;
      return [result, ...prev];
    });
    setDocsExpanded(true);
  };

  if (!user) return null;

  const t = isDark ? DARK : LIGHT;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: t.pageBg, color: t.text, fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif", overflow: "hidden" }}>

      {/* ── Header ── */}
      <header style={{ height: "52px", flexShrink: 0, background: t.topbarBg, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", padding: "0 18px", gap: "10px" }}>
        {/* Breadcrumb title */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: t.textMuted, fontSize: "10px", fontWeight: 800, letterSpacing: "0.6px" }}>KNOWLEDGE BASE</span>
          <span style={{ color: t.border, fontSize: "14px" }}>›</span>
          {isEditingTitle ? (
            <input
              autoFocus
              value={kbTitle}
              onChange={(e) => setKbTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setIsEditingTitle(false); }}
              style={{ background: t.inputBg, border: `1px solid ${t.activeNavBorder}`, borderRadius: "4px", padding: "3px 8px", color: t.textStrong, fontSize: "14px", fontWeight: 700, fontFamily: "inherit", outline: "none", minWidth: "180px" }}
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename"
              style={{ color: t.textStrong, fontSize: "14px", fontWeight: 700, cursor: "text", borderBottom: `1px dashed ${t.border}`, paddingBottom: "1px" }}
            >
              {kbTitle}
            </span>
          )}
        </div>

        {/* Header actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <button onClick={onCreateNew}
            style={{ background: t.btnPrimary, border: `1px solid ${t.btnPrimaryBorder}`, borderRadius: "6px", padding: "6px 14px", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "14px", lineHeight: 1 }}>+</span> New KB
          </button>

          {/* Unified nav — each opens a slide-over panel */}
          {[
            { label: "Datasets", onClick: onOpenKnowledge, icon: "\u2B21" },
            { label: "Extract", onClick: onOpenExtraction, icon: "\u26A1" },
          ].map((nav) => (
            <button key={nav.label} onClick={nav.onClick}
              style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: "6px", padding: "5px 11px", color: t.textDim, cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "13px" }}>{nav.icon}</span> {nav.label}
            </button>
          ))}

          {/* Theme toggle */}
          <button onClick={toggleTheme}
            style={{ background: t.toggleBg, border: `1px solid ${t.toggleBorder}`, borderRadius: "6px", padding: "5px 9px", color: t.toggleText, cursor: "pointer", fontSize: "13px" }}>
            {isDark ? "☀" : "🌙"}
          </button>

          {/* Profile / user */}
          <div
            onClick={() => setUser(null)}
            title="Click to switch user"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", border: `1px solid ${t.border}`, borderRadius: "6px", cursor: "pointer" }}
          >
            <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: `${user.color}20`, border: `1px solid ${user.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: user.color, fontWeight: 800 }}>
              {user.userid.slice(0, 1).toUpperCase()}
            </div>
            <span style={{ color: t.textDim, fontSize: "12px" }}>{user.userid}</span>
          </div>
        </div>
      </header>

      {/* ── 3-pane body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left Panel: Sources ── */}
        <div style={{ width: "272px", flexShrink: 0, background: t.panelBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column" }}>
          {/* Panel header */}
          <div style={{ padding: "11px 14px", borderBottom: `1px solid ${t.border}`, background: t.panelHeaderBg, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ color: t.textStrong, fontSize: "13px", fontWeight: 700 }}>Sources</span>
            <button
              onClick={() => setShowSourceModal(true)}
              style={{ background: t.btnPrimary, border: `1px solid ${t.btnPrimaryBorder}`, borderRadius: "5px", padding: "4px 10px", color: t.btnAccentLabel, cursor: "pointer", fontSize: "11px", fontWeight: 700 }}
            >
              + Add sources
            </button>
          </div>

          {/* KB list + uploaded docs */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
            {/* Knowledge Bases */}
            <div style={{ color: t.textMuted, fontSize: "10px", fontWeight: 700, padding: "2px 6px 8px", letterSpacing: "0.5px" }}>KNOWLEDGE BASES</div>
            {CATALOG.map((item) => (
              <KBListItem
                key={item.id} item={item} canEdit={item.owner === user.userid} t={t}
                isSelected={selectedKB?.id === item.id}
                onSelect={() => { setSelectedKB(selectedKB?.id === item.id ? null : item); setSelectedDoc(null); }}
                onQuery={() => setQueryTarget(item)}
              />
            ))}

            {/* My Documents — collapsible */}
            <div style={{ marginTop: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "2px 6px 6px", gap: "6px" }}>
                <button
                  onClick={() => setDocsExpanded((v) => !v)}
                  style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                >
                  <span style={{ color: t.textMuted, fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", flex: 1 }}>MY DOCUMENTS</span>
                  {!filesLoading && !filesError && (
                    <span style={{ background: t.ragBg, border: `1px solid ${t.ragBorder}`, color: t.ragText, padding: "0px 5px", borderRadius: "3px", fontSize: "9px", fontWeight: 700 }}>
                      {files.length}
                    </span>
                  )}
                  <span style={{ color: t.textMuted, fontSize: "10px", transition: "transform 0.15s", display: "inline-block", transform: docsExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
                </button>
                <button
                  onClick={() => setShowRAGModal(true)}
                  title="Configure RAG pipeline"
                  style={{ background: t.btnPrimary, border: `1px solid ${t.btnPrimaryBorder}`, borderRadius: "4px", padding: "2px 7px", color: t.btnAccentLabel, cursor: "pointer", fontSize: "9px", fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}
                >
                  Configure KB
                </button>
              </div>

              {docsExpanded && (
                <div>
                  {filesLoading && (
                    <div style={{ color: t.textMuted, fontSize: "11px", padding: "6px 10px" }}>Loading…</div>
                  )}
                  {filesError && (
                    <div style={{ color: t.textMuted, fontSize: "11px", padding: "6px 10px" }}>
                      Could not reach API
                      <div style={{ fontSize: "10px", marginTop: "2px", color: t.textMuted, opacity: 0.7 }}>{filesError}</div>
                    </div>
                  )}
                  {!filesLoading && !filesError && files.length === 0 && (
                    <div style={{ color: t.textMuted, fontSize: "11px", padding: "6px 10px", fontStyle: "italic" }}>
                      No uploaded documents yet
                    </div>
                  )}
                  {!filesLoading && files.map((file) => {
                    const id = file.file_id ?? file.id;
                    return (
                      <DocListItem
                        key={id} file={file} t={t}
                        isSelected={selectedDoc?.file_id === id || selectedDoc?.id === id}
                        onSelect={() => { setSelectedDoc(file); setSelectedKB(null); }}
                        onDelete={async () => {
                          await deleteFile(user, id);
                          setFiles((prev) => prev.filter((f) => (f.file_id ?? f.id) !== id));
                          if ((selectedDoc?.file_id ?? selectedDoc?.id) === id) setSelectedDoc(null);
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Web search bar */}
          <div style={{ borderTop: `1px solid ${t.border}`, padding: "10px 12px", flexShrink: 0 }}>
            <div style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "7px", padding: "7px 10px", marginBottom: "7px", display: "flex", alignItems: "center", gap: "7px" }}>
              <span style={{ color: t.textMuted, fontSize: "13px" }}>🔍</span>
              <input
                value={webSearch}
                onChange={(e) => setWebSearch(e.target.value)}
                placeholder="Search the web for new sources"
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: t.text, fontSize: "12px", fontFamily: "'IBM Plex Sans', sans-serif" }}
              />
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {["Web", "Fast Research"].map((f) => (
                <button key={f} onClick={() => setWebFilter(f)}
                  style={{ flex: 1, background: webFilter === f ? t.btnPrimary : t.inputBg, border: `1px solid ${webFilter === f ? t.btnPrimaryBorder : t.inputBorder}`, borderRadius: "5px", padding: "5px 0", color: webFilter === f ? t.btnAccentLabel : t.textMuted, cursor: "pointer", fontSize: "11px", fontWeight: webFilter === f ? 700 : 400 }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Center Panel: Chat ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: `1px solid ${t.border}` }}>
          {/* Panel header */}
          <div style={{ padding: "11px 16px", borderBottom: `1px solid ${t.border}`, background: t.panelHeaderBg, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ color: t.textStrong, fontSize: "13px", fontWeight: 700 }}>Chat</span>
            {selectedKB && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ background: `${selectedKB.badgeColor}20`, border: `1px solid ${selectedKB.badgeColor}50`, color: selectedKB.badgeColor, padding: "2px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 700 }}>{selectedKB.badge}</span>
                <span style={{ color: t.textDim, fontSize: "12px" }}>{selectedKB.name}</span>
              </div>
            )}
            {selectedDoc && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ background: t.ragBg, border: `1px solid ${t.ragBorder}`, color: t.ragText, padding: "2px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 700 }}>DOC</span>
                <span style={{ color: t.textDim, fontSize: "12px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedDoc.original_name ?? selectedDoc.filename ?? `File ${selectedDoc.file_id ?? selectedDoc.id}`}
                </span>
              </div>
            )}
          </div>

          {/* Chat content area */}
          {selectedKB ? (
            <InlineChatPanel item={selectedKB} t={t} user={user} canEdit={selectedKB.owner === user.userid} />
          ) : selectedDoc ? (
            <DocChatPanel file={selectedDoc} t={t} user={user} />
          ) : (
            <CenterEmpty t={t} user={user} onFileUploaded={handleFileUploaded} onConfigureRAG={() => setShowRAGModal(true)} />
          )}

          {/* Bottom input bar */}
          <div style={{ borderTop: `1px solid ${t.border}`, padding: "11px 16px", background: t.panelHeaderBg, flexShrink: 0 }}>
            <div style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: t.textMuted, fontSize: "13px", flex: 1 }}>
                {selectedKB
                  ? `Ask ${selectedKB.name}…`
                  : selectedDoc
                    ? `Ask ${selectedDoc.original_name ?? selectedDoc.filename ?? "document"}…`
                    : "Select a source or upload a document to get started"}
              </span>
              <span style={{ background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: "4px", padding: "3px 8px", color: t.textMuted, fontSize: "10px", fontWeight: 600, flexShrink: 0 }}>
                {selectedKB || selectedDoc ? "1 source" : "0 sources"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Studio ── */}
        <div style={{ width: "260px", flexShrink: 0, background: t.panelBg, display: "flex", flexDirection: "column" }}>
          {/* Panel header */}
          <div style={{ padding: "11px 14px", borderBottom: `1px solid ${t.border}`, background: t.panelHeaderBg, flexShrink: 0 }}>
            <span style={{ color: t.textStrong, fontSize: "13px", fontWeight: 700 }}>Studio</span>
          </div>

          {/* Tiles */}
          <div style={{ flex: 1, padding: "14px", overflowY: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {STUDIO_TILES.map((tile) => (
                <StudioTile key={tile.label} label={tile.label} icon={tile.icon} t={t} />
              ))}
            </div>
          </div>

          {/* Add note footer */}
          <div style={{ borderTop: `1px solid ${t.border}`, padding: "11px 14px", flexShrink: 0 }}>
            <button
              style={{ width: "100%", background: "transparent", border: `1px solid ${t.border}`, borderRadius: "7px", padding: "9px 14px", color: t.textDim, cursor: "pointer", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}
            >
              <span>✏</span> Add note
            </button>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showSourceModal && (
        <AddSourceModal
          t={t}
          onClose={() => setShowSourceModal(false)}
          onSelectPrimary={() => { setShowSourceModal(false); onCreateNew(); }}
          onUpload={() => { setShowSourceModal(false); onUploadDocs(); }}
        />
      )}
      {queryTarget && (
        <QueryDialog item={queryTarget} t={t} onClose={() => setQueryTarget(null)} />
      )}
      {showRAGModal && (
        <RAGConfigModal t={t} isDark={isDark} onClose={() => setShowRAGModal(false)} />
      )}
    </div>
  );
}
