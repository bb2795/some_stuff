import { PHASES } from "../context/JourneyContext";

// Persistent 7-phase progress rail. Shows all phases in the user's flow-graph
// color palette. Phases not in the active path are dimmed. Clicking a reachable
// phase jumps to it.

export default function PhaseRail({ activePath, currentPhaseIdx, onJump, onHome, isDark }) {
  const pathPhases = new Set(activePath?.phases ?? []);
  const currentIndexInPath = activePath
    ? activePath.phases.indexOf(currentPhaseIdx)
    : -1;

  return (
    <div style={{
      background: isDark ? "#080808" : "#f4f4f6",
      borderBottom: `1px solid ${isDark ? "#1a1a1a" : "#d0d0d0"}`,
      padding: "10px 24px",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <button onClick={onHome}
        style={{
          background: "transparent",
          border: `1px solid ${isDark ? "#333" : "#b0b0b0"}`,
          borderRadius: 6, padding: "6px 10px",
          color: isDark ? "#aaa" : "#555", cursor: "pointer",
          fontSize: 11, fontWeight: 600, flexShrink: 0,
        }}>
        ← Home
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 0, flex: 1, overflow: "auto" }}>
        {PHASES.map((p, idx) => {
          const inPath = pathPhases.has(idx) || idx === 0;
          const isCurrent = idx === currentPhaseIdx;
          const inPathIdx = activePath?.phases.indexOf(idx) ?? -1;
          const isPast = inPathIdx >= 0 && inPathIdx < currentIndexInPath;
          const reachable = inPath && !isCurrent;

          const dimOpacity = inPath ? 1 : 0.25;
          const bg = isCurrent ? p.color : (isPast ? `${p.color}20` : "transparent");
          const color = isCurrent ? "#fff" : (inPath ? p.color : (isDark ? "#555" : "#999"));
          const border = isCurrent ? p.color : `${p.color}40`;

          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <button
                onClick={() => reachable && onJump?.(idx)}
                disabled={!reachable}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 12px", borderRadius: 16,
                  background: bg,
                  color, border: `1px solid ${border}`,
                  fontSize: 11, fontWeight: isCurrent ? 700 : 600,
                  cursor: reachable ? "pointer" : "default",
                  opacity: dimOpacity, transition: "all 0.15s",
                }}>
                <span style={{ fontSize: 9, fontWeight: 800, opacity: 0.85 }}>
                  {isPast ? "✓" : idx}
                </span>
                {p.label}
              </button>
              {idx < PHASES.length - 1 && (
                <span style={{
                  color: (isPast || isCurrent) ? p.color : (isDark ? "#333" : "#c0c0c0"),
                  margin: "0 2px", fontSize: 12, opacity: inPath ? 0.8 : 0.25,
                }}>→</span>
              )}
            </div>
          );
        })}
      </div>

      {activePath && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
          padding: "5px 12px", borderRadius: 14,
          background: `${activePath.color}15`,
          border: `1px solid ${activePath.color}40`,
        }}>
          <span style={{ color: activePath.color, fontSize: 11 }}>{activePath.icon}</span>
          <span style={{ color: activePath.color, fontSize: 11, fontWeight: 700 }}>
            {activePath.label}
          </span>
        </div>
      )}
    </div>
  );
}
