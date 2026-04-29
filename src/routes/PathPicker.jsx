import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useJourney, PATHS } from "../context/JourneyContext";

// ─── Small presentational helpers ─────────────────────────────────────────

function PathCard({ path, onClick, t }) {
  const hoverStyle = (e, on) => {
    e.currentTarget.style.borderColor = on ? path.color : `${path.color}50`;
    e.currentTarget.style.transform = on ? "translateY(-2px)" : "translateY(0)";
    e.currentTarget.style.boxShadow = on
      ? `0 12px 32px ${path.color}25`
      : `0 4px 12px rgba(0,0,0,0.04)`;
  };
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => hoverStyle(e, true)}
      onMouseLeave={(e) => hoverStyle(e, false)}
      style={{
        background: t.cardBg,
        border: `2px solid ${path.color}50`,
        borderRadius: 14,
        padding: "28px 24px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.2s",
        boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minHeight: 220,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 24,
          background: `${path.color}15`, border: `2px solid ${path.color}50`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
        }}>
          {path.icon}
        </div>
        <div style={{ color: path.color, fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px" }}>
          {path.label}
        </div>
      </div>

      <div style={{ color: t.textDim, fontSize: 13, lineHeight: 1.6 }}>
        {path.desc}
      </div>

      {/* Phase chips (mini preview of the journey this path takes) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: "auto" }}>
        {path.phases.map((pi, i) => (
          <span key={pi} style={{
            fontSize: 10, fontWeight: 600,
            color: path.color, background: `${path.color}10`,
            border: `1px solid ${path.color}30`,
            padding: "3px 8px", borderRadius: 10,
          }}>
            {i > 0 && <span style={{ color: `${path.color}80`, marginRight: 4 }}>→</span>}
            {PHASE_NAMES[pi]}
          </span>
        ))}
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        color: path.color, fontSize: 13, fontWeight: 600, marginTop: 4,
      }}>
        Start → <span style={{ fontSize: 14 }}>↗</span>
      </div>
    </button>
  );
}

const PHASE_NAMES = {
  1: "Connect",
  2: "Curate",
  3: "Configure",
  4: "Process",
  5: "Knowledge",
  6: "Consume",
};

// ─── Screen ───────────────────────────────────────────────────────────────

export default function PathPicker() {
  const { user, setUser } = useAuth();
  const { t, isDark, toggleTheme } = useTheme();
  const { startPath, openFlowGraph, openObsidian } = useJourney();

  return (
    <div style={{
      background: t.pageBg, minHeight: "100vh", color: t.text,
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* ── Header ── */}
      <div style={{
        borderBottom: `1px solid ${t.border}`, background: t.sidebarBg,
        padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 24, color: t.textStrong, letterSpacing: "-0.5px" }}>
              Knowledge
            </span>
            <span style={{ color: t.textGhost, fontSize: 13 }}>/ knowledge</span>
          </div>
          <div style={{ color: t.textDisabled, fontSize: 12, marginTop: 4 }}>
            3 entry points · 7 phases · One Knowledge Artifact
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={openFlowGraph}
            style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "7px 14px", color: t.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            ▦ Flow Graph
          </button>
          <button onClick={openObsidian}
            style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "7px 14px", color: t.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            ◉ Knowledge Graph
          </button>

          <div style={{ width: 1, height: 24, background: t.border, margin: "0 4px" }} />

          <div style={{
            background: `${user.color}15`, border: `1px solid ${user.color}40`,
            borderRadius: 6, padding: "6px 12px",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ color: user.color, fontSize: 12 }}>👤</span>
            <div>
              <div style={{ color: user.color, fontSize: 12, fontWeight: 700 }}>{user.userid}</div>
              <div style={{ color: t.textGhost, fontSize: 10 }}>{user.label}</div>
            </div>
          </div>
          <button onClick={toggleTheme}
            style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "6px 12px", color: t.textMuted, cursor: "pointer", fontSize: 12 }}>
            {isDark ? "☀" : "🌙"}
          </button>
          <button onClick={() => setUser(null)}
            style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "6px 12px", color: t.textMuted, cursor: "pointer", fontSize: 12 }}>
            Switch user
          </button>
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 32px 24px" }}>
        <h1 style={{ color: t.textStrong, fontSize: 36, fontWeight: 800, letterSpacing: "-1px", margin: 0 }}>
          How do you want to start?
        </h1>
        <p style={{ color: t.textDim, fontSize: 15, lineHeight: 1.6, marginTop: 10, maxWidth: 640 }}>
          Knowledge turns enterprise data into retrievable, entitled knowledge.
          Pick an entry path — each leads through the same 7-phase journey, but starts you
          where it makes sense.
        </p>
      </div>

      {/* ── Path cards ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 32px 32px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {Object.values(PATHS).map((p) => (
          <PathCard key={p.id} path={p} t={t} onClick={() => startPath(p.id)} />
        ))}
      </div>

      {/* ── Bottom stripe: links to viz screens ── */}
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "24px 32px 48px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
      }}>
        <button onClick={openFlowGraph}
          style={{
            background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10,
            padding: "18px 22px", cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", gap: 14,
          }}>
          <span style={{ fontSize: 26 }}>▦</span>
          <div>
            <div style={{ color: t.textStrong, fontSize: 14, fontWeight: 700 }}>See the flow graph</div>
            <div style={{ color: t.textDim, fontSize: 12, marginTop: 2 }}>
              All 3 paths and 7 phases on one canvas.
            </div>
          </div>
        </button>
        <button onClick={openObsidian}
          style={{
            background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10,
            padding: "18px 22px", cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", gap: 14,
          }}>
          <span style={{ fontSize: 26 }}>◉</span>
          <div>
            <div style={{ color: t.textStrong, fontSize: 14, fontWeight: 700 }}>Explore the knowledge graph</div>
            <div style={{ color: t.textDim, fontSize: 12, marginTop: 2 }}>
              Obsidian-style: docs → chunks → embeddings → links.
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
