import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { queryFile } from "../services/ragApi";

const MONO = "'IBM Plex Mono', monospace";

// Chat-first view scoped to a single document, with a preview pane on the
// right. The heavy pipeline viewer lives in the dedicated Extraction Studio
// (reachable via the ⚙ button in the header).

export default function DocumentView({ file }) {
  const { user } = useAuth();
  const { t } = useTheme();
  const { openExtraction, getDocStatus, setFileBlob, getFileBlob } = useWorkspace();

  const id = file.file_id ?? file.id;
  const name = file.original_name ?? file.filename ?? `File ${id}`;
  const size = file.size ?? file.file_size ?? 0;
  const ext = name.split(".").pop()?.toUpperCase() || "";
  const status = getDocStatus(id);

  const [history, setHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [provider, setProvider] = useState("xai");
  const [state, setState] = useState("idle");
  const [err, setErr] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(true);
  const bottomRef = useRef();

  // Reset chat on doc switch
  useEffect(() => {
    setHistory([]); setQuestion(""); setErr(null); setState("idle");
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, state]);

  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setHistory((h) => [...h, { role: "user", text: q }]);
    setQuestion(""); setState("loading"); setErr(null);
    try {
      const res = await queryFile(user, Number(id), q, provider);
      setHistory((h) => [...h, { role: "assistant", text: res.answer, model: res.model, provider }]);
      setState("done");
    } catch (e) {
      setErr(e.message); setState("error");
      setHistory((h) => [...h, { role: "assistant", text: `(failed: ${e.message})`, error: true }]);
    }
  };

  const suggestions = [
    "What is this document about?",
    "Summarize the key points.",
    "What are the main risks mentioned?",
    "Extract any numbers or figures.",
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── Doc header strip ── */}
      <div style={{
        borderBottom: `1px solid ${t.border}`, background: t.sidebarBg,
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <span style={{ fontSize: 18 }}>▤</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: t.textStrong, fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: MONO }}>
              {name}
            </span>
            <span style={{
              background: `${status.color}20`, color: status.color,
              fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
              letterSpacing: 0.8, textTransform: "uppercase",
            }}>{status.dot} {status.label}</span>
          </div>
          <div style={{ color: t.textMuted, fontSize: 10, fontFamily: MONO, marginTop: 1 }}>
            id {id} · {ext || "?"} · {Math.round(size / 1024)}KB · owner {user.userid}
          </div>
        </div>

        <label style={{
          background: getFileBlob(id) ? "#16A34A20" : t.inputBg,
          border: `1px solid ${getFileBlob(id) ? "#16A34A" : t.borderSubtle}`,
          borderRadius: 5, padding: "5px 10px",
          color: getFileBlob(id) ? "#16A34A" : t.textMuted,
          fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>
          {getFileBlob(id) ? "✓ file attached" : "📎 attach file"}
          <input type="file" style={{ display: "none" }} onChange={(e) => {
            const f = e.target.files[0] || null;
            if (f) setFileBlob(id, f);
          }} />
        </label>

        <button onClick={() => setPreviewVisible((v) => !v)}
          style={{
            background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 5,
            padding: "5px 10px", color: t.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}>
          {previewVisible ? "Hide preview" : "Show preview"}
        </button>

        <button onClick={() => openExtraction(getFileBlob(id), file)}
          style={{
            background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 5,
            padding: "5px 12px", color: t.text, fontSize: 11, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
          }}>
          ⚙ Extract
        </button>
      </div>

      {/* ── Body: chat + preview split ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", minHeight: 0 }}>
        {/* Chat thread */}
        <div style={{ flex: 1, minWidth: 360, overflow: "auto", background: t.pageBg }}>
          <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 20px 12px" }}>
            {history.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 34, opacity: 0.4, marginBottom: 10 }}>💬</div>
                <div style={{ color: t.textStrong, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                  Ask this document anything
                </div>
                <div style={{ color: t.textMuted, fontSize: 12, marginBottom: 20 }}>
                  Grok or Claude via the RAG2 pipeline. Scoped to <span style={{ fontFamily: MONO, color: t.text }}>{name}</span>.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => setQuestion(s)}
                      style={{
                        background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 14,
                        padding: "6px 12px", color: t.textDim, fontSize: 11, fontWeight: 500, cursor: "pointer",
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history.map((m, i) => <Message key={i} m={m} t={t} />)}

            {state === "loading" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: t.textMuted, fontSize: 12 }}>
                <Spinner color="#3a7aba" /> Thinking via {provider === "xai" ? "Grok" : "Claude"}…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Preview pane */}
        {previewVisible && (
          <div style={{
            width: "44%", minWidth: 320, maxWidth: 720, flexShrink: 0,
            borderLeft: `1px solid ${t.border}`, background: t.cardBg,
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <PreviewPane file={file} fileBlob={getFileBlob(id)} onAttach={(f) => setFileBlob(id, f)} t={t} />
          </div>
        )}
      </div>

      {/* ── Input dock ── */}
      <InputDock
        question={question} setQuestion={setQuestion}
        provider={provider} setProvider={setProvider}
        onAsk={ask} state={state} t={t} placeholder={`Ask "${name}"…  (Cmd/Ctrl+Enter)`}
      />
    </div>
  );
}

// ─── Preview pane ─────────────────────────────────────────────────────────
function PreviewPane({ file, fileBlob, onAttach, t }) {
  const id = file.file_id ?? file.id;
  const name = file.original_name ?? file.filename ?? `File ${id}`;
  const ext = (name.split(".").pop() || "").toLowerCase();
  const [zoom, setZoom] = useState(100);
  const [objectUrl, setObjectUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);

  const isImage = ["png", "jpg", "jpeg", "bmp", "tiff", "tif", "webp", "gif", "svg"].includes(ext);
  const isPdf   = ext === "pdf";
  const isText  = ["md", "txt", "csv", "json", "log", "yaml", "yml", "xml", "html"].includes(ext);

  useEffect(() => {
    let revokeUrl = null;
    setTextContent(null);
    setObjectUrl(null);

    if (!fileBlob) return;

    if (isText) {
      fileBlob.text().then((text) => setTextContent(text.slice(0, 200000))).catch(() => setTextContent("(could not read)"));
    } else if (isImage || isPdf) {
      const url = URL.createObjectURL(fileBlob);
      revokeUrl = url;
      setObjectUrl(url);
    }

    return () => { if (revokeUrl) URL.revokeObjectURL(revokeUrl); };
  }, [fileBlob, ext, isText, isImage, isPdf]);

  return (
    <>
      {/* Header */}
      <div style={{
        padding: "8px 12px", borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", gap: 8, background: t.panelBg, flexShrink: 0,
      }}>
        <span style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          Preview
        </span>
        <span style={{ flex: 1 }} />
        {(isImage || isPdf) && fileBlob && (
          <>
            <button onClick={() => setZoom((z) => Math.max(25, z - 25))} style={zoomBtn(t)}>−</button>
            <span style={{ color: t.textMuted, fontSize: 10, minWidth: 40, textAlign: "center", fontFamily: MONO }}>{zoom}%</span>
            <button onClick={() => setZoom((z) => Math.min(300, z + 25))} style={zoomBtn(t)}>+</button>
          </>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        {!fileBlob && (
          <NoBlobState name={name} ext={ext} onAttach={onAttach} t={t} />
        )}

        {fileBlob && isImage && objectUrl && (
          <div style={{ padding: 14, display: "flex", justifyContent: "center", minHeight: "100%", alignItems: "flex-start", background: t.deepBg }}>
            <img src={objectUrl} alt={name}
              style={{ maxWidth: `${zoom}%`, height: "auto", borderRadius: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.25)" }} />
          </div>
        )}

        {fileBlob && isPdf && objectUrl && (
          <iframe src={objectUrl} title={name}
            style={{ width: "100%", height: "100%", border: "none", background: "#fff",
                     transform: `scale(${zoom / 100})`, transformOrigin: "top left" }} />
        )}

        {fileBlob && isText && (
          <pre style={{
            margin: 0, padding: 14, fontFamily: MONO, fontSize: 12, lineHeight: 1.65,
            color: t.text, whiteSpace: "pre-wrap", wordBreak: "break-word", background: t.deepBg,
          }}>
            {textContent ?? "Loading…"}
          </pre>
        )}

        {fileBlob && !isImage && !isPdf && !isText && (
          <UnknownBlob name={name} ext={ext} t={t} />
        )}
      </div>
    </>
  );
}

function NoBlobState({ name, ext, onAttach, t }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) onAttach(e.dataTransfer.files[0]); }}
      style={{
        height: "100%", minHeight: 300, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 10, padding: 24,
        cursor: "pointer",
        background: drag ? "rgba(124,58,237,0.08)" : t.cardBg,
        border: drag ? "2px dashed #7C3AED" : "none",
      }}>
      <div style={{ fontSize: 36, opacity: 0.35 }}>▤</div>
      <div style={{ color: t.textStrong, fontSize: 13, fontWeight: 700 }}>{name}</div>
      <div style={{ color: t.textMuted, fontSize: 12, textAlign: "center", maxWidth: 320, lineHeight: 1.5 }}>
        Attach the file from disk to preview it inline. Browsers can't read back the stored blob — but drop or click here and it'll render below.
      </div>
      <div style={{ color: t.textDisabled, fontSize: 10, fontFamily: MONO }}>{ext.toUpperCase() || "unknown"}</div>
      <button style={{
        background: "#7C3AED", color: "#fff", border: "none", borderRadius: 5,
        padding: "7px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 4,
      }}>📎 Attach to preview</button>
      <input ref={ref} type="file" style={{ display: "none" }}
        onChange={(e) => { if (e.target.files[0]) onAttach(e.target.files[0]); }} />
    </div>
  );
}

function UnknownBlob({ name, ext, t }) {
  return (
    <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
      <div style={{ fontSize: 30, opacity: 0.4, marginBottom: 8 }}>▤</div>
      <div style={{ color: t.text, fontSize: 13, fontWeight: 600, fontFamily: MONO }}>{name}</div>
      <div style={{ fontSize: 11, marginTop: 4 }}>
        Inline preview not supported for <span style={{ fontFamily: MONO }}>.{ext}</span>.
        Open in the Extraction Studio to see parsed output.
      </div>
    </div>
  );
}

function zoomBtn(t) {
  return {
    background: "transparent", border: `1px solid ${t.borderSubtle}`, borderRadius: 4,
    width: 22, height: 22, color: t.textMuted, cursor: "pointer", fontSize: 13, padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}

// ─── Shared message bubble ────────────────────────────────────────────────
function Message({ m, t }) {
  if (m.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <div style={{
          maxWidth: "78%", background: "#3a7aba", color: "#fff",
          borderRadius: "14px 14px 3px 14px",
          padding: "9px 14px", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap",
        }}>
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16 }}>
      <div style={{ maxWidth: "86%" }}>
        {m.model && (
          <div style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, marginBottom: 3, letterSpacing: 0.5, fontFamily: MONO }}>
            {m.model}
          </div>
        )}
        <div style={{
          background: m.error ? "#3a1010" : t.cardBg,
          border: `1px solid ${m.error ? "#5a1a1a" : t.border}`,
          borderRadius: "14px 14px 14px 3px",
          padding: "10px 14px", color: m.error ? "#ff8080" : t.text,
          fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap",
        }}>
          {m.text}
        </div>
      </div>
    </div>
  );
}

