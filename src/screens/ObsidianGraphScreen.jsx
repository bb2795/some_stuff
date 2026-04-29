import { useMemo, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useWorkspace } from "../context/WorkspaceContext";

// Obsidian-style knowledge graph. Force-simulated layout of docs ← chunks,
// cross-linked by semantic similarity to topics. Pan/zoom + hover highlight.

const DEMO_DOCS = [
  { id: "d1", label: "q3-risk-report.pdf",         topic: "Risk" },
  { id: "d2", label: "ccb-credit-exposures.xlsx",  topic: "Risk" },
  { id: "d3", label: "var-backtest-2025.md",       topic: "Risk" },
  { id: "d4", label: "trade-ops-playbook.pdf",     topic: "Ops" },
  { id: "d5", label: "settlement-runbook.md",      topic: "Ops" },
  { id: "d6", label: "macro-research-2025q3.pdf",  topic: "Research" },
  { id: "d7", label: "equities-reference-data.csv", topic: "Research" },
];
const DEMO_TOPICS = [
  { id: "t-risk",     label: "Risk",     color: "#DC2626" },
  { id: "t-ops",      label: "Ops",      color: "#EA580C" },
  { id: "t-research", label: "Research", color: "#2563EB" },
];

function buildGraph(docs, topics, nodes) {
  const graph = { nodes: [], edges: [] };

  // Topic hubs
  topics.forEach((t) => graph.nodes.push({ id: t.id, label: t.label, type: "topic", color: t.color, r: 18 }));

  // Docs connect to their topic
  docs.forEach((d) => {
    graph.nodes.push({ id: d.id, label: d.label, type: "doc", color: "#16A34A", r: 10 });
    const topic = topics.find((t) => t.label === d.topic);
    if (topic) graph.edges.push({ from: d.id, to: topic.id, kind: "doc-topic" });
  });

  // Chunks attach to docs; pipeline nodes provide realism if present
  const docChunkCount = 5;
  docs.forEach((d) => {
    for (let i = 0; i < docChunkCount; i++) {
      const cid = `${d.id}-c${i}`;
      const label = nodes?.[i]?.label || `chunk-${i}`;
      graph.nodes.push({ id: cid, label, type: "chunk", color: "#7C3AED", r: 5 });
      graph.edges.push({ from: cid, to: d.id, kind: "chunk-doc" });
    }
  });

  // Cross-doc semantic links (every other pair — demo)
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      if ((i + j) % 3 === 0) {
        graph.edges.push({ from: docs[i].id, to: docs[j].id, kind: "semantic" });
      }
    }
  }

  return graph;
}

function simulate(graph, width, height, iters = 280) {
  const N = graph.nodes.length;
  const pos = graph.nodes.map((n, i) => {
    const a = (i / N) * Math.PI * 2;
    return { id: n.id, x: width / 2 + Math.cos(a) * 150, y: height / 2 + Math.sin(a) * 150, vx: 0, vy: 0 };
  });
  const idx = new Map(pos.map((p, i) => [p.id, i]));
  const edges = graph.edges.map((e) => ({ a: idx.get(e.from), b: idx.get(e.to), kind: e.kind }));

  const REPEL = 1400;
  const SPRING = 0.02;
  const TARGET_LEN = { "chunk-doc": 35, "doc-topic": 90, "semantic": 120 };
  const DAMP = 0.82;
  const CENTER = 0.0015;

  for (let it = 0; it < iters; it++) {
    // Repulsion (all pairs)
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const d2 = Math.max(25, dx * dx + dy * dy);
        const f = REPEL / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        pos[i].vx -= fx; pos[i].vy -= fy;
        pos[j].vx += fx; pos[j].vy += fy;
      }
    }
    // Springs
    for (const e of edges) {
      const a = pos[e.a], b = pos[e.b];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const target = TARGET_LEN[e.kind] ?? 80;
      const f = (d - target) * SPRING;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }
    // Center gravity
    for (const p of pos) {
      p.vx += (width / 2 - p.x) * CENTER;
      p.vy += (height / 2 - p.y) * CENTER;
      p.vx *= DAMP; p.vy *= DAMP;
      p.x += p.vx; p.y += p.vy;
    }
  }

  return pos;
}

