import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { listFiles, queryFile } from "../services/ragApi";
import { InputDock } from "./DocumentView";

const MONO = "'IBM Plex Mono', monospace";
const GREEN = "#16A34A";

// KB detail view. User-created KBs show their member documents with
// per-doc ingestion status + overall ingestion summary; catalog KBs
// show a spec surface. Chat is docked at the bottom.

export default function KnowledgeBaseView({ kb }) {
  const { user } = useAuth();
  const { t } = useTheme();
  const { openObsidian, deleteUserKB, openDoc, openExtraction, getDocStatus, getFileBlob, openReconfigure, openCloneFromKB } = useWorkspace();

  const isUser = kb.id?.startsWith("u-");
  const isLocked = kb.status === "restricted" && kb.owner !== user.userid;
  const canQuery = isUser;

  const [files, setFiles] = useState([]);
  const [filesErr, setFilesErr] = useState(null);
  const [scopeId, setScopeId] = useState("");
  const [history, setHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [provider, setProvider] = useState("xai");
  const [state, setState] = useState("idle");
  const [err, setErr] = useState(null);
  const bottomRef = useRef();

  useEffect(() => {
    if (!canQuery) return;
    listFiles(user)
      .then((fs) => {
        const memberIds = new Set((kb.docIds || []).map(String));
        const scoped = isUser && memberIds.size > 0
          ? fs.filter((f) => memberIds.has(String(f.file_id ?? f.id)))
          : fs;
        setFiles(scoped);
        if (scoped.length) setScopeId(String(scoped[0].file_id ?? scoped[0].id));
      })
      .catch((e) => setFilesErr(e.message));
  }, [user, canQuery, kb.id]);

  useEffect(() => {
    setHistory([]); setQuestion(""); setErr(null); setState("idle");
  }, [kb.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, state]);

  const ask = async () => {
    const q = question.trim();
    if (!q || !scopeId) return;
    setHistory((h) => [...h, { role: "user", text: q, scope: fileLabel(files, scopeId) }]);
    setQuestion(""); setState("loading"); setErr(null);
    try {
      const res = await queryFile(user, Number(scopeId), q, provider);
      setHistory((h) => [...h, { role: "assistant", text: res.answer, model: res.model, provider }]);
      setState("done");
    } catch (e) {
      setErr(e.message); setState("error");
      setHistory((h) => [...h, { role: "assistant", text: `(failed: ${e.message})`, error: true }]);
    }
  };

  // Member docs with computed status (present in listFiles)
  const memberDocs = isUser
    ? (kb.docIds || []).map((id) => {
        const f = files.find((x) => (x.file_id ?? x.id) === id);
        return f ? { file: f, status: getDocStatus(id) } : { missingId: id, status: getDocStatus(id) };
      })
    : [];
  const totalMembers  = memberDocs.length;
  const indexedCount  = memberDocs.filter((m) => m.status.label === "indexed").length;
  const anyProgress   = memberDocs.some((m) => m.status.label !== "new");
  const ingestionPct  = totalMembers > 0 ? Math.round((indexedCount / totalMembers) * 100) : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── KB header strip ── */}
      <div style={{
        borderBottom: `1px solid ${t.border}`, background: t.sidebarBg,
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <span style={{ fontSize: 18 }}>🗂</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: t.textStrong, fontSize: 13, fontWeight: 800 }}>{kb.name}</span>
            {isUser && <span style={{ background: `${GREEN}20`, color: GREEN, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>● YOUR KB</span>}
            {!isUser && !isLocked && <span style={{ background: "#2563EB20", color: "#2563EB", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>CATALOG</span>}
            {isLocked && <span style={{ background: "#B4530920", color: "#B45309", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>RESTRICTED</span>}
            {isUser && totalMembers > 0 && (
              <span style={{
                background: indexedCount === totalMembers ? `${GREEN}20` : "#EA580C20",
                color:      indexedCount === totalMembers ? GREEN : "#EA580C",
                fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
              }}>
                {indexedCount === totalMembers ? "● FULLY INDEXED" : `${indexedCount}/${totalMembers} INDEXED`}
              </span>
            )}
          </div>
          <div style={{ color: t.textMuted, fontSize: 10, fontFamily: MONO, marginTop: 1 }}>
            {isUser
              ? `${kb.docIds?.length || 0} docs · ${kb.chunk} · ${kb.embedding} · ${kb.vectorStore}`
              : `owner ${kb.owner} · ${kb.records} records · ${kb.tags?.join(" · ")}`}
          </div>
        </div>
        {isUser && (
          <button onClick={() => openReconfigure(kb.id)}
            style={{ background: "#2563EB", border: "1px solid #2563EB", borderRadius: 5, padding: "5px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            ⚙ Reconfigure
          </button>
        )}
        {!isUser && !isLocked && (
          <button onClick={() => openCloneFromKB(kb)}
            style={{ background: "#2563EB", border: "1px solid #2563EB", borderRadius: 5, padding: "5px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            ⚙ Configure from template
          </button>
        )}
        {isUser && (
          <button onClick={() => { if (confirm(`Delete "${kb.name}"?`)) deleteUserKB(kb.id); }}
            style={{ background: "transparent", border: `1px solid ${t.borderSubtle}`, borderRadius: 5, padding: "5px 10px", color: t.textMuted, fontSize: 11, cursor: "pointer" }}>
            Delete
          </button>
        )}
        <button onClick={openObsidian}
          style={{ background: "transparent", border: `1px solid ${GREEN}`, borderRadius: 5, padding: "5px 12px", color: GREEN, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          ◉ Graph
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflow: "auto", background: t.pageBg }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 20px 12px" }}>
          {isLocked && <LockedCard kb={kb} t={t} />}

          {/* User KB: ingestion summary + documents list */}
          {!isLocked && isUser && (
            <>
              <IngestionSummary
                totalMembers={totalMembers}
                indexedCount={indexedCount}
                anyProgress={anyProgress}
                pct={ingestionPct}
                kb={kb}
                t={t} />

              <DocumentsList
                memberDocs={memberDocs}
                onOpenDoc={openDoc}
                onOpenExtraction={(f) => openExtraction(getFileBlob(f.file_id ?? f.id), f)}
                t={t} />
            </>
          )}

          {/* Catalog KB: stats surface */}
          {!isLocked && !isUser && history.length === 0 && (
            <HeroStats kb={kb} t={t} canQuery={canQuery} filesCount={files.length} />
          )}

          {/* Chat — below content */}
          {!isLocked && (
            <div style={{ marginTop: 20 }}>
              {history.length === 0 ? (
                <div style={{ color: t.textMuted, fontSize: 12, textAlign: "center", padding: "16px 0", borderTop: `1px dashed ${t.borderSubtle}` }}>
                  {canQuery ? "Ask this knowledge base a question below ↓" : "Catalog KB — chat requires a user KB over your docs"}
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
                  <Spinner /> Thinking via {provider === "xai" ? "Grok" : "Claude"}…
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input dock with scope picker ── */}
      {!isLocked && (
        <InputDock
          question={question} setQuestion={setQuestion}
          provider={provider} setProvider={setProvider}
          onAsk={ask} state={state} t={t}
          placeholder={canQuery ? `Ask "${kb.name}"…  (Cmd/Ctrl+Enter)` : "Catalog KBs are spec — create a user KB to chat."}
          disabled={!canQuery || files.length === 0}
          leftSlot={canQuery && (
            <div style={{ maxWidth: 820, margin: "0 auto 8px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                Scope
              </span>
              <select value={scopeId} onChange={(e) => setScopeId(e.target.value)}
                style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.borderSubtle}`, borderRadius: 5, padding: "4px 8px", color: t.text, fontSize: 11, outline: "none" }}>
                {files.length === 0 && <option value="">(no member documents)</option>}
                {files.map((f) => {
                  const id = f.file_id ?? f.id;
                  const name = f.original_name ?? f.filename ?? `File ${id}`;
                  return <option key={id} value={String(id)}>{name} · id {id}</option>;
                })}
              </select>
              {filesErr && <span style={{ color: "#DC2626", fontSize: 10 }}>RAG2 offline</span>}
            </div>
          )}
        />
      )}
    </div>
  );
}

function fileLabel(files, id) {
  const f = files.find((x) => String(x.file_id ?? x.id) === String(id));
  return f ? (f.original_name ?? f.filename ?? `File ${id}`) : "";
}

// ─── Ingestion summary card ────────────────────────────────────────────────
function IngestionSummary({ totalMembers, indexedCount, anyProgress, pct, kb, t }) {
  const statusLabel = totalMembers === 0
    ? "No documents"
    : indexedCount === totalMembers
      ? "Fully indexed · ready to query"
      : indexedCount === 0 && !anyProgress
        ? "Not yet ingested"
        : `Partially ingested · ${indexedCount}/${totalMembers} indexed`;
  const color = indexedCount === totalMembers && totalMembers > 0
    ? GREEN
    : anyProgress
      ? "#EA580C"
      : "#9CA3AF";

  return (
    <div style={{
      background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10,
      padding: 16, marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 10, height: 10, borderRadius: 5, background: color,
          boxShadow: `0 0 8px ${color}60`,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: t.textGhost, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            Ingestion status
          </div>
          <div style={{ color, fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            {statusLabel}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: t.textGhost, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Progress</div>
          <div style={{ color: t.textStrong, fontSize: 20, fontWeight: 800, fontFamily: MONO }}>
            {pct}%
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: t.borderSubtle, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.4s" }} />
      </div>

      {/* Mini stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 14 }}>
        {[
          { k: "Docs",       v: totalMembers },
          { k: "Chunker",    v: kb.chunk },
          { k: "Embedding",  v: (kb.embedding || "").split("-")[0] || "—" },
          { k: "Vector",     v: kb.vectorStore },
        ].map((s) => (
          <div key={s.k}>
            <div style={{ color: t.textGhost, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{s.k}</div>
            <div style={{ color: t.text, fontSize: 13, fontWeight: 700, fontFamily: MONO, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Documents list ────────────────────────────────────────────────────────
function DocumentsList({ memberDocs, onOpenDoc, onOpenExtraction, t }) {
  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}`, background: t.panelBg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: t.textStrong, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
          Documents in this KB
        </div>
        <span style={{ color: t.textMuted, fontSize: 11, fontFamily: MONO }}>{memberDocs.length}</span>
      </div>

      {memberDocs.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontSize: 12 }}>
          No member documents.
        </div>
      )}

      {memberDocs.map((m, i) => {
        if (m.missingId) {
          return (
            <div key={`missing-${m.missingId}`} style={{ display: "grid", gridTemplateColumns: "24px 1fr 80px 120px 90px", gap: 10, padding: "10px 14px", borderBottom: i < memberDocs.length - 1 ? `1px solid ${t.borderFaint}` : "none", alignItems: "center" }}>
              <span style={{ color: t.textDisabled, fontSize: 13 }}>⚠</span>
              <span style={{ color: t.textDisabled, fontSize: 12, fontStyle: "italic" }}>doc id {m.missingId} — not in your document list</span>
              <span /><span /><span />
            </div>
          );
        }
        const f = m.file;
        const id = f.file_id ?? f.id;
        const name = f.original_name ?? f.filename ?? `File ${id}`;
        const size = f.size ?? f.file_size ?? 0;
        const ext = name.split(".").pop()?.toUpperCase() || "";
        return (
          <div key={id}
            onClick={() => onOpenDoc(f)}
            style={{
              display: "grid", gridTemplateColumns: "24px 1fr 80px 120px 90px",
              gap: 10, padding: "10px 14px",
              borderBottom: i < memberDocs.length - 1 ? `1px solid ${t.borderFaint}` : "none",
              alignItems: "center", cursor: "pointer",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = t.panelBg}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <span style={{ color: "#7C3AED", fontSize: 13 }}>▤</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: t.text, fontSize: 12, fontWeight: 600, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name}
              </div>
              <div style={{ color: t.textDisabled, fontSize: 9, fontFamily: MONO, marginTop: 1 }}>
                id {id} · {ext}
              </div>
            </div>
            <span style={{ color: t.textMuted, fontSize: 11, fontFamily: MONO, textAlign: "right" }}>
              {Math.round(size / 1024)} KB
            </span>
            <span style={{
              background: `${m.status.color}20`, color: m.status.color,
              fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 10,
              letterSpacing: 0.8, textTransform: "uppercase", justifySelf: "center",
            }}>
              {m.status.dot} {m.status.label}
            </span>
            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
              <button onClick={(e) => { e.stopPropagation(); onOpenExtraction(f); }}
                title="Open in extraction studio"
                style={{
                  background: "transparent", border: `1px solid ${t.borderSubtle}`, borderRadius: 4,
                  padding: "3px 8px", color: "#EA580C", cursor: "pointer", fontSize: 10, fontWeight: 700,
                }}>⚙ Extract</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Spec hero (catalog KBs) ──────────────────────────────────────────────
function HeroStats({ kb, t, canQuery, filesCount }) {
  return (
    <div>
      <div style={{
        background: `linear-gradient(135deg, ${GREEN}14 0%, transparent 100%)`,
        border: `1px solid ${GREEN}40`, borderRadius: 12, padding: 18, marginBottom: 14,
      }}>
        <div style={{ color: GREEN, fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
          Catalog · spec view
        </div>
        <h1 style={{ color: t.textStrong, fontSize: 24, fontWeight: 800, margin: "4px 0 0", letterSpacing: "-0.5px" }}>
          {kb.name}
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { k: "Records",   v: kb.records },
          { k: "Engine",    v: "HNSW" },
          { k: "Retriever", v: "Hybrid" },
          { k: "Reranker",  v: "Cohere v3" },
        ].map((s) => (
          <div key={s.k} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 6, padding: 10 }}>
            <div style={{ color: t.textGhost, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{s.k}</div>
            <div style={{ color: t.textStrong, fontSize: 15, fontWeight: 800, fontFamily: MONO, marginTop: 2 }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14 }}>
        <div style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          Access
        </div>
        {[
          { k: "REST",    v: `POST /v1/knowledge/${kb.id}/retrieve` },
          { k: "Agent",   v: `tools: [{ type: "knowledge", kb_id: "${kb.id}" }]` },
        ].map((r) => (
          <div key={r.k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
            <span style={{ color: t.textMuted, fontSize: 11 }}>{r.k}</span>
            <span style={{ color: t.text, fontSize: 11, fontFamily: MONO }}>{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Message({ m, t }) {
  if (m.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, gap: 6 }}>
        <div style={{ maxWidth: "78%" }}>
          {m.scope && (
            <div style={{ color: t.textGhost, fontSize: 9, fontFamily: MONO, textAlign: "right", marginBottom: 3 }}>
              scope: {m.scope}
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

function LockedCard({ kb, t }) {
  return (
    <div style={{
      background: t.cardBg, border: `2px solid #B45309`, borderRadius: 12,
      padding: 24, textAlign: "center", maxWidth: 520, margin: "30px auto",
    }}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>🔒</div>
      <h2 style={{ color: t.textStrong, fontSize: 17, fontWeight: 800, margin: 0 }}>{kb.name}</h2>
      <p style={{ color: t.textDim, fontSize: 12, lineHeight: 1.6, marginTop: 6 }}>
        Owned by <strong>{kb.owner}</strong>. Request access to query this KB.
      </p>
      <button style={{
        background: "#B45309", color: "#fff", border: "none", borderRadius: 5,
        padding: "8px 18px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 6,
      }}>Request access</button>
    </div>
  );
}

function Spinner() {
  return (
    <>
      <span style={{
        display: "inline-block", width: 14, height: 14,
        border: "2px solid #333", borderTopColor: GREEN, borderRadius: "50%",
        animation: "kbspin 0.7s linear infinite",
      }} />
      <style>{`@keyframes kbspin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
