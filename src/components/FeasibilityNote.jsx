import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

// ─── Inline feasibility badge + hover panel ───────────────────────────────────
// Uses position:fixed so the panel escapes any overflow:hidden ancestor.
// Optional: align="right" opens panel to the right of the badge instead of below.
export default function FeasibilityNote({ title, verdict, verdictType = "success", bullets, align = "left" }) {
  const { t, isDark } = useTheme();
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const badgeRef = useRef(null);

  const accentColor = verdictType === "success" ? t.green : t.blue;
  const panelBg = isDark ? "#0e1825" : "#f0f4fc";
  const panelBorder = isDark ? "#2a4a6a" : "#a0b8d8";
  const headerBg = isDark ? "#0a1520" : "#dce8f8";

  const updatePos = () => {
    if (!badgeRef.current) return;
    const r = badgeRef.current.getBoundingClientRect();
    if (align === "right") {
      setPos({ top: r.top + window.scrollY, left: r.right + 8 });
    } else {
      setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX });
    }
  };

  const handleMouseEnter = () => {
    updatePos();
    setShow(true);
  };

  // Keep panel in view if it would overflow the right edge
  const PANEL_W = 370;

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        ref={badgeRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
        style={{
          display: "inline-flex", alignItems: "center", gap: "4px",
          background: isDark ? `${accentColor}15` : `${accentColor}20`,
          border: `1px solid ${accentColor}50`,
          borderRadius: "4px", padding: "2px 7px",
          color: accentColor, fontSize: "10px", fontWeight: 700,
          cursor: "help", userSelect: "none", letterSpacing: "0.3px",
        }}
      >
        ✓ Feasibility
      </span>

      {show && (
        <div
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          style={{
            position: "fixed",
            zIndex: 9999,
            top: pos.top,
            left: Math.min(pos.left, window.innerWidth - PANEL_W - 12),
            width: `${PANEL_W}px`,
            background: panelBg,
            border: `1px solid ${panelBorder}`,
            borderRadius: "10px",
            boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.7)" : "0 8px 32px rgba(0,0,0,0.18)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ background: headerBg, padding: "12px 16px", borderBottom: `1px solid ${panelBorder}` }}>
            <div style={{ color: isDark ? "#ffffff" : "#111111", fontSize: "13px", fontWeight: 800, marginBottom: "3px" }}>{title}</div>
            <div style={{ color: accentColor, fontSize: "11px", fontWeight: 700 }}>
              {verdictType === "success" ? "✓ " : "ⓘ "}
              {verdict}
            </div>
          </div>

          {/* Bullets */}
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {bullets.map((b, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <span style={{ color: accentColor, fontSize: "11px", flexShrink: 0, marginTop: "1px" }}>›</span>
                <span style={{ color: isDark ? "#c0cce0" : "#333333", fontSize: "11px", lineHeight: "1.5" }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
