import { useState } from "react";

// Reusable pipeline viewer. Shows parsed markdown, chunks, nodes, and index
// as separate inspectable stages. Pipeline state is owned by the parent —
// this component is purely presentational. Used by ProcessPhase.

const STAGES = [
  { id: "parsed",  label: "Parsed",   icon: "⚡" },
  { id: "chunks",  label: "Chunks",   icon: "✂" },
  { id: "nodes",   label: "Nodes",    icon: "⬡" },
  { id: "index",   label: "Index",    icon: "🔗" },
];

export function simulateChunks(markdown) {
  if (!markdown) return [];
  const sections = markdown.split(/\n#{1,3}\s+/).filter(Boolean);
  return sections.slice(0, 16).map((s, i) => {
    const lines = s.trim().split("\n");
    const title = lines[0]?.substring(0, 64) || `Chunk ${i + 1}`;
    const body = lines.slice(1).join(" ").substring(0, 160);
    return {
      id: i,
      title: title.replace(/^#+\s*/, ""),
      body,
      tokens: 80 + Math.floor(Math.random() * 400),
      type: body.includes("|") ? "table" : "text",
    };
  });
}

export function simulateNodes(chunks) {
  return chunks.map((c, i) => ({
    id: `node-${i}`,
    chunkId: i,
    label: c.title.substring(0, 30),
    embedding: `[${(Math.random() * 2 - 1).toFixed(3)}, ${(Math.random() * 2 - 1).toFixed(3)}, ... 1536d]`,
    neighbors: [
      chunks[(i + 1) % chunks.length]?.title?.substring(0, 24),
      chunks[Math.max(0, i - 1)]?.title?.substring(0, 24),
    ].filter(Boolean),
  }));
}

function Spinner({ color = "#EA580C", size = 16 }) {
  return (
    <>
      <span style={{
        display: "inline-block", width: size, height: size,
        border: "2px solid #e5e5e5", borderTopColor: color, borderRadius: "50%",
        animation: "pi-spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes pi-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export default function PipelineInspector({ pipeline, activeStage, onStageChange, phaseColor = "#EA580C", theme }) {
  const [nodeView, setNodeView] = useState("tree");
  const t = theme;
  const MONO = "'IBM Plex Mono', 'JetBrains Mono', 'Cascadia Code', Menlo, monospace";

  const stageAvailable = (id) => pipeline?.[id] != null;

  const activeLabel = STAGES.find((s) => s.id === activeStage)?.label || "Pipeline";

  return (
    <div style={{
      background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10,
      overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 480,
    }}>
      {/* Stage selector */}
      <div style={{
        borderBottom: `1px solid ${t.border}`,
        padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 4,
        background: t.panelBg,
      }}>
        {STAGES.map((s, i) => {
          const has = stageAvailable(s.id);
          const active = activeStage === s.id;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
              <button onClick={() => has && onStageChange?.(s.id)}
                disabled={!has}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 14,
                  background: active ? phaseColor : (has ? `${phaseColor}15` : "transparent"),
                  color: active ? "#fff" : (has ? phaseColor : t.textDisabled),
                  border: `1px solid ${active ? phaseColor : (has ? `${phaseColor}40` : t.border)}`,
                  fontSize: 11, fontWeight: active ? 700 : 600,
                  cursor: has ? "pointer" : "not-allowed",
                  opacity: has ? 1 : 0.4,
                }}>
                <span>{has ? "✓" : s.icon}</span>
                {s.label}
              </button>
              {i < STAGES.length - 1 && (
                <span style={{ color: has ? phaseColor : t.textDisabled, margin: "0 4px", opacity: 0.5 }}>→</span>
              )}
            </div>
          );
        })}

        <div style={{ flex: 1 }} />

        {activeStage === "nodes" && pipeline?.nodes && (
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { id: "tree", icon: "🌲" },
              { id: "graph", icon: "⬡" },
            ].map((v) => (
              <button key={v.id} onClick={() => setNodeView(v.id)}
                style={{
                  width: 28, height: 28, borderRadius: 4,
                  background: nodeView === v.id ? phaseColor : "transparent",
                  border: `1px solid ${nodeView === v.id ? phaseColor : t.border}`,
                  color: nodeView === v.id ? "#fff" : t.textMuted, cursor: "pointer", fontSize: 12,
                }}>
                {v.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stage body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, background: t.pageBg }}>
        {/* PARSED */}
        {activeStage === "parsed" && (
          pipeline?.parsed ? (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <span style={{ background: phaseColor, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3 }}>Parsed</span>
                <span style={{ fontSize: 11, color: t.textMuted }}>
                  {(pipeline.parsed?.length || 0).toLocaleString()} chars
                </span>
              </div>
              <pre style={{
                fontFamily: MONO, fontSize: 12, color: t.text, lineHeight: 1.7,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 6, padding: 12,
                margin: 0,
              }}>
                {pipeline.parsed}
              </pre>
            </>
          ) : <EmptyStage label="parsing" theme={t} phaseColor={phaseColor} />
        )}

        {/* CHUNKS */}
        {activeStage === "chunks" && (
          pipeline?.chunks ? (
            <>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 10 }}>
                {pipeline.chunks.length} chunks
              </div>
              {pipeline.chunks.map((ch, i) => (
                <div key={i} style={{
                  padding: "10px 12px",
                  background: i % 2 === 0 ? t.panelBg : t.cardBg,
                  border: `1px solid ${t.border}`, borderRadius: 6, marginBottom: 4,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: MONO }}>
                      #{i + 1} {ch.title}
                    </span>
                    <span style={{
                      fontSize: 10, color: phaseColor,
                      background: `${phaseColor}15`, border: `1px solid ${phaseColor}40`,
                      padding: "2px 8px", borderRadius: 3, fontWeight: 700, fontFamily: MONO,
                    }}>
                      {ch.tokens} tok
                    </span>
                  </div>
                  {ch.body && (
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4, lineHeight: 1.5 }}>
                      {ch.body}...
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : <EmptyStage label="chunking" theme={t} phaseColor={phaseColor} />
        )}

        {/* NODES */}
        {activeStage === "nodes" && (
          pipeline?.nodes ? (
            nodeView === "tree" ? (
              <>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 10 }}>
                  {pipeline.nodes.length} embedded nodes · 1536-dim vectors
                </div>
                <div style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.9 }}>
                  <div style={{ color: t.textStrong, fontWeight: 700 }}>📁 Knowledge Artifact</div>
                  {pipeline.nodes.map((n, i) => (
                    <div key={i} style={{ paddingLeft: 22 }}>
                      <div style={{ color: t.text }}>
                        ├─ <span style={{ fontWeight: 600 }}>node_{i}</span>{" "}
                        <span style={{ color: t.textMuted }}>({n.label})</span>
                      </div>
                      <div style={{ paddingLeft: 26, color: t.textMuted, fontSize: 11 }}>
                        emb: {n.embedding}
                      </div>
                      <div style={{ paddingLeft: 26, color: t.textFaint, fontSize: 11 }}>
                        ↔ [{n.neighbors.join(", ")}]
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 10 }}>
                  {pipeline.nodes.length} nodes · semantic neighbor graph
                </div>
                <NodeGraph nodes={pipeline.nodes} phaseColor={phaseColor} theme={t} />
              </>
            )
          ) : <EmptyStage label="embedding" theme={t} phaseColor={phaseColor} />
        )}

        {/* INDEX */}
        {activeStage === "index" && (
          pipeline?.index ? (
            <>
              <div style={{
                background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: 14, marginBottom: 14,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#16A34A", marginBottom: 4 }}>
                  ✓ Index ready
                </div>
                <div style={{ fontSize: 12, color: "#1E293B", fontFamily: MONO }}>
                  {pipeline.index.name}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", fontSize: 12 }}>
                <IndexRow label="Chunks"      value={pipeline.index.chunks}  t={t} />
                <IndexRow label="Nodes"       value={pipeline.index.nodes}   t={t} />
                <IndexRow label="Dimensions"  value={pipeline.index.dims}    t={t} />
                <IndexRow label="Engine"      value={pipeline.index.engine ?? "OpenSearch HNSW"} t={t} />
                <IndexRow label="Status"      value="ACTIVE" pill t={t} />
                <IndexRow label="Owner"       value={pipeline.index.owner ?? "—"} t={t} />
              </div>
              <div style={{
                marginTop: 16, background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 6,
                padding: 12, fontSize: 11, color: t.textMuted, fontFamily: MONO, lineHeight: 1.6,
              }}>
                POST /v1/knowledge/{pipeline.index.name}/retrieve<br />
                &nbsp;&nbsp;{`{ "query": "...", "top_k": 5 }`}
              </div>
            </>
          ) : <EmptyStage label="indexing" theme={t} phaseColor={phaseColor} />
        )}
      </div>
    </div>
  );
}

function IndexRow({ label, value, pill, t }) {
  return (
    <div>
      <span style={{ color: t.textMuted }}>{label}: </span>
      {pill ? (
        <span style={{ background: "#DCFCE7", color: "#16A34A", fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 3 }}>
          {value}
        </span>
      ) : (
        <span style={{ fontWeight: 600, color: t.text }}>{value}</span>
      )}
    </div>
  );
}

function EmptyStage({ label, theme, phaseColor }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 10, padding: 48, color: theme.textMuted,
    }}>
      <Spinner color={phaseColor} size={20} />
      <span style={{ fontSize: 12 }}>Waiting for {label}…</span>
    </div>
  );
}

function NodeGraph({ nodes, phaseColor, theme }) {
  // Simple ring layout + nearest-neighbor chords
  const cx = 260, cy = 200, r = 140;
  const positions = nodes.map((_, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  return (
    <svg viewBox="0 0 520 400" style={{
      width: "100%", height: "auto", background: theme.panelBg,
      border: `1px solid ${theme.border}`, borderRadius: 6,
    }}>
      {/* Chords */}
      {positions.map((p, i) => {
        const ni = (i + 1) % positions.length;
        const op = positions[ni];
        return <line key={`c1${i}`} x1={p.x} y1={p.y} x2={op.x} y2={op.y} stroke={`${phaseColor}40`} strokeWidth="1" />;
      })}
      {positions.map((p, i) => {
        const ni = (i + 3) % positions.length;
        const op = positions[ni];
        return <line key={`c2${i}`} x1={p.x} y1={p.y} x2={op.x} y2={op.y} stroke={`${phaseColor}20`} strokeWidth="0.5" />;
      })}
      {/* Nodes */}
      {positions.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={14} fill={phaseColor} stroke="#fff" strokeWidth="2" />
          <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="700">
            {i}
          </text>
        </g>
      ))}
    </svg>
  );
}
