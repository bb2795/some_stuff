import { useTheme } from "../context/ThemeContext";
import { useJourney } from "../context/JourneyContext";
import { useAuth } from "../context/AuthContext";

const GREEN = "#16A34A";
const MONO = "'IBM Plex Mono', monospace";

// The Knowledge Artifact landing. Hero card + summary stats + primary CTA to
// open the Obsidian-style knowledge graph, with secondary CTAs to consume.

export default function KnowledgePhase() {
  const { user } = useAuth();
  const { t } = useTheme();
  const { state, nextPhase, openObsidian } = useJourney();

  const artifact = state.artifact || {
    name: "pending-artifact",
    chunks: state.pipeline?.index?.chunks ?? 0,
    nodes:  state.pipeline?.index?.nodes  ?? 0,
    dims:   state.pipeline?.index?.dims   ?? 1536,
    engine: state.pipeline?.index?.engine ?? "OpenSearch HNSW",
  };

  const ready = !!state.pipeline?.index;

  return (
    <div>
      <p style={{ color: t.textDim, fontSize: 14, lineHeight: 1.6, marginTop: 0, marginBottom: 20 }}>
        The Knowledge Artifact is the thing every other phase produces. It encapsulates the vector index,
        entitlements, chunk metadata, and the semantic graph across your documents.
      </p>

      {/* ── Hero artifact card ── */}
      <div style={{
        background: "linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)",
        border: `2px solid ${GREEN}`, borderRadius: 14,
        padding: 28, marginBottom: 18,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: `${GREEN}15`, filter: "blur(40px)" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: GREEN, boxShadow: `0 0 12px ${GREEN}80` }} />
              <span style={{ color: GREEN, fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
                {ready ? "● Live Knowledge Artifact" : "○ Not Yet Built"}
              </span>
            </div>
            <h2 style={{ color: "#052e16", fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: "-0.8px" }}>
              {artifact.name}
            </h2>
            <div style={{ color: "#166534", fontSize: 13, marginTop: 8, fontFamily: MONO }}>
              owner: {user.userid} · {artifact.engine} · {artifact.dims}-dim
            </div>
          </div>
          <span style={{ fontSize: 52, opacity: 0.5 }}>◉</span>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 24 }}>
          {[
            { label: "Chunks",       value: artifact.chunks   || "—" },
            { label: "Vector Nodes", value: artifact.nodes    || "—" },
            { label: "Dimensions",   value: artifact.dims },
            { label: "Engine",       value: artifact.engine },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${GREEN}40`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ color: "#166534", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
              <div style={{ color: "#052e16", fontSize: 22, fontWeight: 800, fontFamily: MONO, marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={openObsidian}
            style={{ background: GREEN, color: "#fff", border: `1px solid ${GREEN}`, borderRadius: 8, padding: "11px 22px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            ◉ Explore in Knowledge Graph
          </button>
          <button onClick={nextPhase}
            style={{ background: "transparent", color: GREEN, border: `2px solid ${GREEN}`, borderRadius: 8, padding: "10px 22px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            Consume → Query
          </button>
        </div>
      </div>

      {/* ── What's inside panel ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Panel title="What's Inside" t={t}>
          {[
            { k: "Vector Index",  v: "OpenSearch HNSW · m=16 · ef=256" },
            { k: "Chunk Manifest",v: "Per-chunk metadata with source spans" },
            { k: "Semantic Graph",v: "Chunk→chunk similarity links, doc→doc clusters" },
            { k: "Taxonomy",      v: "Inferred topics · fields · named entities" },
            { k: "Entitlements",  v: `Scoped to ${user.userid} · inherited from source classification` },
          ].map((r) => (
            <Row key={r.k} label={r.k} value={r.v} t={t} />
          ))}
        </Panel>

        <Panel title="Access Surfaces" t={t}>
          {[
            { k: "REST",    v: `POST /v1/knowledge/${artifact.name}/retrieve` },
            { k: "Agent",   v: `tools: [{ type: "knowledge", kb_id: "${artifact.name}" }]` },
            { k: "Console", v: "Interactive Q&A in the Consume phase →" },
            { k: "Monitor", v: "Health · evals · audit log · drift" },
          ].map((r) => (
            <Row key={r.k} label={r.k} value={r.v} t={t} mono />
          ))}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children, t }) {
  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
      <div style={{ color: t.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
function Row({ label, value, t, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
      <span style={{ color: t.textMuted, fontSize: 12 }}>{label}</span>
      <span style={{ color: t.text, fontSize: 12, textAlign: "right", maxWidth: "70%", fontFamily: mono ? MONO : "inherit" }}>{value}</span>
    </div>
  );
}
