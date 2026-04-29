import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useWorkspace } from "../context/WorkspaceContext";

// The user's exact flow-graph visualization, promoted to a first-class screen.
// All 3 entry paths + 7 phases + Knowledge Artifact on one canvas.

const PHASE_COLORS = [
  { label: "Enter",     color: "#6366F1", bg: "#EEF2FF" },
  { label: "Connect",   color: "#2563EB", bg: "#EFF6FF" },
  { label: "Curate",    color: "#7C3AED", bg: "#F5F3FF" },
  { label: "Configure", color: "#DC2626", bg: "#FEF2F2" },
  { label: "Process",   color: "#EA580C", bg: "#FFF7ED" },
  { label: "Knowledge", color: "#16A34A", bg: "#F0FDF4" },
  { label: "Consume",   color: "#0891B2", bg: "#ECFEFF" },
];

const COL_W = 155;
const COL_GAP = 10;
const COL_START = 10;
const ROW_H = 56;
const NODE_W = 135;
const NODE_H = 48;

const cx = (c) => COL_START + c * (COL_W + COL_GAP);
const cy = (r) => 70 + r * ROW_H;

const NODES = [
  { id: "entry-connect", col: 0, row: 0.5, label: "Connect\nData Source", sub: "S3 · SharePoint · COS", type: "entry", pathColor: "#2563EB" },
  { id: "entry-upload",  col: 0, row: 3.5, label: "Upload\nDocuments",    sub: "Drag & drop files",     type: "entry", pathColor: "#7C3AED" },
  { id: "entry-browse",  col: 0, row: 6.5, label: "Browse\nKnowledge Hub",sub: "Discover existing KBs", type: "entry", pathColor: "#059669" },

  { id: "select-source", col: 1, row: 0, label: "Select Source",    sub: "S3 · SharePoint · COS · DP" },
  { id: "credentials",   col: 1, row: 1, label: "Establish Creds",  sub: "CloudFormation · IAM · OAuth" },
  { id: "scan",          col: 1, row: 2, label: "Scan & Inventory", sub: "Files · Types · Sizes" },
  { id: "register",      col: 1, row: 3, label: "Register Dataset", sub: "Dataspaces · Classification" },
  { id: "connect-ws",    col: 1, row: 4, label: "Connect to\nWorkspace", sub: "Env validation · Approval" },
  { id: "verify",        col: 1, row: 5, label: "Verify via TVA",   sub: "Creds · Browse · Health" },

  { id: "doc-select",    col: 2, row: 1.5, label: "Select\nDocuments",  sub: "Pick files for ingestion" },
  { id: "my-docs",       col: 2, row: 3.5, label: "My Documents",       sub: "List · Preview · Select" },
  { id: "direct-qa",     col: 2, row: 5,   label: "Direct Q&A",         sub: "Instant — no config", type: "action" },
  { id: "hub-list",      col: 2, row: 6.5, label: "Dataset Catalog",    sub: "Cards · Status · Filters" },
  { id: "request-access",col: 2, row: 8,   label: "Request Access",     sub: "Entitlement workflow" },

  { id: "splitting",  col: 3, row: 0.5, label: "Splitting",     sub: "Semantic · Token · Recursive" },
  { id: "embeddings", col: 3, row: 1.5, label: "Embeddings",    sub: "OpenAI · Cohere · HF · Titan" },
  { id: "vec-store",  col: 3, row: 2.5, label: "Vector Store",  sub: "OpenSearch · pgvector" },
  { id: "retriever",  col: 3, row: 3.5, label: "Retriever",     sub: "Hybrid · kNN · BM25" },
  { id: "review",     col: 3, row: 4.5, label: "Review Config", sub: "Summary · Deploy" },

  { id: "parse",    col: 4, row: 0.5, label: "Parse Docs",       sub: "OCR · Tables · Layout" },
  { id: "chunk",    col: 4, row: 1.5, label: "Create Chunks",    sub: "Semantic splitting" },
  { id: "embed",    col: 4, row: 2.5, label: "Generate\nEmbeddings", sub: "Batch vectorize" },
  { id: "write-os", col: 4, row: 3.5, label: "Write to\nOpenSearch", sub: "Create index" },
  { id: "entitle",  col: 4, row: 4.5, label: "Inherit\nEntitlements", sub: "Classification → Index" },

  { id: "knowledge", col: 5, row: 2.5, label: "Knowledge\nArtifact", sub: "VecDB · JSON · Graph · Taxonomy", type: "knowledge" },

  { id: "api",         col: 6, row: 1,   label: "REST API",         sub: "POST /retrieve",       type: "action" },
  { id: "agent",       col: 6, row: 2.5, label: "Agent Tool",       sub: "tools: [knowledge]",   type: "action" },
  { id: "console",     col: 6, row: 4,   label: "Console Query",    sub: "Interactive testing",  type: "action" },
  { id: "monitor",     col: 6, row: 5.5, label: "Monitor &\nMaintain", sub: "Health · Evals · Audit", type: "action" },
  { id: "query-exist", col: 6, row: 7,   label: "Query Existing",   sub: "Direct retrieval",     type: "action" },
];