// ─── Shared chat input dock ───────────────────────────────────────────────
export function InputDock({ question, setQuestion, provider, setProvider, onAsk, state, t, placeholder, disabled = false, leftSlot = null }) {
  return (
    <div style={{ borderTop: `1px solid ${t.border}`, background: t.sidebarBg, padding: "10px 16px 12px", flexShrink: 0 }}>
      {leftSlot}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", maxWidth: 820, margin: "0 auto" }}>
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
          rows={1}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onAsk(); }}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            flex: 1, background: t.inputBg, border: `1px solid ${t.borderSubtle}`,
            borderRadius: 8, padding: "10px 14px", color: t.text, fontSize: 13,
            outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box",
            minHeight: 40, maxHeight: 160, opacity: disabled ? 0.5 : 1,
          }} />
        <div style={{ display: "flex", gap: 4 }}>
          {[{ id: "xai", label: "Grok" }, { id: "anthropic", label: "Claude" }].map((p) => (
            <button key={p.id} onClick={() => setProvider(p.id)} disabled={disabled}
              style={{
                background: provider === p.id ? "#3a7aba" : t.inputBg,
                border: `1px solid ${provider === p.id ? "#3a7aba" : t.borderSubtle}`,
                borderRadius: 6, padding: "9px 11px",
                color: provider === p.id ? "#fff" : t.textMuted,
                fontSize: 11, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
              }}>{p.label}</button>
          ))}
        </div>
        <button onClick={onAsk} disabled={disabled || state === "loading" || !question.trim()}
          style={{
            background: "#3a7aba", color: "#fff", border: "none", borderRadius: 6,
            padding: "9px 22px", fontSize: 12, fontWeight: 700,
            cursor: (disabled || state === "loading" || !question.trim()) ? "not-allowed" : "pointer",
            opacity: (disabled || state === "loading" || !question.trim()) ? 0.5 : 1,
          }}>
          {state === "loading" ? "…" : "Ask"}
        </button>
      </div>
    </div>
  );
}

function Spinner({ color = "#3a7aba" }) {
  return (
    <>
      <span style={{
        display: "inline-block", width: 14, height: 14,
        border: "2px solid #333", borderTopColor: color, borderRadius: "50%",
        animation: "dvspin 0.7s linear infinite",
      }} />
      <style>{`@keyframes dvspin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