export default function ObsidianGraphScreen() {
  const { t, isDark } = useTheme();
  const { goWorkspace } = useWorkspace();
  const returnFromScreen = goWorkspace;
  const [hoverNode, setHoverNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  const W = 1200, H = 720;
  const graph = useMemo(() => buildGraph(DEMO_DOCS, DEMO_TOPICS, null), []);
  const positions = useMemo(() => simulate(graph, W, H), [graph]);
  const posById = useMemo(() => {
    const m = new Map();
    positions.forEach((p) => m.set(p.id, p));
    return m;
  }, [positions]);

  const neighbors = useMemo(() => {
    const map = new Map();
    graph.edges.forEach((e) => {
      if (!map.has(e.from)) map.set(e.from, new Set());
      if (!map.has(e.to))   map.set(e.to, new Set());
      map.get(e.from).add(e.to);
      map.get(e.to).add(e.from);
    });
    return map;
  }, [graph]);

  const isHighlighted = (id) => {
    if (!hoverNode) return true;
    if (hoverNode === id) return true;
    return neighbors.get(hoverNode)?.has(id);
  };

  const isEdgeHighlighted = (e) => {
    if (!hoverNode) return true;
    return e.from === hoverNode || e.to === hoverNode;
  };

  // Pan
  const onMouseDown = (e) => { dragRef.current = { x: e.clientX, y: e.clientY, pan: { ...pan } }; };
  const onMouseMove = (e) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.pan.x + (e.clientX - dragRef.current.x),
      y: dragRef.current.pan.y + (e.clientY - dragRef.current.y),
    });
  };
  const onMouseUp = () => { dragRef.current = null; };

  const bg = isDark ? "#0a0a0a" : "#FAFAFA";
  const gridFg = isDark ? "#111" : "#EAEAEA";

  const stats = {
    docs: DEMO_DOCS.length,
    topics: DEMO_TOPICS.length,
    chunks: DEMO_DOCS.length * 5,
    edges: graph.edges.length,
  };

  return (
    <div style={{ background: bg, minHeight: "100vh", color: isDark ? "#e0e0e0" : "#111", fontFamily: "system-ui, sans-serif" }}>
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
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Knowledge Graph</h1>
            <p style={{ fontSize: 12, color: isDark ? "#888" : "#6B7280", margin: "2px 0 0" }}>
              Obsidian-style view of the Knowledge Artifact — docs · chunks · topics · semantic links.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Legend color="#16A34A" label={`${stats.docs} docs`} />
          <Legend color="#7C3AED" label={`${stats.chunks} chunks`} />
          <Legend color="#DC2626" label={`${stats.topics} topics`} />
          <Legend color={isDark ? "#555" : "#9CA3AF"} label={`${stats.edges} edges`} />

          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              style={btnStyle(isDark)}>+</button>
            <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
              style={btnStyle(isDark)}>−</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              style={btnStyle(isDark)}>Reset</button>
          </div>
        </div>
      </div>

      <div
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: dragRef.current ? "grabbing" : "grab", userSelect: "none", overflow: "hidden" }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="calc(100vh - 80px)"
          style={{ background: bg, display: "block" }}>
          <defs>
            <pattern id="obsg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={gridFg} strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#obsg-grid)" />

          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`} transform-origin="center">
            {/* Edges */}
            {graph.edges.map((e, i) => {
              const a = posById.get(e.from);
              const b = posById.get(e.to);
              if (!a || !b) return null;
              const hi = isEdgeHighlighted(e);
              const strokes = {
                "doc-topic": isDark ? "#333" : "#D1D5DB",
                "chunk-doc": "#7C3AED",
                "semantic":  "#16A34A",
              };
              const width = e.kind === "semantic" ? 1.4 : 0.9;
              const dash = e.kind === "semantic" ? "4,3" : "none";
              return (
                <line key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={strokes[e.kind]}
                  strokeWidth={width}
                  strokeDasharray={dash}
                  opacity={hi ? 0.55 : 0.08}
                  style={{ transition: "opacity 0.15s" }}
                />
              );
            })}

            {/* Nodes */}
            {graph.nodes.map((n) => {
              const p = posById.get(n.id);
              if (!p) return null;
              const hi = isHighlighted(n.id);
              const isHover = n.id === hoverNode;
              return (
                <g key={n.id}
                  onMouseEnter={() => setHoverNode(n.id)}
                  onMouseLeave={() => setHoverNode(null)}
                  opacity={hi ? 1 : 0.15}
                  style={{ transition: "opacity 0.15s", cursor: "pointer" }}>
                  <circle cx={p.x} cy={p.y} r={n.r + (isHover ? 3 : 0)}
                    fill={n.color} stroke={isDark ? "#0a0a0a" : "#fff"} strokeWidth={n.type === "topic" ? 2.5 : 1.5} />
                  {(isHover || n.type === "topic" || n.type === "doc") && (
                    <text x={p.x} y={p.y + n.r + 12} textAnchor="middle"
                      fontSize={n.type === "topic" ? 12 : (n.type === "doc" ? 10 : 8)}
                      fontWeight={n.type === "topic" ? 800 : 600}
                      fill={isDark ? "#e0e0e0" : "#111"}
                      pointerEvents="none">
                      {n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
      <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function btnStyle(isDark) {
  return {
    background: "transparent",
    border: `1px solid ${isDark ? "#333" : "#D1D5DB"}`,
    borderRadius: 4,
    padding: "4px 10px",
    color: isDark ? "#aaa" : "#374151",
    cursor: "pointer",
    fontSize: 12, fontWeight: 700,
  };
}