const EDGES = [
  { from: "entry-connect", to: "select-source" },
  { from: "select-source", to: "credentials" },
  { from: "credentials",   to: "scan" },
  { from: "scan",          to: "register" },
  { from: "register",      to: "connect-ws" },
  { from: "connect-ws",    to: "verify" },
  { from: "verify",        to: "doc-select" },
  { from: "doc-select",    to: "splitting" },

  { from: "entry-upload",  to: "my-docs" },
  { from: "my-docs",       to: "direct-qa" },
  { from: "my-docs",       to: "splitting", label: "promote" },

  { from: "entry-browse",  to: "hub-list" },
  { from: "hub-list",      to: "request-access" },
  { from: "hub-list",      to: "query-exist" },
  { from: "request-access",to: "connect-ws", style: "dashed", label: "after approval" },

  { from: "splitting",  to: "embeddings" },
  { from: "embeddings", to: "vec-store" },
  { from: "vec-store",  to: "retriever" },
  { from: "retriever",  to: "review" },
  { from: "review",     to: "parse" },

  { from: "parse",    to: "chunk" },
  { from: "chunk",    to: "embed" },
  { from: "embed",    to: "write-os" },
  { from: "write-os", to: "entitle" },
  { from: "entitle",  to: "knowledge" },

  { from: "knowledge", to: "api" },
  { from: "knowledge", to: "agent" },
  { from: "knowledge", to: "console" },
  { from: "knowledge", to: "monitor" },

  { from: "monitor", to: "splitting", style: "feedback", label: "retune" },
];

const PATH_SETS = {
  connect: new Set(["entry-connect", "select-source", "credentials", "scan", "register", "connect-ws", "verify", "doc-select", "splitting", "embeddings", "vec-store", "retriever", "review", "parse", "chunk", "embed", "write-os", "entitle", "knowledge", "api", "agent", "console", "monitor"]),
  upload:  new Set(["entry-upload", "my-docs", "direct-qa", "splitting", "embeddings", "vec-store", "retriever", "review", "parse", "chunk", "embed", "write-os", "entitle", "knowledge", "api", "agent", "console"]),
  browse:  new Set(["entry-browse", "hub-list", "request-access", "connect-ws", "verify", "doc-select", "query-exist", "knowledge", "console", "splitting", "embeddings", "vec-store", "retriever", "review", "parse", "chunk", "embed", "write-os", "entitle"]),
};

function getPos(n)    { return { x: cx(n.col), y: cy(n.row) }; }
function getCenter(n) { const p = getPos(n); return { x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 }; }

