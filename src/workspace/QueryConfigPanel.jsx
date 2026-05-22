// Slide-in panel for editing the active query config's retrieval knobs.
// Used by KnowledgeBaseView. Mirrors the Retrieval step of
// ConfigureKBWizard, but scoped to per-session/per-saved query config —
// not the KB's own ingestion config.

const MONO = "'IBM Plex Mono', monospace";
const BLUE = "#2563EB";

const RERANKERS = [
  { id: "none", label: "None" },
  { id: "cohere-rerank-v3", label: "Cohere Rerank v3" },
  { id: "bge-reranker-v2", label: "bge-reranker-v2 (self-host)" },
  { id: "jina-reranker", label: "Jina reranker-base" },
];

export default function QueryConfigPanel({ config, onChange, onClose, onSave, onDelete, t }) {
  if (!config) return null;
  const rp = config.retrievalParams || {};
  const set = (key, value) =>
    onChange({ ...config, mode: "manual", retrievalParams: { ...rp, [key]: value } });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{
        position: "relative", width: "min(440px, 92vw)", height: "100vh",
        background: t.pageBg, borderLeft: `1px solid ${t.border}`,
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 30px rgba(0,0,0,0.3)",
        animation: "qcpSlide 0.18s ease-out",
      }}>
        <style>{`@keyframes qcpSlide { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, background: t.sidebarBg, display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 5, padding: "4px 9px", color: t.textMuted, cursor: "pointer", fontSize: 11 }}>✕</button>
          <div style={{ flex: 1 }}>
            <div style={{ color: t.textStrong, fontSize: 13, fontWeight: 800 }}>
              {config.kind === "saved" ? "Saved config" : "Query config"} · {config.name}
            </div>
            <div style={{ color: t.textMuted, fontSize: 10 }}>
              {config.mode === "auto" ? "Auto-detected from KB" : "Manual overrides"} ·{" "}
              {config.kind === "saved" ? "Persistent" : "Session (30-day TTL)"}
            </div>
          </div>
          <span style={{
            background: config.mode === "auto" ? "#16A34A20" : "#EA580C20",
            color: config.mode === "auto" ? "#16A34A" : "#EA580C",
            fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, letterSpacing: 0.5, textTransform: "uppercase",
          }}>
            {config.mode}
          </span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "18px 18px 24px" }}>
          <Section title="Retrieval" t={t}>
            <Row label="topK" hint="docs retrieved before reranking" t={t}>
              <NumberInput value={rp.topK ?? 10} min={1} max={100} onChange={(v) => set("topK", v)} t={t} />
            </Row>
            <Row label="rerankTopN" hint="kept after reranking" t={t}>
              <NumberInput value={rp.rerankTopN ?? 5} min={1} max={50} onChange={(v) => set("rerankTopN", v)} t={t} />
            </Row>
            <Row label="reranker" t={t}>
              <select value={rp.reranker || "cohere-rerank-v3"}
                onChange={(e) => set("reranker", e.target.value)}
                style={selectStyle(t)}>
                {RERANKERS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </Row>
            <Row label="hybridAlpha" hint="0 = BM25 only · 1 = vector only" t={t}>
              <SliderInput value={rp.hybridAlpha ?? 0.5} min={0} max={1} step={0.05} onChange={(v) => set("hybridAlpha", v)} t={t} />
            </Row>
            <Row label="scoreThreshold" hint="minimum match score (0 = off)" t={t}>
              <SliderInput value={rp.scoreThreshold ?? 0} min={0} max={1} step={0.05} onChange={(v) => set("scoreThreshold", v)} t={t} />
            </Row>
          </Section>

          <Section title="Diversity (MMR)" t={t}>
            <Row label="enable MMR" t={t}>
              <Toggle value={!!rp.mmr} onChange={(v) => set("mmr", v)} t={t} />
            </Row>
            <Row label="mmrLambda" hint="0 = max diversity · 1 = max relevance" t={t}>
              <SliderInput value={rp.mmrLambda ?? 0.5} min={0} max={1} step={0.05} onChange={(v) => set("mmrLambda", v)} disabled={!rp.mmr} t={t} />
            </Row>
          </Section>

          <Section title="Filters" t={t}>
            <Row label="metadataFilters" hint="e.g. domain=ccb-risk, year>=2024" t={t}>
              <input value={rp.metadataFilters || ""}
                onChange={(e) => set("metadataFilters", e.target.value)}
                placeholder="key=value, key>=value"
                style={{ ...selectStyle(t), width: "100%" }} />
            </Row>
          </Section>
        </div>

        {/* Footer actions */}
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${t.border}`, background: t.sidebarBg, display: "flex", gap: 8 }}>
          {config.kind !== "saved" && onSave && (
            <button onClick={onSave}
              style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 5, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              ★ Save config
            </button>
          )}
          {onDelete && config.kind === "saved" && (
            <button onClick={onDelete}
              style={{ background: "transparent", color: "#DC2626", border: `1px solid #DC2626`, borderRadius: 5, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose}
            style={{ background: "transparent", color: t.textMuted, border: `1px solid ${t.borderMid}`, borderRadius: 5, padding: "7px 12px", fontSize: 11, cursor: "pointer" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, t }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 12px" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, hint, children, t }) {
  return (
    <div style={{ padding: "9px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: hint ? 4 : 0 }}>
        <span style={{ color: t.text, fontSize: 12, fontWeight: 600, fontFamily: MONO, flex: 1 }}>{label}</span>
        {children}
      </div>
      {hint && <div style={{ color: t.textDisabled, fontSize: 10, fontStyle: "italic" }}>{hint}</div>}
    </div>
  );
}

function NumberInput({ value, min, max, onChange, t }) {
  return (
    <input type="number" value={value} min={min} max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ...selectStyle(t), width: 72, textAlign: "right" }} />
  );
}

function SliderInput({ value, min, max, step, onChange, disabled, t }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, width: 160 }}>
      <input type="range" value={value} min={min} max={max} step={step}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, opacity: disabled ? 0.4 : 1 }} />
      <span style={{ color: t.text, fontSize: 11, fontFamily: MONO, width: 36, textAlign: "right" }}>
        {Number(value).toFixed(2)}
      </span>
    </div>
  );
}

function Toggle({ value, onChange, t }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{
        background: value ? "#16A34A" : t.borderSubtle, border: "none", borderRadius: 999,
        width: 36, height: 18, position: "relative", cursor: "pointer", padding: 0,
      }}>
      <span style={{
        position: "absolute", top: 2, left: value ? 20 : 2,
        width: 14, height: 14, borderRadius: 7, background: "#fff",
        transition: "left 0.12s",
      }} />
    </button>
  );
}

function selectStyle(t) {
  return {
    background: t.inputBg, border: `1px solid ${t.borderSubtle}`, borderRadius: 5,
    padding: "4px 8px", color: t.text, fontSize: 11, outline: "none",
  };
}
