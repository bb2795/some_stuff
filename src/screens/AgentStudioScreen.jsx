import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useWorkspace, KB_CATALOG } from "../context/WorkspaceContext";
import { listFiles, uploadFile } from "../services/ragApi";

const MONO = "'IBM Plex Mono', monospace";

// Agent Studio — a separate top-level tab. Visual node-graph canvas on the
// left, agent config sidebar on the right. The Knowledge section has
// "+ CREATE NEW" which opens our full knowledge-creation flow (Connect S3,
// Drag & Drop → extraction, Browse existing).

export default function AgentStudioScreen() {
  const { user, setUser } = useAuth();
  const { t, isDark, toggleTheme } = useTheme();
  const {
    goWorkspace, setConnectOpen, openExtraction, setFileBlob,
    agentKnowledgeIds, addAgentKnowledge, removeAgentKnowledge,
    userKBs,
  } = useWorkspace();

  const [knowledgeCreateOpen, setKnowledgeCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState("menu"); // menu | upload | browse
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesErr, setFilesErr] = useState(null);

  const refreshFiles = () => {
    setFilesLoading(true); setFilesErr(null);
    listFiles(user)
      .then((f) => { setFiles(f); setFilesLoading(false); })
      .catch((e) => { setFilesErr(e.message); setFilesLoading(false); });
  };
  useEffect(() => { refreshFiles(); }, [user]);

  // Drop & upload → seed blob cache → open extraction scoped to the new file
  const handleDropUpload = async (fileList) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    for (const f of arr) {
      try {
        const result = await uploadFile(user, f);
        setFileBlob(result.file_id, f);
        addAgentKnowledge(result.file_id);
        refreshFiles();
        // Open extraction for the first uploaded file
        const fresh = await listFiles(user);
        const meta = fresh.find((x) => (x.file_id ?? x.id) === result.file_id);
        setKnowledgeCreateOpen(false);
        openExtraction(f, meta || { file_id: result.file_id, original_name: f.name });
        return;
      } catch (e) {
        setFilesErr(e.message);
      }
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: t.pageBg, color: t.text,
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* ── Top nav bar ── */}
      <div style={{
        height: 40, flexShrink: 0, background: t.sidebarBg, borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", padding: "0 16px", gap: 20,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          background: "linear-gradient(135deg, #3a7aba 0%, #16A34A 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 12, fontWeight: 800,
        }}>K</div>

        {["Knowledge", "Catalog", "Manager", "Studio", "Products and Services", "Apps", "Resources"].map((item) => (
          <button key={item}
            onClick={() => { if (item === "Knowledge") goWorkspace(); }}
            style={{
              background: "transparent", border: "none", padding: "4px 2px",
              color: item === "Studio" ? t.textStrong : t.textMuted,
              fontSize: 12, fontWeight: item === "Studio" ? 700 : 500,
              cursor: "pointer", position: "relative",
              borderBottom: item === "Studio" ? `2px solid #3a7aba` : "2px solid transparent",
            }}>
            {item}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <div style={{
          background: `${user.color}15`, border: `1px solid ${user.color}40`,
          borderRadius: 14, padding: "3px 10px", display: "flex", alignItems: "center", gap: 6,
        }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: user.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff" }}>
            {user.userid.slice(-1).toUpperCase()}
          </div>
          <span style={{ color: user.color, fontSize: 11, fontWeight: 700 }}>{user.userid}</span>
        </div>
        <button onClick={toggleTheme} style={chromeBtn(t)}>{isDark ? "☀" : "🌙"}</button>
      </div>

      {/* ── Sub-nav ── */}
      <div style={{
        height: 34, flexShrink: 0, background: t.pageBg, borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", padding: "0 16px", gap: 18,
      }}>
        {["Studio", "Agents"].map((item, i) => (
          <span key={item} style={{
            color: i === 1 ? t.textStrong : t.textMuted,
            fontSize: 11, fontWeight: i === 1 ? 700 : 500,
          }}>
            {i > 0 && <span style={{ color: t.textDisabled, marginRight: 18 }}>›</span>}
            {item}
          </span>
        ))}
      </div>

      {/* ── Page header ── */}
      <div style={{
        height: 52, flexShrink: 0, background: t.sidebarBg, borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", padding: "0 16px", gap: 14,
      }}>
        <button onClick={goWorkspace} style={{
          background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 5,
          padding: "5px 10px", color: t.textMuted, cursor: "pointer", fontSize: 11,
        }}>←</button>
        <span style={{ color: t.textStrong, fontSize: 15, fontWeight: 700 }}>
          Multi-language Translation Agent
        </span>
        <button style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 11 }}>✎</button>
        <span style={{ color: t.textDisabled, fontSize: 11 }}>|</span>
        <span style={{ color: t.textMuted, fontSize: 11, fontFamily: MONO }}>V1.0</span>

        <div style={{ flex: 1 }} />

        {["BUILD", "EVALUATIONS", "⚙ SETTINGS", "♥ HEALTH"].map((tab, i) => (
          <button key={tab} style={{
            background: i === 0 ? "#3a7aba15" : "transparent",
            border: `1px solid ${i === 0 ? "#3a7aba" : "transparent"}`,
            borderRadius: 5, padding: "5px 12px",
            color: i === 0 ? "#3a7aba" : t.textMuted,
            fontSize: 11, fontWeight: i === 0 ? 700 : 600, cursor: "pointer",
            letterSpacing: 0.4,
          }}>
            {tab}
          </button>
        ))}

        <button style={{
          background: "#16A34A", color: "#fff", border: "none", borderRadius: 5,
          padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer",
          letterSpacing: 0.4,
        }}>
          ▷ TEST YOUR AGENT
        </button>
        <button onClick={() => setUser(null)} style={chromeBtn(t)}>Sign out</button>
      </div>

      {/* ── Body: canvas + right sidebar ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <AgentCanvas t={t} isDark={isDark} />
        <AgentSidebar
          t={t}
          onOpenKnowledgeCreate={() => { setCreateMode("menu"); setKnowledgeCreateOpen(true); }}
          files={files}
          agentKnowledgeIds={agentKnowledgeIds}
          onRemoveKnowledge={removeAgentKnowledge}
          userKBs={userKBs}
        />
      </div>

      {/* ── Knowledge Create Drawer ── */}
      {knowledgeCreateOpen && (
        <KnowledgeCreateDrawer
          t={t}
          mode={createMode} setMode={setCreateMode}
          onClose={() => setKnowledgeCreateOpen(false)}
          onOpenConnect={() => { setConnectOpen(true); setKnowledgeCreateOpen(false); }}
          onDropUpload={handleDropUpload}
          files={files} filesLoading={filesLoading} filesErr={filesErr}
          agentKnowledgeIds={agentKnowledgeIds}
          onAddKnowledge={addAgentKnowledge}
          userKBs={userKBs}
        />
      )}
    </div>
  );
}

const chromeBtn = (t) => ({
  background: "transparent", border: `1px solid ${t.borderSubtle}`, borderRadius: 5,
  padding: "4px 10px", color: t.textMuted, cursor: "pointer", fontSize: 11, fontWeight: 600,
});

// ─── Canvas ────────────────────────────────────────────────────────────────

function AgentCanvas({ t, isDark }) {
  const bg = isDark ? "#0a0a0a" : "#fafbfc";
  const grid = isDark ? "#141414" : "#eceef2";

  // Node positions (SVG coordinates)
  const N = {
    root:    { x: 380, y: 40,  w: 280, h: 88, label: "Orchestrator / Router Agent", desc: "Routes incoming requests to the correct translator.", tags: ["Root", "LLM"], primary: true },
    summar:  { x: 380, y: 200, w: 280, h: 72, label: "Markdown Summarizer",        desc: "Summarizes long inputs before routing.", tags: ["LLM"] },
    hindi:   { x: 140, y: 340, w: 280, h: 72, label: "Hindi Translator",           desc: "Translates EN → Hindi.", tags: ["LLM"] },
    spanish: { x: 620, y: 340, w: 280, h: 72, label: "Spanish Translator",         desc: "Translates EN → Spanish.", tags: ["LLM"] },
    hModel:  { x: 80,  y: 480, w: 180, h: 48, label: "GPT-4o mini",                sub: "Model" },
    hTool:   { x: 280, y: 480, w: 180, h: 48, label: "Search CDAOSDK Docs",        sub: "Tool" },
    sModel:  { x: 560, y: 480, w: 180, h: 48, label: "GPT-4o mini",                sub: "Model" },
    sTool:   { x: 760, y: 480, w: 180, h: 48, label: "Search CDAOSDK Docs",        sub: "Tool" },
  };

  const edges = [
    { from: N.root,  to: N.summar, label: "Sequence" },
    { from: N.summar, to: N.hindi },
    { from: N.summar, to: N.spanish },
    { from: N.hindi, to: N.hModel,  dashed: true },
    { from: N.hindi, to: N.hTool,   dashed: true },
    { from: N.spanish, to: N.sModel, dashed: true },
    { from: N.spanish, to: N.sTool,  dashed: true },
  ];

  const W = 1040, H = 580;

  return (
    <div style={{ flex: 1, overflow: "auto", background: bg, position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
        <defs>
          <pattern id="as-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke={grid} strokeWidth="0.5" />
          </pattern>
          <marker id="as-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={isDark ? "#666" : "#9ca3af"} />
          </marker>
        </defs>
        <rect width={W} height={H} fill="url(#as-grid)" />

        {edges.map((e, i) => <Edge key={i} from={e.from} to={e.to} label={e.label} dashed={e.dashed} isDark={isDark} />)}
        {Object.values(N).map((n, i) => <Node key={i} node={n} isDark={isDark} />)}
      </svg>
    </div>
  );
}

function Edge({ from, to, label, dashed, isDark }) {
  const fx = from.x + from.w / 2, fy = from.y + from.h;
  const tx = to.x + to.w / 2,     ty = to.y;
  const mid = (fy + ty) / 2;
  const path = `M ${fx} ${fy} C ${fx} ${mid}, ${tx} ${mid}, ${tx} ${ty}`;
  const stroke = isDark ? "#666" : "#9ca3af";
  return (
    <g>
      <path d={path} stroke={stroke} strokeWidth="1.5" fill="none"
        strokeDasharray={dashed ? "4,4" : "none"} markerEnd="url(#as-arrow)" />
      {label && (
        <g>
          <rect x={(fx + tx) / 2 - 32} y={mid - 9} width="64" height="18" rx="9"
            fill={isDark ? "#141414" : "#fff"} stroke={stroke} strokeWidth="1" />
          <text x={(fx + tx) / 2} y={mid + 4} textAnchor="middle" fontSize="10"
            fill={isDark ? "#999" : "#6b7280"} fontWeight="600">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

function Node({ node, isDark }) {
  const primary = node.primary;
  const stroke = primary ? "#3a7aba" : (isDark ? "#333" : "#d1d5db");
  const fill = isDark ? "#111" : "#ffffff";
  return (
    <g>
      <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="10"
        fill={fill} stroke={stroke} strokeWidth={primary ? 2 : 1.2} />
      {/* tags */}
      {node.tags && (
        <g>
          {node.tags.map((tag, i) => {
            const isRoot = tag === "Root";
            return (
              <g key={tag} transform={`translate(${node.x + 12 + i * 54} ${node.y + 12})`}>
                <rect width={isRoot ? 42 : 34} height="16" rx="8"
                  fill={isRoot ? "#3a7aba" : "transparent"}
                  stroke={isRoot ? "#3a7aba" : (isDark ? "#444" : "#cbd5e1")} strokeWidth="1" />
                <text x={isRoot ? 21 : 17} y={11} textAnchor="middle" fontSize="9"
                  fill={isRoot ? "#fff" : (isDark ? "#aaa" : "#64748b")} fontWeight="700">
                  {tag}
                </text>
              </g>
            );
          })}
        </g>
      )}
      {/* label */}
      <text x={node.x + 16} y={node.y + (node.tags ? 46 : 22)}
        fontSize={node.sub ? 12 : 13} fontWeight="700"
        fill={isDark ? "#fff" : "#111"}>
        {node.label}
      </text>
      {/* desc */}
      {node.desc && (
        <text x={node.x + 16} y={node.y + 62} fontSize="10"
          fill={isDark ? "#888" : "#6b7280"}>
          {node.desc.length > 50 ? node.desc.slice(0, 48) + "…" : node.desc}
        </text>
      )}
      {node.sub && (
        <text x={node.x + 16} y={node.y + 36} fontSize="9" fontWeight="600"
          fill={isDark ? "#888" : "#94a3b8"} style={{ textTransform: "uppercase", letterSpacing: 1 }}>
          {node.sub}
        </text>
      )}
      {/* connection dots */}
      {!node.sub && (
        <g>
          {["Sub Agent", "Models", "Tools", "Sources"].map((lbl, i) => (
            <g key={lbl} transform={`translate(${node.x + 16 + i * 70} ${node.y + node.h - 10})`}>
              <circle cx="0" cy="0" r="2.5" fill={stroke} />
              <text x="7" y="3" fontSize="8" fill={isDark ? "#888" : "#94a3b8"}>{lbl}</text>
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

// ─── Right sidebar ─────────────────────────────────────────────────────────

function AgentSidebar({ t, onOpenKnowledgeCreate, files, agentKnowledgeIds, onRemoveKnowledge, userKBs }) {
  const [query, setQuery] = useState("");
  const [loop, setLoop] = useState(1);
  const [open, setOpen] = useState({ output: false, subagent: false, tools: false, memory: false, models: false, toolsN: true, knowledge: true });

  const knowledgeFiles = files.filter((f) => agentKnowledgeIds.includes(f.file_id ?? f.id));
  const filteredKnowledge = query
    ? knowledgeFiles.filter((f) => (f.original_name ?? f.filename ?? "").toLowerCase().includes(query.toLowerCase()))
    : knowledgeFiles;

  return (
    <div style={{
      width: 360, flexShrink: 0,
      background: t.sidebarBg, borderLeft: `1px solid ${t.border}`,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ color: t.textStrong, fontSize: 13, fontWeight: 700 }}>
          Orchestrator / Router Agent
        </div>
        <div style={{ color: t.textMuted, fontSize: 11, marginTop: 3 }}>
          Description
        </div>
        <input type="text" defaultValue="Routes incoming requests to the correct translator."
          style={{
            width: "100%", boxSizing: "border-box", marginTop: 4,
            background: t.inputBg, border: `1px solid ${t.borderSubtle}`, borderRadius: 5,
            padding: "6px 10px", color: t.text, fontSize: 11, outline: "none",
          }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <span style={{ color: t.textMuted, fontSize: 11 }}>Loop Count</span>
          <input type="number" value={loop} onChange={(e) => setLoop(+e.target.value || 1)}
            style={{
              width: 56, background: t.inputBg, border: `1px solid ${t.borderSubtle}`, borderRadius: 5,
              padding: "5px 8px", color: t.text, fontSize: 11, outline: "none",
            }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <ConfigSection title="Output Configuration" open={open.output} onToggle={() => setOpen((o) => ({ ...o, output: !o.output }))} t={t} />
        <ConfigSection title="Sub-agent Configuration" open={open.subagent} onToggle={() => setOpen((o) => ({ ...o, subagent: !o.subagent }))} t={t} />
        <ConfigSection title="Tool Management" open={open.tools} onToggle={() => setOpen((o) => ({ ...o, tools: !o.tools }))} t={t} />
        <ConfigSection title="Memory Management" open={open.memory} onToggle={() => setOpen((o) => ({ ...o, memory: !o.memory }))} t={t} />
        <ConfigSection title="Models" count={1} open={open.models} onToggle={() => setOpen((o) => ({ ...o, models: !o.models }))} t={t} />
        <ConfigSection title="Tools" count={2} open={open.toolsN} onToggle={() => setOpen((o) => ({ ...o, toolsN: !o.toolsN }))} t={t} />

        {/* Knowledge section */}
        <ConfigSection title="Knowledge" count={knowledgeFiles.length + userKBs.length} open={open.knowledge} onToggle={() => setOpen((o) => ({ ...o, knowledge: !o.knowledge }))} t={t}>
          <div style={{ padding: "4px 12px 12px" }}>
            {/* Info banner */}
            <div style={{
              background: "#2563EB15", border: `1px solid #2563EB40`, borderRadius: 5,
              padding: "7px 10px", display: "flex", alignItems: "flex-start", gap: 6,
              color: "#2563EB", fontSize: 10, lineHeight: 1.4, marginBottom: 8,
            }}>
              <span>ℹ</span>
              <span>We currently only support <strong>CADs-enabled S3</strong> Knowledge.</span>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 8 }}>
              <span style={{ position: "absolute", left: 9, top: 6, color: t.textMuted, fontSize: 11 }}>🔍</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search connected S3"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: t.inputBg, border: `1px solid ${t.borderSubtle}`, borderRadius: 5,
                  padding: "5px 10px 5px 28px", color: t.text, fontSize: 11, outline: "none",
                }} />
            </div>

            {/* Knowledge list or empty state */}
            {filteredKnowledge.length === 0 && userKBs.length === 0 ? (
              <div style={{
                background: t.cardBg, border: `1px dashed ${t.borderSubtle}`, borderRadius: 6,
                padding: "16px 12px", textAlign: "center",
              }}>
                <span style={{ color: t.textMuted, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <span style={{ color: "#2563EB" }}>ℹ</span>
                  No results found yet
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                {userKBs.map((kb) => (
                  <KnowledgeRow key={kb.id} icon="🗂" color="#16A34A"
                    name={kb.name} meta={`KB · ${kb.docIds?.length || 0} docs`} t={t} />
                ))}
                {filteredKnowledge.map((f) => {
                  const id = f.file_id ?? f.id;
                  const name = f.original_name ?? f.filename ?? `File ${id}`;
                  return (
                    <KnowledgeRow key={id} icon="▤" color="#7C3AED"
                      name={name} meta={`Document · id ${id}`}
                      onRemove={() => onRemoveKnowledge(id)} t={t} />
                  );
                })}
              </div>
            )}

            {/* + CREATE NEW */}
            <button onClick={onOpenKnowledgeCreate}
              style={{
                width: "100%", background: "#3a7aba", color: "#fff", border: "none",
                borderRadius: 5, padding: "8px 12px", fontSize: 11, fontWeight: 700,
                cursor: "pointer", letterSpacing: 0.4,
              }}>
              + CREATE NEW
            </button>
          </div>
        </ConfigSection>
      </div>
    </div>
  );
}

function ConfigSection({ title, count, open, onToggle, t, children }) {
  return (
    <div style={{ borderBottom: `1px solid ${t.borderFaint}` }}>
      <button onClick={onToggle}
        style={{
          width: "100%", background: "transparent", border: "none",
          padding: "11px 14px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          color: t.text, fontSize: 12, fontWeight: 600, textAlign: "left",
        }}>
        <span style={{ color: t.textMuted, fontSize: 9 }}>{open ? "▾" : "▸"}</span>
        <span style={{ flex: 1 }}>{title}</span>
        {count != null && <span style={{ color: t.textDisabled, fontSize: 10, fontFamily: MONO }}>{count}</span>}
      </button>
      {open && children}
    </div>
  );
}

function KnowledgeRow({ icon, color, name, meta, onRemove, t }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 10px", background: t.cardBg,
        border: `1px solid ${t.border}`, borderRadius: 5,
      }}>
      <span style={{ color, fontSize: 12, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: t.text, fontSize: 11, fontWeight: 600, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ color: t.textDisabled, fontSize: 9, fontFamily: MONO }}>{meta}</div>
      </div>
      {hover && onRemove && (
        <button onClick={onRemove} style={{ background: "transparent", border: "none", color: t.textDisabled, cursor: "pointer", fontSize: 11, padding: 0 }}>✕</button>
      )}
    </div>
  );
}

// ─── Knowledge Create Drawer ──────────────────────────────────────────────

function KnowledgeCreateDrawer({ t, mode, setMode, onClose, onOpenConnect, onDropUpload, files, filesLoading, filesErr, agentKnowledgeIds, onAddKnowledge, userKBs }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
      <div style={{
        position: "relative", width: "min(640px, 92vw)", height: "100vh",
        background: t.pageBg, borderLeft: `1px solid ${t.border}`,
        boxShadow: "-10px 0 40px rgba(0,0,0,0.35)",
        display: "flex", flexDirection: "column",
        animation: "ksSlide 0.2s ease-out",
      }}>
        <style>{`@keyframes ksSlide { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${t.border}`, background: t.sidebarBg, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 5, padding: "5px 10px", color: t.textMuted, cursor: "pointer", fontSize: 12 }}>✕</button>
          <div style={{ flex: 1 }}>
            <div style={{ color: t.textStrong, fontSize: 14, fontWeight: 800 }}>Create Knowledge Source</div>
            <div style={{ color: t.textMuted, fontSize: 11 }}>
              Attach documents, sources, or existing KBs to this agent.
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {mode === "menu"   && <MenuMode t={t} setMode={setMode} onOpenConnect={onOpenConnect} />}
          {mode === "upload" && <UploadMode t={t} setMode={setMode} onDropUpload={onDropUpload} />}
          {mode === "browse" && <BrowseMode t={t} setMode={setMode} files={files} filesLoading={filesLoading} filesErr={filesErr} agentKnowledgeIds={agentKnowledgeIds} onAddKnowledge={onAddKnowledge} userKBs={userKBs} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

function MenuMode({ t, setMode, onOpenConnect }) {
  return (
    <div style={{ padding: "26px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
      <CreateOption icon="🔗" color="#2563EB"
        title="Connect to S3"
        desc="Connect a CAD-enabled S3 bucket. IAM cross-account role with read-only scope."
        onClick={onOpenConnect}
        t={t} />
      <CreateOption icon="📄" color="#7C3AED"
        title="Drag & Drop Documents"
        desc="Upload files and step through the full extraction flow: preview · parse · chunk · embed · final graph."
        onClick={() => setMode("upload")}
        t={t} />
      <CreateOption icon="🗂" color="#16A34A"
        title="Browse Existing"
        desc="Add documents or knowledge bases that are already in your workspace."
        onClick={() => setMode("browse")}
        t={t} />
    </div>
  );
}

function CreateOption({ icon, color, title, desc, onClick, t }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: t.cardBg,
        border: `2px solid ${hover ? color : t.border}`,
        borderRadius: 10, padding: "16px 18px", cursor: "pointer",
        textAlign: "left", display: "flex", gap: 14, alignItems: "flex-start",
        transition: "all 0.15s",
        boxShadow: hover ? `0 8px 24px ${color}20` : "none",
      }}>
      <div style={{
        width: 40, height: 40, borderRadius: 20,
        background: `${color}18`, border: `1px solid ${color}50`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: t.textStrong, fontSize: 14, fontWeight: 700 }}>{title}</div>
        <div style={{ color: t.textMuted, fontSize: 12, lineHeight: 1.55, marginTop: 4 }}>{desc}</div>
      </div>
      <div style={{ color, fontSize: 16, alignSelf: "center" }}>→</div>
    </button>
  );
}

function UploadMode({ t, setMode, onDropUpload }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  return (
    <div style={{ padding: "20px 24px" }}>
      <button onClick={() => setMode("menu")} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 11, padding: 0, marginBottom: 14 }}>
        ← Back
      </button>

      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onDropUpload(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${drag ? "#7C3AED" : t.borderMid}`,
          borderRadius: 14, padding: "60px 24px", textAlign: "center", cursor: "pointer",
          background: drag ? "rgba(124,58,237,0.08)" : t.cardBg, transition: "all 0.15s",
        }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>📂</div>
        <div style={{ color: t.textStrong, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
          {drag ? "Drop to upload" : "Drop files here or click to browse"}
        </div>
        <div style={{ color: t.textMuted, fontSize: 12 }}>
          On drop, you'll step through: preview · parse · chunk · embed · index · final graph.
        </div>
        <input ref={ref} type="file" multiple style={{ display: "none" }}
          onChange={(e) => { onDropUpload(e.target.files); e.target.value = ""; }} />
      </div>

      <div style={{
        marginTop: 16, background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14,
      }}>
        <div style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          What happens next
        </div>
        <div style={{ display: "flex", gap: 0, alignItems: "center", flexWrap: "wrap" }}>
          {["Preview", "Parse / Extract", "Chunks", "Nodes", "Embedding", "Final graph"].map((s, i) => (
            <span key={s} style={{ display: "flex", alignItems: "center" }}>
              <span style={{
                background: ["#3a7aba", "#EA580C", "#7C3AED", "#0891B2", "#2563EB", "#16A34A"][i] + "20",
                color: ["#3a7aba", "#EA580C", "#7C3AED", "#0891B2", "#2563EB", "#16A34A"][i],
                border: `1px solid ${["#3a7aba", "#EA580C", "#7C3AED", "#0891B2", "#2563EB", "#16A34A"][i]}50`,
                fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 10,
              }}>{s}</span>
              {i < 5 && <span style={{ color: t.textDisabled, margin: "0 3px", fontSize: 10 }}>→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrowseMode({ t, setMode, files, filesLoading, filesErr, agentKnowledgeIds, onAddKnowledge, userKBs, onClose }) {
  return (
    <div style={{ padding: "20px 24px" }}>
      <button onClick={() => setMode("menu")} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 11, padding: 0, marginBottom: 14 }}>
        ← Back
      </button>

      {userKBs.length > 0 && (
        <>
          <div style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Your Knowledge Bases
          </div>
          {userKBs.map((kb) => (
            <div key={kb.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 6, marginBottom: 5,
            }}>
              <span style={{ fontSize: 14, color: "#16A34A" }}>🗂</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: t.text, fontSize: 12, fontWeight: 600 }}>{kb.name}</div>
                <div style={{ color: t.textMuted, fontSize: 10, fontFamily: MONO }}>{kb.docIds?.length || 0} docs · {kb.chunk}</div>
              </div>
              <button style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 4, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                Attach
              </button>
            </div>
          ))}
          <div style={{ height: 16 }} />
        </>
      )}

      <div style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        My Documents
      </div>
      {filesLoading && <div style={{ color: t.textMuted, fontSize: 12 }}>Loading…</div>}
      {filesErr && (
        <div style={{ background: "#3a1010", border: "1px solid #5a1a1a", borderRadius: 5, padding: "8px 12px", color: "#ff8080", fontSize: 11 }}>
          {filesErr}
        </div>
      )}
      {!filesLoading && files.length === 0 && !filesErr && (
        <div style={{ color: t.textDisabled, fontSize: 12 }}>No documents — upload some first.</div>
      )}
      {!filesLoading && files.map((f) => {
        const id = f.file_id ?? f.id;
        const name = f.original_name ?? f.filename ?? `File ${id}`;
        const attached = agentKnowledgeIds.includes(id);
        return (
          <div key={id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 6, marginBottom: 5,
          }}>
            <span style={{ fontSize: 14, color: "#7C3AED" }}>▤</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: t.text, fontSize: 12, fontWeight: 600, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
              <div style={{ color: t.textMuted, fontSize: 10, fontFamily: MONO }}>id {id}</div>
            </div>
            {attached ? (
              <span style={{ background: "#16A34A20", color: "#16A34A", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 4 }}>✓ Attached</span>
            ) : (
              <button onClick={() => { onAddKnowledge(id); }}
                style={{ background: "#3a7aba", color: "#fff", border: "none", borderRadius: 4, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                Attach
              </button>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 5, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          Done
        </button>
      </div>
    </div>
  );
}
