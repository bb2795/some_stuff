import { useState, useRef, useEffect } from "react";
import { parseDocument, extractFields } from "../services/extractionApi";

const MONO = "'JetBrains Mono', 'IBM Plex Mono', 'Cascadia Code', 'Source Code Pro', Menlo, monospace";
const LIME = "#d4ff3a";
const BG = "#fafafa";
const SURFACE = "#ffffff";
const BORDER = "#e5e5e5";
const TEXT = "#111111";
const MUTED = "#6b7280";
const RADIUS = 6;

const TOOLS = [
  { id: "docling", name: "Docling", type: "Local", notes: "Fully local. DocLayNet + TableFormer. ~1GB models on first run. Best for structured docs, tables." },
  { id: "docling_granite", name: "Docling + Granite", type: "Local", notes: "Docling with IBM Granite VLM for complex visual layouts. Needs Granite server." },
  { id: "easyocr", name: "EasyOCR", type: "Local", notes: "OCR for 80+ languages. Good for scanned documents and images." },
  { id: "llamaparse", name: "LlamaParse", type: "Cloud", notes: "LlamaIndex cloud parsing. High accuracy for complex PDFs. Requires API key." },
  { id: "landing_ai", name: "Landing AI", type: "Cloud", notes: "Landing AI document extraction API. Requires API key." },
];

const PIPELINE_STAGES = [
  { id: "original", label: "Original", icon: "\uD83D\uDCC4" },
  { id: "parsed", label: "Parsed", icon: "\u26A1" },
  { id: "chunks", label: "Chunks", icon: "\u2702" },
  { id: "nodes", label: "Nodes", icon: "\u2B21" },
  { id: "index", label: "Index", icon: "\uD83D\uDD17" },
];

const CHUNK_METHODS = [
  { id: "semantic", label: "Semantic", desc: "By section headers + tables" },
  { id: "fixed", label: "Fixed (512)", desc: "Fixed 512-token windows" },
  { id: "sentence", label: "Sentence", desc: "Split on sentence boundaries" },
];

// ─── Tiny components ───────────────────────────────────────────────────────

function IconBtn({ children, onClick, title, active }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
      background: active ? LIME : "transparent", border: `1px solid ${active ? LIME : BORDER}`, borderRadius: 4,
      color: active ? TEXT : MUTED, fontSize: 13, cursor: "pointer", fontFamily: MONO, flexShrink: 0,
    }}>
      {children}
    </button>
  );
}

function SectionLabel({ children, right }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>{children}</span>
      {right && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>{right}</span>}
    </div>
  );
}