function Arrow({ fromNode, toNode, style, label }) {
  const f = getCenter(fromNode);
  const to = getCenter(toNode);
  const dx = to.x - f.x;
  const dy = to.y - f.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;
  const ux = dx / len, uy = dy / len;
  const so = Math.min(len * 0.35, 40);
  const eo = Math.min(len * 0.35, 40);
  const sx = f.x + ux * so, sy = f.y + uy * so;
  const ex = to.x - ux * eo, ey = to.y - uy * eo;
  const isFeedback = style === "feedback";
  const isDashed = style === "dashed" || isFeedback;
  const color = isFeedback ? "#9CA3AF" : "#94A3B8";
  const as = 6;
  const ax1 = ex - ux * as - uy * as * 0.5;
  const ay1 = ey - uy * as + ux * as * 0.5;
  const ax2 = ex - ux * as + uy * as * 0.5;
  const ay2 = ey - uy * as - ux * as * 0.5;
  return (
    <g>
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={1.5} strokeDasharray={isDashed ? "5,3" : "none"} />
      <polygon points={`${ex},${ey} ${ax1},${ay1} ${ax2},${ay2}`} fill={color} />
      {label && <text x={(sx + ex) / 2} y={(sy + ey) / 2 - 5} textAnchor="middle" fontSize="8" fill="#9CA3AF" fontStyle="italic">{label}</text>}
    </g>
  );
}

