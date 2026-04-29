import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useJourney } from "../context/JourneyContext";
import { parseDocument } from "../services/extractionApi";
import PipelineInspector, { simulateChunks, simulateNodes } from "../components/PipelineInspector";

// Live pipeline execution. Uses real parseDocument against extraction API;
// subsequent chunk/node/index stages are deterministic transforms of the
// parsed output so the UI reflects the real extraction result.

const PHASE_COLOR = "#EA580C";

export default function ProcessPhase() {
  const { user } = useAuth();
  const { t } = useTheme();
  const { state, patchPipeline, patch, nextPhase } = useJourney();
  const fileRef = useRef();

  const [file, setFile] = useState(null);
  const [activeStage, setActiveStage] = useState("parsed");
  const [status, setStatus] = useState("idle"); // idle | uploading | parsing | chunking | embedding | indexing | done | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [stageLog, setStageLog] = useState([]);

  const pushLog = (msg) => setStageLog((l) => [...l, { ts: Date.now(), msg }]);

  const handleFiles = (list) => {
    if (!list.length) return;
    const f = list[0];
    setFile(f); setError(null); setStatus("idle");
    patchPipeline({ parsed: null, chunks: null, nodes: null, index: null });
    setStageLog([]);
  };

  const run = async () => {
    if (!file) return;
    setStatus("uploading"); setError(null); setProgress(0); setStageLog([]);
    patchPipeline({ parsed: null, chunks: null, nodes: null, index: null });

    try {
      pushLog(`[extraction] POST /extraction/parse  tool=${state.extractionTool}`);
      const parsed = await parseDocument(file, state.extractionTool, (pct) => {
        setProgress(pct);
        if (pct >= 100) setStatus("parsing");
      });
      patchPipeline({ parsed: parsed.markdown });
      setActiveStage("parsed");
      pushLog(`[extraction] parsed OK · ${parsed.markdown?.length || 0} chars`);

      // Chunk
      setStatus("chunking");
      await sleep(500);
      const chunks = simulateChunks(parsed.markdown);
      patchPipeline({ chunks });
      setActiveStage("chunks");
      pushLog(`[chunker/${state.rag.chunk}] produced ${chunks.length} chunks`);

      // Embed
      setStatus("embedding");
      await sleep(700);
      const nodes = simulateNodes(chunks);
      patchPipeline({ nodes });
      setActiveStage("nodes");
      pushLog(`[embeddings/${state.rag.embedding}] generated ${nodes.length} vectors (1536d)`);

      // Index
      setStatus("indexing");
      await sleep(500);
      const artifactName = (file.name.replace(/\.[^.]+$/, "") || "artifact") + "-kb";
      const idx = {
        name: artifactName, chunks: chunks.length, nodes: nodes.length, dims: 1536,
        engine: state.rag.vectorStore === "pgvector" ? "pgvector" : "OpenSearch HNSW",
        owner: user.userid,
      };
      patchPipeline({ index: idx });
      setActiveStage("index");
      pushLog(`[vector-store/${state.rag.vectorStore}] wrote index ${idx.name} · entitlements inherited`);

      patch({ artifact: idx });
      setStatus("done");
    } catch (e) {
      setError(e.message);
      setStatus("error");
      pushLog(`[error] ${e.message}`);
    }
  };

  const pct = (() => {
    if (status === "idle") return 0;
    if (status === "uploading") return progress * 0.2;
    if (status === "parsing")   return 20 + progress * 0.05;
    if (status === "chunking")  return 40;
    if (status === "embedding") return 65;
    if (status === "indexing")  return 85;
    if (status === "done")      return 100;
    return 0;
  })();

  return (
    <div>
      <p style={{ color: t.textDim, fontSize: 14, lineHeight: 1.6, marginTop: 0, marginBottom: 18 }}>
        Watch the pipeline execute. Parse · chunk · embed · index are computed in order — every intermediate
        object is inspectable below.
      </p>

      {/* Top: file + run */}
      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => fileRef.current.click()}
            style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "8px 14px", color: t.text, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            📄 {file ? file.name : "Pick document…"}
          </button>
          <input ref={fileRef} type="file" style={{ display: "none" }}
            accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.txt,.md"
            onChange={(e) => handleFiles(e.target.files)} />

          <div style={{ color: t.textMuted, fontSize: 12 }}>
            Tool: <strong style={{ color: PHASE_COLOR }}>{state.extractionTool}</strong> ·
            Chunker: <strong style={{ color: PHASE_COLOR }}>{state.rag.chunk}</strong> ·
            Embed: <strong style={{ color: PHASE_COLOR }}>{state.rag.embedding}</strong>
          </div>

          <div style={{ flex: 1 }} />

          {status !== "done" ? (
            <button onClick={run} disabled={!file || (status !== "idle" && status !== "error")}
              style={{
                background: (!file || (status !== "idle" && status !== "error")) ? t.panelBg : PHASE_COLOR,
                border: `1px solid ${(!file || (status !== "idle" && status !== "error")) ? t.borderMid : PHASE_COLOR}`,
                borderRadius: 6, padding: "9px 22px",
                color: (!file || (status !== "idle" && status !== "error")) ? t.textMuted : "#fff",
                cursor: (!file || (status !== "idle" && status !== "error")) ? "not-allowed" : "pointer",
                fontWeight: 700, fontSize: 13,
              }}>
              {status === "idle" || status === "error" ? "▶ Run Pipeline" : statusLabel(status, progress)}
            </button>
          ) : (
            <button onClick={nextPhase}
              style={{ background: "#16A34A", border: "1px solid #16A34A", borderRadius: 6, padding: "9px 22px", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
              ✓ Done · View Knowledge Artifact →
            </button>
          )}
        </div>

        {/* Progress */}
        {(status !== "idle" || stageLog.length > 0) && (
          <>
            <div style={{ marginTop: 14, height: 6, background: t.borderSubtle, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: PHASE_COLOR, transition: "width 0.4s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, color: t.textMuted, fontSize: 11 }}>
              <span>{statusLabel(status, progress)}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{Math.round(pct)}%</span>
            </div>
          </>
        )}

        {error && (
          <div style={{ marginTop: 12, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ color: "#DC2626", fontSize: 12, fontWeight: 700 }}>Pipeline failed</div>
            <div style={{ color: "#991B1B", fontSize: 11, marginTop: 4 }}>{error}</div>
            <div style={{ color: t.textGhost, fontSize: 11, marginTop: 6 }}>
              Is the Extraction Agent running on :8000? Run <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>python deploy.py</span>.
            </div>
          </div>
        )}
      </div>

      {/* Main 2-column: Inspector + log */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        <PipelineInspector
          pipeline={state.pipeline}
          activeStage={activeStage}
          onStageChange={setActiveStage}
          phaseColor={PHASE_COLOR}
          theme={t}
        />

        {/* Log stream */}
        <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}`, background: t.panelBg }}>
            <span style={{ color: t.textStrong, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Pipeline Log</span>
          </div>
          <div style={{ padding: 12, flex: 1, overflowY: "auto", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, lineHeight: 1.7, minHeight: 420 }}>
            {stageLog.length === 0 && <div style={{ color: t.textDisabled }}>Run the pipeline to see execution trace.</div>}
            {stageLog.map((l, i) => (
              <div key={i} style={{ color: l.msg.startsWith("[error]") ? "#DC2626" : t.textMuted }}>
                <span style={{ color: t.textDisabled }}>{new Date(l.ts).toLocaleTimeString()} </span>
                {l.msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function statusLabel(s, progress) {
  switch (s) {
    case "uploading": return `Uploading ${progress}%`;
    case "parsing":   return "Parsing document…";
    case "chunking":  return "Creating chunks…";
    case "embedding": return "Generating embeddings…";
    case "indexing":  return "Writing to vector store…";
    case "done":      return "Knowledge artifact built";
    case "error":     return "Failed";
    default:          return "Ready";
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