function Spinner({ size = 18, color = LIME }) {
  return (
    <>
      <span style={{ display: "inline-block", width: size, height: size, border: `2px solid ${BORDER}`, borderTopColor: color, borderRadius: "50%", animation: "dspin 0.6s linear infinite", flexShrink: 0 }} />
      <style>{`@keyframes dspin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ─── Simulated pipeline data ───────────────────────────────────────────────

function simulateChunks(markdown) {
  if (!markdown) return [];
  const sections = markdown.split(/\n#{1,3}\s+/).filter(Boolean);
  return sections.slice(0, 12).map((s, i) => {
    const lines = s.trim().split("\n");
    const title = lines[0]?.substring(0, 60) || `Chunk ${i + 1}`;
    const body = lines.slice(1).join(" ").substring(0, 120);
    return { id: i, title: title.replace(/^#+\s*/, ""), body, tokens: 80 + Math.floor(Math.random() * 400), type: body.includes("|") ? "table" : lines.length > 5 ? "text" : "text" };
  });
}

function simulateNodes(chunks) {
  return chunks.map((c, i) => ({
    id: `node-${i}`, chunkId: i, label: c.title.substring(0, 30),
    embedding: `[${(Math.random() * 2 - 1).toFixed(3)}, ${(Math.random() * 2 - 1).toFixed(3)}, ... 1536d]`,
    neighbors: [chunks[(i + 1) % chunks.length]?.title?.substring(0, 20), chunks[Math.max(0, i - 1)]?.title?.substring(0, 20)].filter(Boolean),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ExtractionPanel({ onBack, initialFile = null, initialFileMeta = null, onStage = null, onAttach = null }) {
  // Tool
  const [selectedTool, setSelectedTool] = useState("docling");
  const [toolDropOpen, setToolDropOpen] = useState(false);
  const toolRef = useRef(null);

  // File
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [zoom, setZoom] = useState(100);

  // Config
  const [config, setConfig] = useState({ format: "Markdown", dpi: "200", gpu: "Auto-detect", language: "en", chunkMethod: "semantic", chunkSize: "512", overlap: "64" });

  // Pipeline stage view
  const [activeStage, setActiveStage] = useState("original");
  const [nodeView, setNodeView] = useState("tree"); // "tree" | "graph"

  // Run state
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Pipeline stages (built progressively)
  const [pipelineStages, setPipelineStages] = useState({ parsed: null, chunks: null, nodes: null, index: null });
  const [pipelineProgress, setPipelineProgress] = useState(0); // 0-4

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareConfigs, setCompareConfigs] = useState([
    { tool: "docling", chunkMethod: "semantic", status: "idle", result: null },
    { tool: "easyocr", chunkMethod: "fixed", status: "idle", result: null },
  ]);

  // Field extraction
  const [extractPreset, setExtractPreset] = useState("none");
  const [customFields, setCustomFields] = useState("");

  // Tool dropdown
  useEffect(() => {
    if (!toolDropOpen) return;
    const h = (e) => { if (toolRef.current && !toolRef.current.contains(e.target)) setToolDropOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [toolDropOpen]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When opened from the workspace with a pre-selected file, hydrate state.
  useEffect(() => {
    if (initialFile && !file) {
      handleFiles([initialFile]);
    }
  }, [initialFile]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeTool = TOOLS.find((t) => t.id === selectedTool) || TOOLS[0];

  const handleFiles = (files) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f); setStatus("idle"); setResult(null); setError(null); setZoom(100);
    onAttach?.(f);
    setPipelineStages({ parsed: null, chunks: null, nodes: null, index: null }); setPipelineProgress(0); setActiveStage("original");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const ext = f.name.toLowerCase().split(".").pop();
    const imgs = ["png", "jpg", "jpeg", "bmp", "tiff", "tif", "webp"];
    if (imgs.includes(ext)) { setPreviewType("image"); setPreviewUrl(URL.createObjectURL(f)); }
    else if (ext === "pdf") { setPreviewType("pdf"); setPreviewUrl(URL.createObjectURL(f)); }
    else { setPreviewType(null); setPreviewUrl(null); }
  };

  // ── Run pipeline with progressive stages ──
  const handleRun = async () => {
    if (!file) return;
    setStatus("uploading"); setProgress(0); setError(null); setResult(null);
    setPipelineStages({ parsed: null, chunks: null, nodes: null, index: null }); setPipelineProgress(0);
    setActiveStage("parsed");

    try {
      // Stage 1: Parse
      const res = await parseDocument(file, selectedTool, (pct) => { setProgress(pct); if (pct >= 100) setStatus("processing"); });
      setResult(res);
      setPipelineStages((p) => ({ ...p, parsed: res.markdown }));
      setPipelineProgress(1); setActiveStage("parsed");
      onStage?.("parsed", res.markdown);

      // Stage 2: Chunks (simulated, 800ms)
      await new Promise((r) => setTimeout(r, 800));
      const chunks = simulateChunks(res.markdown);
      setPipelineStages((p) => ({ ...p, chunks }));
      setPipelineProgress(2); setActiveStage("chunks");
      onStage?.("chunks", chunks);

      // Stage 3: Nodes (simulated, 600ms)
      await new Promise((r) => setTimeout(r, 600));
      const nodes = simulateNodes(chunks);
      setPipelineStages((p) => ({ ...p, nodes }));
      setPipelineProgress(3); setActiveStage("nodes");
      onStage?.("nodes", nodes);

      // Stage 4: Index (simulated, 500ms)
      await new Promise((r) => setTimeout(r, 500));
      const idx = { name: file.name.replace(/\.[^.]+$/, "") + "-idx", chunks: chunks.length, nodes: nodes.length, dims: 1536 };
      setPipelineStages((p) => ({ ...p, index: idx }));
      setPipelineProgress(4); setActiveStage("index");
      onStage?.("index", idx);

      setStatus("done");
    } catch (err) {
      setError(err.message); setStatus("error");
    }
  };

  // ── Compare run ──
  const handleCompareRun = async () => {
    if (!file) return;
    const updated = [...compareConfigs];
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: "running", result: null };
      setCompareConfigs([...updated]);
      try {
        const res = await parseDocument(file, updated[i].tool);
        const chunks = simulateChunks(res.markdown);
        updated[i] = { ...updated[i], status: "done", result: { markdown: res.markdown, chunks, charCount: res.metadata?.char_count || res.markdown?.length || 0 } };
      } catch {
        updated[i] = { ...updated[i], status: "error", result: null };
      }
      setCompareConfigs([...updated]);
    }
  };

  const handleReset = () => {
    setConfig({ format: "Markdown", dpi: "200", gpu: "Auto-detect", language: "en", chunkMethod: "semantic", chunkSize: "512", overlap: "64" });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null); setPreviewUrl(null); setPreviewType(null); setZoom(100);
    setResult(null); setError(null); setStatus("idle"); setProgress(0);
    setPipelineStages({ parsed: null, chunks: null, nodes: null, index: null }); setPipelineProgress(0); setActiveStage("original");
    setCompareMode(false);
  };

  const handleCopy = () => { if (result?.markdown) navigator.clipboard?.writeText(result.markdown); };
  const handleDownload = () => {
    if (!result?.markdown) return;
    const blob = new Blob([result.markdown], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = (file?.name?.replace(/\.[^.]+$/, "") || "out") + ".md"; a.click();
  };

  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: BG, fontFamily: MONO, color: TEXT, fontSize: 13 }}>

      {/* ── Top Bar ── */}
      <div style={{ height: 52, flexShrink: 0, background: SURFACE, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
        {onBack && <button onClick={onBack} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: RADIUS, padding: "5px 9px", cursor: "pointer", fontSize: 12, color: MUTED, fontFamily: MONO }}>{"\u2190"}</button>}
        <span style={{ color: LIME, fontSize: 16, fontWeight: 800, letterSpacing: "-0.5px" }}>DocExtract</span>
        <span style={{ color: MUTED, fontSize: 12 }}>/ agent</span>

        {initialFileMeta && !file ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 3, letterSpacing: 0.4 }}>
              INHERITED
            </span>
            <span style={{ color: TEXT, fontSize: 11, fontFamily: MONO, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {initialFileMeta.original_name ?? initialFileMeta.filename ?? `File ${initialFileMeta.file_id ?? initialFileMeta.id}`}
            </span>
            <button onClick={() => fileRef.current?.click()}
              style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontSize: 10, color: "#92400e", fontFamily: MONO, fontWeight: 700 }}>
              📎 Attach to extract
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 5, background: file ? "#dcfce7" : "transparent", border: `1px solid ${file ? "#16a34a" : TEXT}`, borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontSize: 11, color: file ? "#16a34a" : TEXT, fontFamily: MONO, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: file ? 700 : 500 }}>
            {"\uD83D\uDCC4"} {file ? file.name : "Upload document..."}
          </button>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />

        <div style={{ flex: 1 }} />

        {/* Compare toggle */}
        <button onClick={() => setCompareMode((v) => !v)} style={{
          padding: "5px 12px", borderRadius: 20, border: "none", fontSize: 11, fontWeight: 600,
          background: compareMode ? LIME : "transparent", color: compareMode ? TEXT : MUTED,
          cursor: "pointer", fontFamily: MONO, outline: compareMode ? "none" : `1px solid ${BORDER}`,
        }}>
          {"\u2696"} Compare
        </button>

        {/* Model */}
        <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.8px" }}>Model</span>
        <div ref={toolRef} style={{ position: "relative" }}>
          <button onClick={() => setToolDropOpen((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 5, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, padding: "5px 10px", cursor: "pointer", fontSize: 11, color: TEXT, fontFamily: MONO }}>
            {activeTool.name} <span style={{ fontSize: 9, color: MUTED }}>{"\u25BE"}</span>
          </button>
          {toolDropOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", width: 240, zIndex: 100, overflow: "hidden" }}>
              {TOOLS.map((t) => (
                <button key={t.id} onClick={() => { setSelectedTool(t.id); setToolDropOpen(false); }} style={{ display: "block", width: "100%", padding: "8px 12px", background: t.id === selectedTool ? "#f5f5f5" : "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: MONO }}>
                  <span style={{ fontSize: 11, fontWeight: t.id === selectedTool ? 700 : 500, color: TEXT }}>{t.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 3, background: t.type === "Cloud" ? "#fef3c7" : "#f3f4f6", color: t.type === "Cloud" ? "#92400e" : MUTED, marginLeft: 5 }}>{t.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: status === "processing" ? "#f59e0b" : status === "done" ? "#16a34a" : status === "error" ? "#dc2626" : "#d1d5db" }} />
      </div>

      {/* ── Pipeline Stage Bar ── */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 16px", display: "flex", alignItems: "center", height: 40, flexShrink: 0, gap: 0 }}>
        {PIPELINE_STAGES.map((s, i) => {
          const done = i < pipelineProgress;
          const active = activeStage === s.id;
          const reachable = i <= pipelineProgress;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
              <button onClick={() => reachable && setActiveStage(s.id)} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 16,
                background: active ? LIME : "transparent", border: "none",
                color: active ? TEXT : done ? "#16a34a" : reachable ? TEXT : "#d1d5db",
                fontSize: 11, fontWeight: active ? 700 : 500, cursor: reachable ? "pointer" : "default", fontFamily: MONO,
                opacity: reachable ? 1 : 0.4, transition: "all 0.1s",
              }}>
                <span>{done && !active ? "\u2713" : s.icon}</span> {s.label}
              </button>
              {i < PIPELINE_STAGES.length - 1 && (
                <span style={{ color: done ? "#16a34a" : "#d1d5db", fontSize: 10, margin: "0 2px" }}>{"\u2192"}</span>
              )}
            </div>
          );
        })}
        <div style={{ flex: 1 }} />
        {status === "processing" && <Spinner size={14} />}
        {pipelineProgress > 0 && <span style={{ fontSize: 10, color: MUTED, marginLeft: 8 }}>{pipelineProgress}/4 stages</span>}
      </div>

      {/* ── Main 3-Column Layout ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: compareMode ? "1fr 1fr" : "1fr 300px 1fr", gap: 12, padding: 12, overflow: "hidden" }}>

        {/* ── Column 1: Document Preview ── */}
        {!compareMode && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <SectionLabel>Document</SectionLabel>
                {file && <span style={{ fontSize: 9, color: MUTED }}>{zoom}%</span>}
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {file && (
                  <>
                    <IconBtn title="Zoom out" onClick={() => setZoom((z) => Math.max(25, z - 25))}>{"\u2212"}</IconBtn>
                    <IconBtn title="Zoom in" onClick={() => setZoom((z) => Math.min(300, z + 25))}>{"\u002B"}</IconBtn>
                    <IconBtn title="Remove" onClick={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setFile(null); setPreviewUrl(null); setPreviewType(null); setZoom(100); setResult(null); setStatus("idle"); setPipelineStages({ parsed: null, chunks: null, nodes: null, index: null }); setPipelineProgress(0); setActiveStage("original"); }}>{"\u2715"}</IconBtn>
                  </>
                )}
              </div>
            </div>
            <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
              style={{ flex: 1, overflow: "auto", display: "flex", alignItems: file ? "flex-start" : "center", justifyContent: "center", padding: file ? 0 : 16, background: file ? "#f0f0f0" : "transparent" }}>
              {file && previewType === "image" && previewUrl && (
                <div style={{ padding: 8, display: "flex", justifyContent: "center", width: "100%" }}>
                  <img src={previewUrl} alt={file.name} style={{ maxWidth: `${zoom}%`, height: "auto", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
                </div>
              )}
              {file && previewType === "pdf" && previewUrl && (
                <iframe src={previewUrl} title={file.name} style={{ width: "100%", height: "100%", border: "none", transform: `scale(${zoom / 100})`, transformOrigin: "top left" }} />
              )}
              {file && !previewType && (
                <div style={{ textAlign: "center", padding: 24 }}>
                  <div style={{ fontSize: 36, opacity: 0.3 }}>{"\uD83D\uDCC4"}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginTop: 8 }}>{file.name}</div>
                  <div style={{ fontSize: 10, color: MUTED }}>{(file.size / 1024).toFixed(0)} KB</div>
                </div>
              )}
              {!file && (
                <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${dragging ? LIME : BORDER}`, borderRadius: 10, padding: "36px 24px", textAlign: "center", cursor: "pointer", background: dragging ? "rgba(212,255,58,0.05)" : "transparent", width: "100%" }}>
                  <div style={{ fontSize: 28, marginBottom: 8, color: "#d97706" }}>{"\uD83D\uDCC2"}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 4 }}>Drop a document here</div>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 10 }}>PDF, PNG, JPG, JPEG, TIFF &middot; Max 50 MB</div>
                  <button style={{ background: LIME, border: "none", borderRadius: RADIUS, padding: "7px 16px", fontSize: 11, fontWeight: 700, color: TEXT, cursor: "pointer", fontFamily: MONO }}>Browse files</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Column 2: Config (or Compare left) ── */}
        {compareMode ? (
          /* ── COMPARE MODE: two result columns ── */
          <>
            {compareConfigs.map((cc, ci) => (
              <div key={ci} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "8px 12px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <select value={cc.tool} onChange={(e) => { const u = [...compareConfigs]; u[ci] = { ...u[ci], tool: e.target.value }; setCompareConfigs(u); }}
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 6px", fontSize: 11, color: TEXT, fontFamily: MONO, appearance: "auto" }}>
                    {TOOLS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <select value={cc.chunkMethod} onChange={(e) => { const u = [...compareConfigs]; u[ci] = { ...u[ci], chunkMethod: e.target.value }; setCompareConfigs(u); }}
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 6px", fontSize: 11, color: TEXT, fontFamily: MONO, appearance: "auto" }}>
                    {CHUNK_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  {cc.status === "running" && <Spinner size={12} />}
                  {cc.status === "done" && <span style={{ color: "#16a34a", fontSize: 10, fontWeight: 700 }}>{"\u2713"}</span>}
                  {cc.status === "error" && <span style={{ color: "#dc2626", fontSize: 10, fontWeight: 700 }}>{"\u2717"}</span>}
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
                  {cc.status === "idle" && <div style={{ color: MUTED, fontSize: 11, textAlign: "center", padding: 32 }}>Click "Run Compare" to start</div>}
                  {cc.status === "running" && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}><Spinner size={16} /><span style={{ fontSize: 11, color: MUTED }}>Extracting...</span></div>}
                  {cc.status === "done" && cc.result && (
                    <>
                      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ background: LIME, color: TEXT, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>{TOOLS.find((t) => t.id === cc.tool)?.name}</span>
                        <span style={{ fontSize: 9, color: MUTED }}>{cc.result.charCount.toLocaleString()} chars</span>
                        <span style={{ fontSize: 9, color: MUTED }}>{cc.result.chunks.length} chunks</span>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Chunks</div>
                      {cc.result.chunks.slice(0, 6).map((ch, j) => (
                        <div key={j} style={{ padding: "6px 8px", background: "#f9fafb", border: `1px solid ${BORDER}`, borderRadius: 4, marginBottom: 4 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: TEXT }}>{ch.title}</div>
                          <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{ch.tokens} tokens</div>
                        </div>
                      ))}
                      <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", marginTop: 8, marginBottom: 4 }}>Markdown Preview</div>
                      <pre style={{ fontFamily: MONO, fontSize: 10, color: TEXT, lineHeight: "1.5", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, background: "#f9fafb", border: `1px solid ${BORDER}`, borderRadius: 4, padding: 8, maxHeight: 200, overflowY: "auto" }}>
                        {cc.result.markdown?.substring(0, 800) || "(empty)"}
                      </pre>
                    </>
                  )}
                  {cc.status === "error" && <div style={{ color: "#dc2626", fontSize: 11, textAlign: "center", padding: 32 }}>Extraction failed</div>}
                </div>
              </div>
            ))}
          </>
        ) : (
          /* ── NORMAL MODE: config panel ── */
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <SectionLabel>Config</SectionLabel>
              <IconBtn title="Reset" onClick={handleReset}>{"\u21BB"}</IconBtn>
            </div>
            <div style={{ flex: 1, padding: "10px 12px", overflowY: "auto" }}>
              <SectionLabel>Extraction</SectionLabel>
              {[
                { label: "Output", key: "format", type: "select", options: ["Markdown", "JSON", "Plain text"] },
                { label: "DPI", key: "dpi", type: "text" },
                { label: "GPU", key: "gpu", type: "select", options: ["Auto-detect", "Force CPU", "Force GPU"] },
                { label: "Language", key: "language", type: "text" },
              ].map((row) => (
                <div key={row.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: MUTED }}>{row.label}</span>
                  {row.type === "select" ? (
                    <select value={config[row.key]} onChange={(e) => setConfig((p) => ({ ...p, [row.key]: e.target.value }))}
                      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 3, padding: "3px 6px", fontSize: 11, color: TEXT, fontFamily: MONO, appearance: "auto" }}>
                      {row.options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={config[row.key]} onChange={(e) => setConfig((p) => ({ ...p, [row.key]: e.target.value }))}
                      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 3, padding: "3px 6px", fontSize: 11, color: TEXT, fontFamily: MONO, width: 50, textAlign: "right" }} />
                  )}
                </div>
              ))}

              <div style={{ height: 8 }} />
              <SectionLabel>Chunking</SectionLabel>
              {CHUNK_METHODS.map((m) => (
                <button key={m.id} onClick={() => setConfig((p) => ({ ...p, chunkMethod: m.id }))} style={{
                  display: "block", width: "100%", padding: "6px 8px", marginBottom: 4, textAlign: "left",
                  background: config.chunkMethod === m.id ? "rgba(212,255,58,0.15)" : "transparent",
                  border: config.chunkMethod === m.id ? `1px solid ${LIME}` : `1px solid ${BORDER}`,
                  borderRadius: 4, cursor: "pointer", fontFamily: MONO,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: TEXT }}>{m.label}</span>
                  <span style={{ fontSize: 10, color: MUTED, marginLeft: 6 }}>{m.desc}</span>
                </button>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: MUTED, marginBottom: 2 }}>Size</div>
                  <input type="text" value={config.chunkSize} onChange={(e) => setConfig((p) => ({ ...p, chunkSize: e.target.value }))}
                    style={{ width: "100%", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 3, padding: "3px 6px", fontSize: 11, color: TEXT, fontFamily: MONO, boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: MUTED, marginBottom: 2 }}>Overlap</div>
                  <input type="text" value={config.overlap} onChange={(e) => setConfig((p) => ({ ...p, overlap: e.target.value }))}
                    style={{ width: "100%", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 3, padding: "3px 6px", fontSize: 11, color: TEXT, fontFamily: MONO, boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ height: 8 }} />
              <SectionLabel>Field Extraction</SectionLabel>
              <select value={extractPreset} onChange={(e) => setExtractPreset(e.target.value)}
                style={{ width: "100%", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 3, padding: "4px 6px", fontSize: 11, color: TEXT, fontFamily: MONO, appearance: "auto", marginBottom: 6 }}>
                <option value="none">No fields</option>
                <option value="financial">Financial Filing</option>
                <option value="compliance">Compliance</option>
                <option value="custom">Custom</option>
              </select>
              {extractPreset === "custom" && (
                <input type="text" value={customFields} onChange={(e) => setCustomFields(e.target.value)} placeholder="Field1, Field2..."
                  style={{ width: "100%", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 3, padding: "4px 6px", fontSize: 11, color: TEXT, fontFamily: MONO, boxSizing: "border-box" }} />
              )}

              <div style={{ height: 8 }} />
              <SectionLabel>Tool</SectionLabel>
              <div style={{ fontSize: 11, color: MUTED, lineHeight: "1.5" }}>
                {activeTool.type === "Local" ? "\uD83D\uDDA5" : "\u2601"} {activeTool.notes}
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${BORDER}`, padding: "8px 12px", display: "flex", gap: 6 }}>
              <button onClick={handleReset} style={{ flex: 1, padding: "8px 0", borderRadius: RADIUS, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: MONO }}>
                {"\u21BB"} Reset
              </button>
              <button onClick={handleRun} disabled={!file || status === "uploading" || status === "processing"} style={{
                flex: 1, padding: "8px 0", borderRadius: RADIUS, border: "none",
                background: (!file || status === "uploading" || status === "processing") ? "#e5e5e5" : LIME,
                color: TEXT, fontSize: 11, fontWeight: 700, cursor: (!file || status === "uploading" || status === "processing") ? "not-allowed" : "pointer", fontFamily: MONO,
              }}>
                {status === "uploading" ? `${progress}%` : status === "processing" ? "Running..." : "\u25B6 Run"}
              </button>
            </div>
          </div>
        )}

        {/* ── Column 3: Pipeline Results (or Compare run button) ── */}
        {compareMode ? (
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center", padding: 8 }}>
            <button onClick={handleCompareRun} disabled={!file} style={{
              padding: "8px 24px", borderRadius: RADIUS, border: "none",
              background: !file ? "#e5e5e5" : LIME, color: TEXT, fontSize: 12, fontWeight: 700,
              cursor: !file ? "not-allowed" : "pointer", fontFamily: MONO,
            }}>
              {"\u25B6"} Run Compare
            </button>
          </div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <SectionLabel>{PIPELINE_STAGES.find((s) => s.id === activeStage)?.label || "Results"}</SectionLabel>
              <div style={{ display: "flex", gap: 3 }}>
                {activeStage === "nodes" && (
                  <>
                    <IconBtn title="Tree view" active={nodeView === "tree"} onClick={() => setNodeView("tree")}>{"\uD83C\uDF33"}</IconBtn>
                    <IconBtn title="Graph view" active={nodeView === "graph"} onClick={() => setNodeView("graph")}>{"\u2B21"}</IconBtn>
                  </>
                )}
                <IconBtn title="Copy" onClick={handleCopy}>{"\uD83D\uDCCB"}</IconBtn>
                <IconBtn title="Download" onClick={handleDownload}>{"\u2B07"}</IconBtn>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              {/* ORIGINAL */}
              {activeStage === "original" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", gap: 8 }}>
                  {status === "idle" && !result && (
                    <>
                      <div style={{ fontSize: 28, opacity: 0.15 }}>{"\uD83D\uDC22"}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>No results yet</div>
                      <div style={{ fontSize: 11, color: MUTED, maxWidth: 200, lineHeight: "1.5" }}>Upload a document and press Run to start the pipeline.</div>
                    </>
                  )}
                  {(status === "uploading" || status === "processing") && (
                    <>
                      <Spinner size={20} />
                      <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{status === "uploading" ? `Uploading ${progress}%` : `Running ${activeTool.name}...`}</div>
                    </>
                  )}
                  {status === "error" && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: RADIUS, padding: 12, width: "100%" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>Failed</div>
                      <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{error}</div>
                    </div>
                  )}
                </div>
              )}

              {/* PARSED */}
              {activeStage === "parsed" && (
                pipelineStages.parsed ? (
                  <>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <span style={{ background: LIME, color: TEXT, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>{activeTool.name}</span>
                      <span style={{ fontSize: 9, color: MUTED }}>{(pipelineStages.parsed?.length || 0).toLocaleString()} chars</span>
                    </div>
                    <pre style={{ fontFamily: MONO, fontSize: 11, color: TEXT, lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, background: "#f9fafb", border: `1px solid ${BORDER}`, borderRadius: 4, padding: 10 }}>
                      {pipelineStages.parsed}
                    </pre>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}><Spinner size={16} /><span style={{ fontSize: 11, color: MUTED }}>Parsing...</span></div>
                )
              )}

              {/* CHUNKS */}
              {activeStage === "chunks" && (
                pipelineStages.chunks ? (
                  <>
                    <div style={{ fontSize: 10, color: MUTED, marginBottom: 8 }}>{pipelineStages.chunks.length} chunks &middot; {config.chunkMethod} splitting</div>
                    {pipelineStages.chunks.map((ch, i) => (
                      <div key={i} style={{ padding: "8px 10px", background: i % 2 === 0 ? "#f9fafb" : SURFACE, border: `1px solid ${BORDER}`, borderRadius: 4, marginBottom: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: TEXT }}>#{i + 1} {ch.title}</span>
                          <span style={{ fontSize: 9, color: MUTED, background: "#f3f4f6", padding: "1px 5px", borderRadius: 3 }}>{ch.tokens} tok</span>
                        </div>
                        {ch.body && <div style={{ fontSize: 10, color: MUTED, marginTop: 3, lineHeight: "1.4" }}>{ch.body}...</div>}
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}><Spinner size={16} /><span style={{ fontSize: 11, color: MUTED }}>Chunking...</span></div>
                )
              )}

              {/* NODES */}
              {activeStage === "nodes" && (
                pipelineStages.nodes ? (
                  nodeView === "tree" ? (
                    <>
                      <div style={{ fontSize: 10, color: MUTED, marginBottom: 8 }}>{pipelineStages.nodes.length} nodes &middot; 1536-dim embeddings &middot; tree view</div>
                      <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: "1.8" }}>
                        <div style={{ color: TEXT, fontWeight: 700 }}>{"\uD83D\uDCC1"} {file?.name || "document"}</div>
                        {pipelineStages.nodes.map((n, i) => (
                          <div key={i} style={{ paddingLeft: 20 }}>
                            <div style={{ color: TEXT }}>{"\u251C\u2500"} <span style={{ fontWeight: 600 }}>node_{i}</span> <span style={{ color: MUTED }}>({n.label})</span></div>
                            <div style={{ paddingLeft: 24, color: MUTED, fontSize: 10 }}>emb: {n.embedding}</div>
                            <div style={{ paddingLeft: 24, color: MUTED, fontSize: 10 }}>links: [{n.neighbors.join(", ")}]</div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* Graph view */
                    <>
                      <div style={{ fontSize: 10, color: MUTED, marginBottom: 8 }}>{pipelineStages.nodes.length} nodes &middot; graph view</div>
                      <svg viewBox="0 0 400 300" style={{ width: "100%", height: "auto", background: "#f9fafb", border: `1px solid ${BORDER}`, borderRadius: 4 }}>
                        {/* Edges */}
                        {pipelineStages.nodes.map((n, i) => {
                          const x1 = 60 + (i % 4) * 90;
                          const y1 = 40 + Math.floor(i / 4) * 70;
                          const ni = (i + 1) % pipelineStages.nodes.length;
                          const x2 = 60 + (ni % 4) * 90;
                          const y2 = 40 + Math.floor(ni / 4) * 70;
                          return <line key={`e${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d1d5db" strokeWidth="1" />;
                        })}
                        {/* Nodes */}
                        {pipelineStages.nodes.map((n, i) => {
                          const x = 60 + (i % 4) * 90;
                          const y = 40 + Math.floor(i / 4) * 70;
                          return (
                            <g key={i}>
                              <circle cx={x} cy={y} r={16} fill={LIME} stroke={TEXT} strokeWidth="1" />
                              <text x={x} y={y + 4} textAnchor="middle" fontSize="9" fontFamily={MONO} fill={TEXT} fontWeight="700">{i}</text>
                              <text x={x} y={y + 28} textAnchor="middle" fontSize="7" fontFamily={MONO} fill={MUTED}>{n.label}</text>
                            </g>
                          );
                        })}
                      </svg>
                    </>
                  )
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}><Spinner size={16} /><span style={{ fontSize: 11, color: MUTED }}>Generating nodes...</span></div>
                )
              )}

              {/* INDEX */}
              {activeStage === "index" && (
                pipelineStages.index ? (
                  <>
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: RADIUS, padding: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", marginBottom: 6 }}>{"\u2713"} Index ready</div>
                      <div style={{ fontSize: 11, color: TEXT }}>{pipelineStages.index.name}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: 11 }}>
                      <div><span style={{ color: MUTED }}>Chunks:</span> <span style={{ fontWeight: 600 }}>{pipelineStages.index.chunks}</span></div>
                      <div><span style={{ color: MUTED }}>Nodes:</span> <span style={{ fontWeight: 600 }}>{pipelineStages.index.nodes}</span></div>
                      <div><span style={{ color: MUTED }}>Dimensions:</span> <span style={{ fontWeight: 600 }}>{pipelineStages.index.dims}</span></div>
                      <div><span style={{ color: MUTED }}>Tool:</span> <span style={{ fontWeight: 600 }}>{activeTool.name}</span></div>
                      <div><span style={{ color: MUTED }}>Chunk method:</span> <span style={{ fontWeight: 600 }}>{config.chunkMethod}</span></div>
                      <div><span style={{ color: MUTED }}>Status:</span> <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3 }}>ACTIVE</span></div>
                    </div>
                    <div style={{ marginTop: 12, background: "#f9fafb", border: `1px solid ${BORDER}`, borderRadius: 4, padding: 10, fontSize: 10, color: MUTED, fontFamily: MONO, lineHeight: "1.5" }}>
                      {`POST /v1/knowledge/${pipelineStages.index.name}/retrieve`}<br />
                      {`  { "query": "...", "top_k": 5 }`}
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}><Spinner size={16} /><span style={{ fontSize: 11, color: MUTED }}>Building index...</span></div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