export default function FlowGraphScreen() {
  const { t, isDark } = useTheme();
  const { goWorkspace, setConnectOpen } = useWorkspace();
  const returnFromScreen = goWorkspace;
  // Paths are now implicit — clicking a path label just returns to workspace,
  // and for "connect" we open the connect drawer en route.
  const startPath = (id) => {
    if (id === "connect") setConnectOpen(true);
    goWorkspace();
  };
  const [hoverPath, setHoverPath] = useState(null);
  const activeSet = hoverPath ? PATH_SETS[hoverPath] : null;

  const svgW = COL_START * 2 + 7 * (COL_W + COL_GAP);
  const svgH = cy(9) + 20;

  return (
    <div style={{ background: isDark ? "#0a0a0a" : "#ffffff", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${isDark ? "#1a1a1a" : "#E5E7EB"}`,
        padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={returnFromScreen}
            style={{ background: "transparent", border: `1px solid ${isDark ? "#333" : "#D1D5DB"}`, borderRadius: 6, padding: "6px 12px", color: isDark ? "#aaa" : "#374151", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            ← Back
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: isDark ? "#fff" : "#111827", margin: 0 }}>
              Knowledge — User Flow Graph
            </h1>
            <p style={{ fontSize: 12, color: isDark ? "#888" : "#6B7280", margin: "2px 0 0" }}>
              3 entry points → 7 phases → Knowledge Artifact. Hover a path to highlight.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "connect", label: "🔗 Enterprise Connect", color: "#2563EB" },
            { id: "upload",  label: "📄 Quick Upload",       color: "#7C3AED" },
            { id: "browse",  label: "🔍 Browse & Discover",  color: "#059669" },
          ].map((p) => (
            <button
              key={p.id}
              onMouseEnter={() => setHoverPath(p.id)}
              onMouseLeave={() => setHoverPath(null)}
              onClick={() => startPath(p.id)}
              style={{
                background: hoverPath === p.id ? `${p.color}10` : (isDark ? "#111" : "#F9FAFB"),
                border: `1px solid ${hoverPath === p.id ? p.color : (isDark ? "#333" : "#E5E7EB")}`,
                borderRadius: 6, padding: "6px 14px", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                color: hoverPath === p.id ? p.color : (isDark ? "#aaa" : "#6B7280"),
                transition: "all 0.15s",
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG */}
      <div style={{ overflow: "auto" }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" style={{ maxWidth: svgW, margin: "0 auto", display: "block" }}>
          {PHASE_COLORS.map((phase, i) => {
            const x = cx(i) - 5;
            const w = COL_W + 10;
            return (
              <g key={phase.label}>
                <rect x={x} y={0} width={w} height={svgH} fill={isDark ? "#0f0f0f" : phase.bg} />
                <line x1={x + w} y1={0} x2={x + w} y2={svgH} stroke={phase.color} strokeWidth="0.5" opacity="0.15" />
                <rect x={x} y={0} width={w} height={22} fill={phase.color} opacity={isDark ? "0.2" : "0.08"} />
                <text x={x + w / 2} y={15} textAnchor="middle" fontSize="10" fontWeight="700" fill={phase.color} opacity="0.85">
                  {phase.label.toUpperCase()}
                </text>
              </g>
            );
          })}

          {EDGES.map((e, i) => {
            const fn = NODES.find((n) => n.id === e.from);
            const tn = NODES.find((n) => n.id === e.to);
            if (!fn || !tn) return null;
            const dim = activeSet && (!activeSet.has(e.from) || !activeSet.has(e.to));
            return (
              <g key={i} opacity={dim ? 0.06 : 0.5} style={{ transition: "opacity 0.25s" }}>
                <Arrow fromNode={fn} toNode={tn} style={e.style} label={e.label} />
              </g>
            );
          })}

          {NODES.map((n) => {
            const pos = getPos(n);
            const isEntry = n.type === "entry";
            const isKnowledge = n.type === "knowledge";
            const dim = activeSet && !activeSet.has(n.id);

            let bg = isDark ? "#181818" : "#FFFFFF";
            let border = isDark ? "#333" : "#CBD5E1";
            let r = 8, sw = 1;
            let labelColor = isDark ? "#ddd" : "#1E293B";

            if (isEntry)     { border = n.pathColor; r = 24; sw = 2.5; labelColor = n.pathColor; }
            if (isKnowledge) { bg = isDark ? "#0a1f14" : "#ECFDF5"; border = "#16A34A"; r = 12; sw = 3; labelColor = "#16A34A"; }

            return (
              <g key={n.id} opacity={dim ? 0.1 : 1} style={{ transition: "opacity 0.25s" }}>
                <rect x={pos.x} y={pos.y} width={NODE_W} height={NODE_H} rx={r} fill={bg} stroke={border} strokeWidth={sw} />
                {isKnowledge && (
                  <rect x={pos.x + 3} y={pos.y + 3} width={NODE_W - 6} height={NODE_H - 6} rx={9} fill="none" stroke="#16A34A" strokeWidth="1" strokeDasharray="4,2" opacity="0.35" />
                )}
                {n.label.split("\n").map((line, li) => (
                  <text key={li} x={pos.x + NODE_W / 2} y={pos.y + 16 + li * 12}
                    textAnchor="middle" fontSize={isEntry || isKnowledge ? "11" : "10"}
                    fontWeight={isEntry || isKnowledge ? "700" : "600"} fill={labelColor}>
                    {line}
                  </text>
                ))}
                {n.sub && (
                  <text x={pos.x + NODE_W / 2} y={pos.y + NODE_H - 6} textAnchor="middle" fontSize="7.5" fill={isDark ? "#666" : "#9CA3AF"}>
                    {n.sub}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ borderTop: `1px solid ${isDark ? "#1a1a1a" : "#E5E7EB"}`, padding: "14px 24px", display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" }}>
        {[
          { id: "connect", label: "Enterprise Connect", desc: "Source → Creds → Scan → Register → Workspace → Verify → Configure → Process → Knowledge → Consume", color: "#2563EB" },
          { id: "upload",  label: "Quick Upload",       desc: "Upload → My Docs → Direct Q&A OR Configure → Process → Knowledge → Consume", color: "#7C3AED" },
          { id: "browse",  label: "Browse & Discover",  desc: "Catalog → Query existing OR Request access → detour into Connect", color: "#059669" },
        ].map((p) => (
          <button key={p.id} onClick={() => startPath(p.id)}
            style={{ maxWidth: 340, background: "transparent", border: "none", textAlign: "left", cursor: "pointer" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: p.color, marginBottom: 3 }}>{p.label} ↗</div>
            <div style={{ fontSize: 11, color: isDark ? "#777" : "#9CA3AF", lineHeight: 1.5 }}>{p.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
