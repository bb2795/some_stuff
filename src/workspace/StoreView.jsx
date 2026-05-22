import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { listFiles, queryStore } from "../services/ragApi";
import { InputDock } from "./DocumentView";
import DocumentsList from "./DocumentsList";

const MONO = "'IBM Plex Mono', monospace";
const GREEN = "#16A34A";
const AMBER = "#EA580C";
const MAX_SCOPE = 5;

// StoreView — chat with an un-indexed Store. The Store is just a named bag
// of documents; the chat sends parsed chunks of the selected docs directly
// into the LLM context window (no embeddings, no retrieval). Capped at 5
// docs per question.

export default function StoreView({ store }) {
  const { user } = useAuth();
  const { t } = useTheme();
  const { openReconfigure, openDoc, openExtraction, getDocStatus, getFileBlob, deleteUserKB } = useWorkspace();

  const [files, setFiles] = useState([]);
  const [filesErr, setFilesErr] = useState(null);
  const [scopeIds, setScopeIds] = useState([]); // selected docs for the next question
  const [history, setHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [provider, setProvider] = useState("xai");
  const [state, setState] = useState("idle");
  const [err, setErr] = useState(null);
  const bottomRef = useRef();

  useEffect(() => {
    listFiles(user)
      .then((fs) => {
        const memberIds = new Set((store.docIds || []).map(String));
        const scoped = memberIds.size > 0
          ? fs.filter((f) => memberIds.has(String(f.file_id ?? f.id)))
          : [];
        setFiles(scoped);
        setScopeIds(scoped.slice(0, MAX_SCOPE).map((f) => f.file_id ?? f.id));
      })
      .catch((e) => setFilesErr(e.message));
  }, [user, store.id]);

  useEffect(() => {
    setHistory([]); setQuestion(""); setErr(null); setState("idle");
  }, [store.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, state]);

  const toggleScope = (id) => {
    setScopeIds((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX_SCOPE) return cur; // hard cap
      return [...cur, id];
    });
  };

  const ask = async () => {
    const q = question.trim();
    if (!q || scopeIds.length === 0) return;
    const scopeNames = scopeIds.map((id) => fileName(files, id)).join(", ");
    setHistory((h) => [...h, { role: "user", text: q, scope: scopeNames, docCount: scopeIds.length }]);
    setQuestion(""); setState("loading"); setErr(null);
    try {
      const res = await queryStore(user, scopeIds, q, provider);
      setHistory((h) => [...h, { role: "assistant", text: res.answer, model: res.model, perDoc: res.perDoc }]);
      setState("done");
    } catch (e) {
      setErr(e.message); setState("error");
      setHistory((h) => [...h, { role: "assistant", text: `(failed: ${e.message})`, error: true }]);
    }
  };

  const memberDocs = (store.docIds || []).map((id) => {
    const f = files.find((x) => (x.file_id ?? x.id) === id);
    return f ? { file: f, status: getDocStatus(id) } : { missingId: id, status: getDocStatus(id) };
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── Store header strip ── */}
      <div style={{
        borderBottom: `1px solid ${t.border}`, background: t.sidebarBg,
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <span style={{ fontSize: 18 }}>📁</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: t.textStrong, fontSize: 13, fontWeight: 800 }}>{store.name}</span>
            <span style={{ background: `${AMBER}20`, color: AMBER, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>● STORE</span>
            <span style={{ background: `${AMBER}14`, color: AMBER, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>NOT INDEXED</span>
          </div>
          <div style={{ color: t.textMuted, fontSize: 10, fontFamily: MONO, marginTop: 1 }}>
            {store.docIds?.length || 0} docs · raw context (no embeddings) · max {MAX_SCOPE} per question
          </div>
        </div>
        <button onClick={() => openReconfigure(store.id)}
          style={{ background: GREEN, border: `1px solid ${GREEN}`, borderRadius: 5, padding: "5px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          + Index this Store
        </button>
        <button onClick={() => { if (confirm(`Delete Store "${store.name}"?`)) deleteUserKB(store.id); }}
          style={{ background: "transparent", border: `1px solid ${t.borderSubtle}`, borderRadius: 5, padding: "5px 10px", color: t.textMuted, fontSize: 11, cursor: "pointer" }}>
          Delete
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflow: "auto", background: t.pageBg }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 20px 12px" }}>
          {/* Hero card — explainer */}
          <div style={{
            background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10,
            padding: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{ fontSize: 26 }}>💬</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: t.textStrong, fontSize: 13, fontWeight: 800 }}>Chat with documents</div>
              <div style={{ color: t.textMuted, fontSize: 11, lineHeight: 1.5, marginTop: 3 }}>
                Sends the parsed text of up to {MAX_SCOPE} selected documents directly to the model — no embedding,
                no retrieval. Best for quick QA on a handful of docs. To search across many docs,{" "}
                <button onClick={() => openReconfigure(store.id)} style={{ background: "transparent", border: "none", color: GREEN, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 11 }}>
                  index this Store
                </button>.
              </div>
            </div>
          </div>

          {filesErr && (
            <div style={{
              background: "#3a1010", border: "1px solid #5a1a1a", borderRadius: 6,
              padding: "8px 12px", color: "#ff8080", fontSize: 11, marginBottom: 14,
            }}>RAG2 API not reachable: {filesErr}</div>
          )}

          <DocumentsList
            memberDocs={memberDocs}
            onOpenDoc={openDoc}
            onOpenExtraction={(f) => openExtraction(getFileBlob(f.file_id ?? f.id), f)}
            t={t}
            title="Documents in this Store" />

          {/* Chat history */}
          <div style={{ marginTop: 20 }}>
            {history.length === 0 ? (
              <div style={{ color: t.textMuted, fontSize: 12, textAlign: "center", padding: "16px 0", borderTop: `1px dashed ${t.borderSubtle}` }}>
                {memberDocs.length === 0
                  ? "No documents in this Store — add some via Reconfigure to start chatting."
                  : "Pick docs to scope below, then ask a question ↓"}
              </div>
            ) : (
              <>
                <div style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, paddingTop: 16, borderTop: `1px dashed ${t.borderSubtle}` }}>
                  Conversation
                </div>
                {history.map((m, i) => <Message key={i} m={m} t={t} />)}
              </>
            )}
            {state === "loading" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: t.textMuted, fontSize: 12 }}>
                <Spinner /> Querying {scopeIds.length} doc{scopeIds.length === 1 ? "" : "s"} via {provider === "xai" ? "Grok" : "Claude"}…
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input dock with multi-doc scope picker ── */}
      <InputDock
        question={question} setQuestion={setQuestion}
        provider={provider} setProvider={setProvider}
        onAsk={ask} state={state} t={t}
        placeholder={`Ask across ${scopeIds.length} selected doc${scopeIds.length === 1 ? "" : "s"}…  (Cmd/Ctrl+Enter)`}
        disabled={files.length === 0 || scopeIds.length === 0}
        leftSlot={
          <div style={{ maxWidth: 820, margin: "0 auto 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                Scope
              </span>
              <span style={{ color: t.textMuted, fontSize: 10, fontFamily: MONO }}>
                {scopeIds.length}/{MAX_SCOPE} selected
              </span>
              {scopeIds.length >= MAX_SCOPE && (
                <span style={{ color: AMBER, fontSize: 10, fontWeight: 600 }}>
                  · max reached — deselect to swap
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {files.length === 0 && <span style={{ color: t.textDisabled, fontSize: 11, fontStyle: "italic" }}>No documents in this Store.</span>}
              {files.map((f) => {
                const id = f.file_id ?? f.id;
                const name = f.original_name ?? f.filename ?? `File ${id}`;
                const on = scopeIds.includes(id);
                const disabled = !on && scopeIds.length >= MAX_SCOPE;
                return (
                  <button key={id} onClick={() => toggleScope(id)} disabled={disabled}
                    title={disabled ? `Max ${MAX_SCOPE} docs per question` : name}
                    style={{
                      background: on ? "#3a7aba" : t.inputBg,
                      border: `1px solid ${on ? "#3a7aba" : t.borderSubtle}`,
                      borderRadius: 12, padding: "3px 9px",
                      color: on ? "#fff" : (disabled ? t.textDisabled : t.text),
                      fontSize: 10, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.5 : 1, maxWidth: 200,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                    {on ? "✓ " : ""}{name}
                  </button>
                );
              })}
            </div>
          </div>
        } />
    </div>
  );
}

function fileName(files, id) {
  const f = files.find((x) => (x.file_id ?? x.id) === id);
  return f ? (f.original_name ?? f.filename ?? `File ${id}`) : `File ${id}`;
}

function Message({ m, t }) {
  if (m.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, gap: 6 }}>
        <div style={{ maxWidth: "78%" }}>
          {m.scope && (
            <div style={{ color: t.textGhost, fontSize: 9, fontFamily: MONO, textAlign: "right", marginBottom: 3 }}>
              scope: {m.docCount} doc{m.docCount === 1 ? "" : "s"} · {m.scope}
            </div>
          )}
          <div style={{
            background: "#3a7aba", color: "#fff",
            borderRadius: "14px 14px 3px 14px",
            padding: "9px 14px", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap",
          }}>
            {m.text}
          </div>
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

function Spinner() {
  return (
    <>
      <span style={{
        display: "inline-block", width: 14, height: 14,
        border: "2px solid #333", borderTopColor: GREEN, borderRadius: "50%",
        animation: "svspin 0.7s linear infinite",
      }} />
      <style>{`@keyframes svspin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
