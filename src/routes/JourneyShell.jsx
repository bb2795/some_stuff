import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useJourney, PHASES } from "../context/JourneyContext";
import PhaseRail from "../components/PhaseRail";

import ConnectPhase from "../phases/ConnectPhase";
import CuratePhase from "../phases/CuratePhase";
import ConfigurePhase from "../phases/ConfigurePhase";
import ProcessPhase from "../phases/ProcessPhase";
import KnowledgePhase from "../phases/KnowledgePhase";
import ConsumePhase from "../phases/ConsumePhase";

const PHASE_COMPONENTS = {
  connect: ConnectPhase,
  curate: CuratePhase,
  configure: ConfigurePhase,
  process: ProcessPhase,
  knowledge: KnowledgePhase,
  consume: ConsumePhase,
};

export default function JourneyShell() {
  const { user, setUser } = useAuth();
  const { t, isDark, toggleTheme } = useTheme();
  const { activePath, phaseIdx, goPicker, goToPhase, nextPhase, prevPhase, openObsidian } = useJourney();

  const phase = PHASES[phaseIdx];
  const PhaseComponent = PHASE_COMPONENTS[phase.id];

  const pathPhases = activePath?.phases ?? [];
  const i = pathPhases.indexOf(phaseIdx);
  const isFirst = i <= 0;
  const isLast = i >= pathPhases.length - 1;

  return (
    <div style={{
      background: t.pageBg, minHeight: "100vh", color: t.text,
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* ── Top header ── */}
      <div style={{
        borderBottom: `1px solid ${t.border}`, background: t.sidebarBg,
        padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: t.textStrong, letterSpacing: "-0.3px" }}>
            Knowledge
          </span>
          <span style={{ color: t.textGhost, fontSize: 12 }}>/</span>
          <span style={{ color: phase.color, fontSize: 13, fontWeight: 700 }}>
            Phase {phaseIdx} · {phase.label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={openObsidian}
            style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "6px 12px", color: t.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            ◉ Graph
          </button>
          <div style={{
            background: `${user.color}15`, border: `1px solid ${user.color}40`,
            borderRadius: 6, padding: "5px 10px", display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ color: user.color, fontSize: 11 }}>👤</span>
            <div style={{ color: user.color, fontSize: 11, fontWeight: 700 }}>{user.userid}</div>
          </div>
          <button onClick={toggleTheme}
            style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "5px 10px", color: t.textMuted, cursor: "pointer", fontSize: 11 }}>
            {isDark ? "☀" : "🌙"}
          </button>
          <button onClick={() => setUser(null)}
            style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "5px 10px", color: t.textMuted, cursor: "pointer", fontSize: 11 }}>
            Switch user
          </button>
        </div>
      </div>

      {/* ── Phase rail ── */}
      <PhaseRail
        activePath={activePath}
        currentPhaseIdx={phaseIdx}
        onJump={goToPhase}
        onHome={goPicker}
        isDark={isDark}
      />

      {/* ── Phase title band ── */}
      <div style={{
        borderBottom: `1px solid ${t.border}`,
        background: `linear-gradient(to right, ${phase.color}15, transparent 60%)`,
        padding: "18px 32px",
      }}>
        <div style={{ color: phase.color, fontSize: 11, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase" }}>
          {activePath?.label} · Phase {phaseIdx} of {PHASES.length - 1}
        </div>
        <h1 style={{ color: t.textStrong, fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", margin: "2px 0 0" }}>
          {phase.label}
        </h1>
      </div>

      {/* ── Phase body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {PhaseComponent ? <PhaseComponent /> : <div style={{ color: t.textMuted }}>Unknown phase.</div>}
        </div>
      </div>

      {/* ── Footer nav ── */}
      <div style={{
        borderTop: `1px solid ${t.border}`, background: t.sidebarBg,
        padding: "12px 32px", display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0,
      }}>
        <button onClick={prevPhase} disabled={isFirst}
          style={{
            background: isFirst ? "transparent" : t.panelBg,
            border: `1px solid ${isFirst ? "transparent" : t.borderMid}`,
            borderRadius: 6, padding: "9px 20px",
            color: isFirst ? "transparent" : t.textMuted,
            cursor: isFirst ? "default" : "pointer",
            fontWeight: 600, fontSize: 13,
          }}>
          ← Previous
        </button>
        <span style={{ color: t.textDisabled, fontSize: 12 }}>
          {i + 1} / {pathPhases.length} · {activePath?.label}
        </span>
        <button onClick={nextPhase} disabled={isLast}
          style={{
            background: isLast ? t.greenTint : `${phase.color}20`,
            border: `1px solid ${isLast ? t.green : phase.color}`,
            borderRadius: 6, padding: "9px 20px",
            color: isLast ? t.green : phase.color,
            cursor: isLast ? "default" : "pointer",
            fontWeight: 700, fontSize: 13,
            opacity: isLast ? 0.7 : 1,
          }}>
          {isLast ? "Journey Complete ✓" : "Next →"}
        </button>
      </div>
    </div>
  );
}
