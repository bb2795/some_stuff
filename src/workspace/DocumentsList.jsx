// Shared member-document table used by both KnowledgeBaseView (indexed KB)
// and StoreView (un-indexed Store). Originally lived inline in
// KnowledgeBaseView.jsx; extracted so the un-indexed surface can reuse it.

const MONO = "'IBM Plex Mono', monospace";

export default function DocumentsList({ memberDocs, onOpenDoc, onOpenExtraction, t, title = "Documents in this KB" }) {
  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}`, background: t.panelBg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: t.textStrong, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
          {title}
        </div>
        <span style={{ color: t.textMuted, fontSize: 11, fontFamily: MONO }}>{memberDocs.length}</span>
      </div>

      {memberDocs.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontSize: 12 }}>
          No member documents.
        </div>
      )}

      {memberDocs.map((m, i) => {
        if (m.missingId) {
          return (
            <div key={`missing-${m.missingId}`} style={{ display: "grid", gridTemplateColumns: "24px 1fr 80px 120px 90px", gap: 10, padding: "10px 14px", borderBottom: i < memberDocs.length - 1 ? `1px solid ${t.borderFaint}` : "none", alignItems: "center" }}>
              <span style={{ color: t.textDisabled, fontSize: 13 }}>⚠</span>
              <span style={{ color: t.textDisabled, fontSize: 12, fontStyle: "italic" }}>doc id {m.missingId} — not in your document list</span>
              <span /><span /><span />
            </div>
          );
        }
        const f = m.file;
        const id = f.file_id ?? f.id;
        const name = f.original_name ?? f.filename ?? `File ${id}`;
        const size = f.size ?? f.file_size ?? 0;
        const ext = name.split(".").pop()?.toUpperCase() || "";
        return (
          <div key={id}
            onClick={() => onOpenDoc?.(f)}
            style={{
              display: "grid", gridTemplateColumns: "24px 1fr 80px 120px 90px",
              gap: 10, padding: "10px 14px",
              borderBottom: i < memberDocs.length - 1 ? `1px solid ${t.borderFaint}` : "none",
              alignItems: "center", cursor: onOpenDoc ? "pointer" : "default",
            }}
            onMouseEnter={(e) => { if (onOpenDoc) e.currentTarget.style.background = t.panelBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <span style={{ color: "#7C3AED", fontSize: 13 }}>▤</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: t.text, fontSize: 12, fontWeight: 600, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name}
              </div>
              <div style={{ color: t.textDisabled, fontSize: 9, fontFamily: MONO, marginTop: 1 }}>
                id {id} · {ext}
              </div>
            </div>
            <span style={{ color: t.textMuted, fontSize: 11, fontFamily: MONO, textAlign: "right" }}>
              {Math.round(size / 1024)} KB
            </span>
            {m.status ? (
              <span style={{
                background: `${m.status.color}20`, color: m.status.color,
                fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 10,
                letterSpacing: 0.8, textTransform: "uppercase", justifySelf: "center",
              }}>
                {m.status.dot} {m.status.label}
              </span>
            ) : <span />}
            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
              {onOpenExtraction && (
                <button onClick={(e) => { e.stopPropagation(); onOpenExtraction(f); }}
                  title="Open in extraction studio"
                  style={{
                    background: "transparent", border: `1px solid ${t.borderSubtle}`, borderRadius: 4,
                    padding: "3px 8px", color: "#EA580C", cursor: "pointer", fontSize: 10, fontWeight: 700,
                  }}>⚙ Extract</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
