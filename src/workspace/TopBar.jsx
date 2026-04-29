import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useWorkspace } from "../context/WorkspaceContext";

// TopBar — 3-section layout: left (brand + Agent Studio), center (workspace
// selector, absolutely centered), right (graph shortcuts + user chrome).

export default function TopBar() {
  const { user, setUser } = useAuth();
  const { t, isDark, toggleTheme } = useTheme();
  const { openFlowGraph, openObsidian, openAgentStudio, view } = useWorkspace();

  return (
    <div style={{
      height: 48, flexShrink: 0,
      background: t.sidebarBg, borderBottom: `1px solid ${t.border}`,
      display: "flex", alignItems: "center", padding: "0 12px",
      position: "relative",
    }}>
      {/* LEFT */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          background: "linear-gradient(135deg, #3a7aba 0%, #16A34A 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0,
        }}>K</div>
        <span style={{ color: t.textStrong, fontSize: 13, fontWeight: 700, letterSpacing: "-0.2px", whiteSpace: "nowrap" }}>
          Knowledge
        </span>
        <div style={{ marginLeft: 8 }}>
          <TabBtn active={view === "agent-studio"} onClick={openAgentStudio} label="🧠 Agent Studio" t={t} />
        </div>
      </div>

      {/* CENTER — absolutely centered so it stays in the middle regardless of side widths */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
      }}>
        <WorkspaceSelector t={t} />
      </div>

      {/* RIGHT */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
        <button onClick={openFlowGraph} style={topBtn(t)}>▦ Flow</button>
        <button onClick={openObsidian} style={topBtn(t)}>◉ Graph</button>

        <div style={{ width: 1, height: 22, background: t.border, margin: "0 4px" }} />

        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          background: `${user.color}15`, border: `1px solid ${user.color}40`,
          borderRadius: 14, padding: "3px 10px",
        }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: user.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff" }}>
            {user.userid.slice(-1).toUpperCase()}
          </div>
          <span style={{ color: user.color, fontSize: 11, fontWeight: 700 }}>{user.userid}</span>
        </div>

        <button onClick={toggleTheme} style={topBtn(t)}>{isDark ? "☀" : "🌙"}</button>
        <button onClick={() => setUser(null)} style={topBtn(t)}>Sign out</button>
      </div>
    </div>
  );
}

// ─── Workspace selector ───────────────────────────────────────────────────

function WorkspaceSelector({ t }) {
  const { workspaces, currentWorkspace, switchWorkspace, createWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const wrapRef = useRef();

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setCreating(false); setNewName(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const submitCreate = () => {
    if (newName.trim()) createWorkspace(newName.trim());
    setCreating(false); setNewName(""); setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          background: t.cardBg,
          border: `1.5px solid ${open ? "#3a7aba" : t.borderMid}`, borderRadius: 20,
          padding: "6px 16px 6px 12px", cursor: "pointer",
          fontSize: 12, fontWeight: 700, color: t.textStrong,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.borderColor = "#3a7aba"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = t.borderMid; }}>
        <span style={{ fontSize: 13 }}>📁</span>
        <span style={{ color: t.textMuted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          Workspace
        </span>
        <span style={{ color: t.textStrong, fontSize: 13, fontWeight: 700 }}>
          {currentWorkspace.name}
        </span>
        <span style={{ color: t.textMuted, fontSize: 9 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", zIndex: 60,
          minWidth: 260, background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10,
          boxShadow: "0 14px 34px rgba(0,0,0,0.18)", padding: 4,
        }}>
          <div style={{ padding: "7px 12px 4px", color: t.textGhost, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            Switch workspace
          </div>
          {workspaces.map((w) => {
            const isCurrent = w.id === currentWorkspace.id;
            return (
              <button key={w.id}
                onClick={() => { switchWorkspace(w.id); setOpen(false); }}
                style={{
                  display: "flex", width: "100%", alignItems: "center", gap: 8,
                  padding: "8px 12px", borderRadius: 6, border: "none",
                  background: isCurrent ? "#3a7aba18" : "transparent",
                  color: t.text, cursor: "pointer", fontSize: 13, textAlign: "left",
                }}>
                <span style={{ fontSize: 12, color: isCurrent ? "#3a7aba" : t.textDisabled, width: 14 }}>
                  {isCurrent ? "✓" : ""}
                </span>
                <span style={{ fontSize: 13 }}>📁</span>
                <span style={{ flex: 1, fontWeight: isCurrent ? 700 : 500 }}>{w.name}</span>
              </button>
            );
          })}

          <div style={{ height: 1, background: t.borderSubtle, margin: "6px 4px" }} />

          {creating ? (
            <div style={{ padding: "4px 6px", display: "flex", gap: 4, alignItems: "center" }}>
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitCreate(); if (e.key === "Escape") { setCreating(false); setNewName(""); } }}
                placeholder="Workspace name"
                style={{
                  flex: 1, background: t.inputBg, border: `1px solid ${t.borderSubtle}`, borderRadius: 5,
                  padding: "6px 10px", color: t.text, fontSize: 12, outline: "none",
                }} />
              <button onClick={submitCreate}
                style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 4, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                ✓
              </button>
            </div>
          ) : (
            <button onClick={() => { setCreating(true); setNewName(""); }}
              style={{
                display: "flex", width: "100%", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 6, border: "none",
                background: "transparent", color: "#3a7aba",
                cursor: "pointer", fontSize: 12, fontWeight: 700, textAlign: "left",
              }}>
              + New workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const topBtn = (t) => ({
  background: "transparent",
  border: `1px solid ${t.borderSubtle}`,
  borderRadius: 5,
  padding: "4px 10px",
  color: t.textMuted, cursor: "pointer",
  fontSize: 11, fontWeight: 600,
});

function TabBtn({ active, onClick, label, t }) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? "#3a7aba" : "transparent",
        border: `1px solid ${active ? "#3a7aba" : t.borderSubtle}`,
        borderRadius: 5, padding: "4px 12px",
        color: active ? "#fff" : t.textMuted,
        cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 600,
      }}>
      {label}
    </button>
  );
}
