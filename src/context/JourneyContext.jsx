import { createContext, useContext, useMemo, useState } from "react";

// ─── Phase model ───────────────────────────────────────────────────────────
// 7 phases mirroring the user's flow graph. Phase 0 (Enter) is the PathPicker
// itself — phases 1..6 are the work phases rendered inside JourneyShell.
export const PHASES = [
  { id: "enter",     label: "Enter",     color: "#6366F1", bg: "#EEF2FF" },
  { id: "connect",   label: "Connect",   color: "#2563EB", bg: "#EFF6FF" },
  { id: "curate",    label: "Curate",    color: "#7C3AED", bg: "#F5F3FF" },
  { id: "configure", label: "Configure", color: "#DC2626", bg: "#FEF2F2" },
  { id: "process",   label: "Process",   color: "#EA580C", bg: "#FFF7ED" },
  { id: "knowledge", label: "Knowledge", color: "#16A34A", bg: "#F0FDF4" },
  { id: "consume",   label: "Consume",   color: "#0891B2", bg: "#ECFEFF" },
];

// Each path declares which phases it traverses (by index into PHASES).
// Phase 0 (Enter) is always implicitly "completed" once a path is active.
export const PATHS = {
  connect: {
    id: "connect",
    label: "Enterprise Connect",
    icon: "🔗",
    color: "#2563EB",
    desc: "Connect a source → credentials → scan → configure → ingest → query.",
    phases: [1, 2, 3, 4, 5, 6],
  },
  upload: {
    id: "upload",
    label: "Quick Upload",
    icon: "📄",
    color: "#7C3AED",
    desc: "Upload documents → optional direct Q&A, or promote into a full KB.",
    phases: [2, 3, 4, 5, 6],
  },
  browse: {
    id: "browse",
    label: "Browse & Discover",
    icon: "🔍",
    color: "#059669",
    desc: "Browse the catalog → query existing KBs, or request access to new sources.",
    phases: [2, 5, 6],
  },
};

// ─── View (top-level route) ───────────────────────────────────────────────
// - "picker"     : PathPicker (entry)
// - "journey"    : JourneyShell rendering the current phase for the active path
// - "flowgraph"  : the 7-phase flow graph visualization
// - "obsidian"   : the Obsidian-style knowledge graph visualization

const JourneyContext = createContext(null);

export function JourneyProvider({ children }) {
  const [view, setView] = useState("picker");
  const [pathId, setPathId] = useState(null);
  const [phaseIdx, setPhaseIdx] = useState(1);

  // Shared cross-phase state (selected source, uploaded files, config, results)
  const [state, setState] = useState({
    source: null,              // { id, name, bucket, ... } from ConnectPhase
    uploads: [],               // RAG2 uploaded files (from ragApi)
    selectedFileIds: [],       // files chosen for ingestion in CuratePhase
    extractionTool: "docling",
    rag: {                     // ConfigurePhase selections
      chunk: "semantic",
      chunkSize: 1024,
      overlap: 128,
      embedding: "openai-text-embedding-3-small",
      vectorStore: "opensearch",
      retriever: "hybrid",
    },
    pipeline: {                // ProcessPhase artifacts built during execution
      parsed: null,
      chunks: null,
      nodes: null,
      index: null,
    },
    artifact: null,            // final Knowledge Artifact (KnowledgePhase)
  });

  const activePath = pathId ? PATHS[pathId] : null;

  const api = useMemo(() => ({
    view, pathId, phaseIdx, state, activePath,

    // navigation
    goPicker: () => { setView("picker"); setPathId(null); setPhaseIdx(1); },
    startPath: (id) => {
      if (!PATHS[id]) return;
      setPathId(id);
      setPhaseIdx(PATHS[id].phases[0]);
      setView("journey");
    },
    goToPhase: (idx) => {
      if (!activePath || !activePath.phases.includes(idx)) return;
      setPhaseIdx(idx);
      setView("journey");
    },
    nextPhase: () => {
      if (!activePath) return;
      const i = activePath.phases.indexOf(phaseIdx);
      if (i < 0 || i >= activePath.phases.length - 1) return;
      setPhaseIdx(activePath.phases[i + 1]);
    },
    prevPhase: () => {
      if (!activePath) return;
      const i = activePath.phases.indexOf(phaseIdx);
      if (i <= 0) return;
      setPhaseIdx(activePath.phases[i - 1]);
    },

    // side screens
    openFlowGraph: () => setView("flowgraph"),
    openObsidian:  () => setView("obsidian"),
    returnFromScreen: () => setView(pathId ? "journey" : "picker"),

    // shared state mutation (shallow merge)
    patch: (partial) => setState((s) => ({ ...s, ...partial })),
    patchRag: (partial) => setState((s) => ({ ...s, rag: { ...s.rag, ...partial } })),
    patchPipeline: (partial) => setState((s) => ({ ...s, pipeline: { ...s.pipeline, ...partial } })),
  }), [view, pathId, phaseIdx, state, activePath]);

  return <JourneyContext.Provider value={api}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error("useJourney must be used within JourneyProvider");
  return ctx;
}
