import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { listFiles, queryFile, routeQuestion } from "../services/ragApi";
import { InputDock } from "./DocumentView";
import DocumentsList from "./DocumentsList";
import QueryConfigPanel from "./QueryConfigPanel";

const MONO = "'IBM Plex Mono', monospace";
const GREEN = "#16A34A";
const BLUE = "#2563EB";

// KB detail view. User-created KBs show their member documents with
// per-doc ingestion status + overall ingestion summary; catalog KBs
// show a spec surface. Chat is docked at the bottom.

export default function KnowledgeBaseView({ kb }) {
  const { user } = useAuth();
  const { t } = useTheme();
  const {
    openObsidian, deleteUserKB, openDoc,
    getDocStatus, openReconfigure, openCloneFromKB,
    indexedStores, queryConfigs, autoConfigForKB,
    createQueryConfig, updateQueryConfig, touchQueryConfig,
    promoteToSaved, deleteQueryConfig,
  } = useWorkspace();

  const isUser = kb.id?.startsWith("u-");
  const isLocked = kb.status === "restricted" && kb.owner !== user.userid;
  const canQuery = isUser;

  const [files, setFiles] = useState([]);
  const [filesErr, setFilesErr] = useState(null);
  const [selectedKbIds, setSelectedKbIds] = useState([kb.id]);
  const [history, setHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [state, setState] = useState("idle");
  const [err, setErr] = useState(null);
  const [activeConfig, setActiveConfig] = useState(null); // current session/saved config
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showConfigPicker, setShowConfigPicker] = useState(false);
  const bottomRef = useRef();

  // Reset session state on KB switch + seed active config from auto-detect.
  useEffect(() => {
    setHistory([]); setQuestion(""); setErr(null); setState("idle");
    setSelectedKbIds([kb.id]);
    setActiveConfig(canQuery ? buildAutoConfig(kb, autoConfigForKB) : null);
  }, [kb.id]);

  useEffect(() => {
    if (!canQuery) return;
    listFiles(user)
      .then((fs) => {
        const memberIds = new Set((kb.docIds || []).map(String));
        const scoped = isUser && memberIds.size > 0
          ? fs.filter((f) => memberIds.has(String(f.file_id ?? f.id)))
          : fs;
        setFiles(scoped);
      })
      .catch((e) => setFilesErr(e.message));
  }, [user, canQuery, kb.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, state]);

  const provider = activeConfig?.llmProvider || "xai";
  const setProvider = (p) =>
    setActiveConfig((c) => c ? { ...c, llmProvider: p } : c);

  // Selected KB objects, resolved against indexedStores. We always include
  // the primary KB even if it's missing from indexedStores (defensive).
  const selectedKbs = useMemo(() => {
    const byId = new Map(indexedStores.map((k) => [k.id, k]));
    if (!byId.has(kb.id)) byId.set(kb.id, kb);
    return selectedKbIds.map((id) => byId.get(id)).filter(Boolean);
  }, [selectedKbIds, indexedStores, kb]);

  const ask = async () => {
    const q = question.trim();
    if (!q || selectedKbs.length === 0) return;

    setHistory((h) => [...h, { role: "user", text: q, scope: selectedKbs.map((k) => k.name).join(", "), kbCount: selectedKbs.length }]);
    setQuestion(""); setState("loading"); setErr(null);

    try {
      // Multi-KB → route first; single → skip routing.
      let pickedKbs = selectedKbs;
      let routerFallback = false;
      if (selectedKbs.length > 1) {
        const { kbIds, fallback } = await routeQuestion(user, q, selectedKbs, provider);
        pickedKbs = selectedKbs.filter((k) => kbIds.includes(k.id));
        routerFallback = fallback;
      }
      // Run query per picked KB. Real retrieval would happen here; for now
      // we delegate to /v1/qa via the KB's first member doc (existing mock).
      const perKb = await Promise.all(pickedKbs.map(async (k) => {
        const firstDocId = k.docIds?.[0];
        if (!firstDocId) return { kbId: k.id, kbName: k.name, error: "no member docs" };
        try {
          const r = await queryFile(user, Number(firstDocId), q, provider);
          return { kbId: k.id, kbName: k.name, answer: r.answer, model: r.model };
        } catch (e) {
          return { kbId: k.id, kbName: k.name, error: e.message };
        }
      }));
      const ok = perKb.filter((x) => !x.error);
      if (ok.length === 0) {
        throw new Error(`No KB returned an answer: ${perKb.map((x) => x.error).filter(Boolean).join("; ")}`);
      }
      const merged = ok.length === 1
        ? ok[0].answer
        : ok.map((x) => `### ${x.kbName}\n${x.answer}`).join("\n\n");
      setHistory((h) => [...h, {
        role: "assistant", text: merged, model: ok[0].model,
        routedTo: pickedKbs.map((k) => k.name), routerFallback,
        configName: activeConfig?.name, configMode: activeConfig?.mode,
      }]);
      if (activeConfig?.id) touchQueryConfig(activeConfig.id);
      setState("done");
    } catch (e) {
      setErr(e.message); setState("error");
      setHistory((h) => [...h, { role: "assistant", text: `(failed: ${e.message})`, error: true }]);
    }
  };

  // Editing the active config either forks into a new session config (if
  // the user is starting from a saved/auto config) or mutates in place
  // (for an active session config) so saved configs are never modified silently.
  const onConfigChange = (next) => {
    if (!activeConfig || activeConfig.id == null) {
      const persisted = createQueryConfig({
        kind: "session", name: `Session · ${new Date().toLocaleTimeString()}`,
        kbIds: selectedKbIds, mode: next.mode, retrievalParams: next.retrievalParams,
        llmProvider: next.llmProvider || provider,
      });
      setActiveConfig(persisted);
      return;
    }
    if (activeConfig.kind === "saved" && next.mode === "manual") {
      const forked = createQueryConfig({
        kind: "session", name: `Edited from "${activeConfig.name}"`,
        kbIds: selectedKbIds, mode: "manual",
        retrievalParams: next.retrievalParams, llmProvider: next.llmProvider || provider,
      });
      setActiveConfig(forked);
      return;
    }
    updateQueryConfig(activeConfig.id, {
      mode: next.mode, retrievalParams: next.retrievalParams,
      llmProvider: next.llmProvider || provider,
    });
    setActiveConfig({ ...activeConfig, ...next });
  };

  const onSaveConfig = () => {
    if (!activeConfig?.id) return;
    const name = prompt("Name this saved config:", activeConfig.name || "");
    if (!name) return;
    promoteToSaved(activeConfig.id, name);
    setActiveConfig({ ...activeConfig, kind: "saved", name });
  };

  const onDeleteConfig = () => {
    if (!activeConfig?.id) return;
    if (!confirm(`Delete saved config "${activeConfig.name}"?`)) return;
    deleteQueryConfig(activeConfig.id);
    setActiveConfig(buildAutoConfig(kb, autoConfigForKB));
    setShowConfigPanel(false);
  };

  const savedConfigs = queryConfigs.filter((c) => c.kind === "saved");
  const pastConfigs = queryConfigs
    .filter((c) => c.kind === "session" && c.id !== activeConfig?.id)
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
    .slice(0, 5);

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

      {/* ── Input dock with multi-KB chips + query-config strip ── */}
      {!isLocked && (
        <InputDock
          question={question} setQuestion={setQuestion}
          provider={provider} setProvider={setProvider}
          onAsk={ask} state={state} t={t}
          placeholder={canQuery ? `Ask ${selectedKbs.length === 1 ? `"${kb.name}"` : `${selectedKbs.length} KBs`}…  (Cmd/Ctrl+Enter)` : "Catalog KBs are spec — create a user KB to chat."}
          disabled={!canQuery || selectedKbs.length === 0}
          leftSlot={canQuery && (
            <div style={{ maxWidth: 820, margin: "0 auto 8px" }}>
              {/* KB chip selector */}
              <KBChipBar
                indexedStores={indexedStores}
                selectedKbIds={selectedKbIds}
                setSelectedKbIds={setSelectedKbIds}
                primary={kb}
                t={t} />
              {/* Query-config strip */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                <span style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                  Config
                </span>
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowConfigPicker((v) => !v)}
                    style={configPickerBtn(t, activeConfig)}>
                    {activeConfig?.kind === "saved" ? "★ " : ""}
                    {activeConfig?.name || "Auto"} ▾
                  </button>
                  {showConfigPicker && (
                    <ConfigDropdown
                      activeConfig={activeConfig}
                      savedConfigs={savedConfigs}
                      pastConfigs={pastConfigs}
                      onPick={(c) => { setActiveConfig(c); setShowConfigPicker(false); }}
                      onPickAuto={() => {
                        setActiveConfig(buildAutoConfig(kb, autoConfigForKB));
                        setShowConfigPicker(false);
                      }}
                      onOpenManual={() => { setShowConfigPicker(false); setShowConfigPanel(true); }}
                      onClose={() => setShowConfigPicker(false)}
                      t={t} />
                  )}
                </div>
                <button onClick={() => setShowConfigPanel(true)} style={configActionBtn(t)}>
                  ⚙ Customize
                </button>
                {activeConfig?.kind === "session" && activeConfig.id && (
                  <button onClick={onSaveConfig} style={configActionBtn(t)}>
                    ★ Save
                  </button>
                )}
                {filesErr && <span style={{ color: "#DC2626", fontSize: 10, marginLeft: 6 }}>RAG2 offline</span>}
              </div>
            </div>
          )}
        />
      )}

      {/* Slide-in config editor */}
      {showConfigPanel && activeConfig && (
        <QueryConfigPanel
          config={activeConfig}
          onChange={onConfigChange}
          onClose={() => setShowConfigPanel(false)}
          onSave={activeConfig.kind === "session" && activeConfig.id ? onSaveConfig : null}
          onDelete={activeConfig.kind === "saved" ? onDeleteConfig : null}
          t={t} />
      )}
    </div>
  );
}

// Build the initial auto config from KB defaults. Returns a transient
// config object (no id yet) — it gets persisted only when the user
// customizes or saves it.
function buildAutoConfig(kb, autoConfigForKB) {
  const base = autoConfigForKB(kb);
  return {
    id: null, kind: "session", name: "Auto",
    kbIds: [kb.id], ...base,
  };
}

// ─── KB multi-select chip bar ──────────────────────────────────────────────
function KBChipBar({ indexedStores, selectedKbIds, setSelectedKbIds, primary, t }) {
  const [adding, setAdding] = useState(false);
  const others = indexedStores.filter((k) => !selectedKbIds.includes(k.id) && k.id !== primary.id);
  const selected = selectedKbIds.map((id) =>
    indexedStores.find((k) => k.id === id) || (id === primary.id ? primary : null)
  ).filter(Boolean);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5 }}>
      <span style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginRight: 4 }}>
        KBs
      </span>
      {selected.map((k) => (
        <span key={k.id} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: BLUE + "20", color: BLUE, fontSize: 10, fontWeight: 600,
          padding: "3px 7px", borderRadius: 12, border: `1px solid ${BLUE}40`,
        }}>
          🗂 {k.name}
          {selectedKbIds.length > 1 && (
            <button onClick={() => setSelectedKbIds((cur) => cur.filter((x) => x !== k.id))}
              style={{ background: "transparent", border: "none", color: BLUE, cursor: "pointer", padding: 0, fontSize: 11, lineHeight: 1 }}>
              ✕
            </button>
          )}
        </span>
      ))}
      {others.length > 0 && (
        <div style={{ position: "relative" }}>
          <button onClick={() => setAdding((v) => !v)}
            style={{
              background: "transparent", color: t.textMuted,
              border: `1px dashed ${t.borderMid}`, borderRadius: 12,
              padding: "2px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer",
            }}>
            + add KB
          </button>
          {adding && (
            <div style={{
              position: "absolute", bottom: "100%", left: 0, marginBottom: 4,
              background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 6,
              padding: 4, minWidth: 220, maxHeight: 240, overflow: "auto",
              boxShadow: "0 4px 14px rgba(0,0,0,0.25)", zIndex: 10,
            }}>
              {others.map((k) => (
                <button key={k.id}
                  onClick={() => { setSelectedKbIds((cur) => [...cur, k.id]); setAdding(false); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: "transparent", border: "none", padding: "5px 8px",
                    color: t.text, fontSize: 11, cursor: "pointer", borderRadius: 4,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = t.panelBg}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  🗂 {k.name}
                  <span style={{ color: t.textDisabled, fontSize: 9, marginLeft: 6, fontFamily: MONO }}>
                    {k.docIds?.length || 0} docs
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Config picker dropdown ────────────────────────────────────────────────
function ConfigDropdown({ activeConfig, savedConfigs, pastConfigs, onPick, onPickAuto, onOpenManual, onClose, t }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
      <div style={{
        position: "absolute", bottom: "100%", left: 0, marginBottom: 4,
        background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 6,
        minWidth: 280, maxHeight: 320, overflow: "auto",
        boxShadow: "0 4px 14px rgba(0,0,0,0.25)", zIndex: 10, padding: 4,
      }}>
        <ConfigOption
          icon="◉" label="Auto" hint="Detected from KB"
          active={activeConfig?.name === "Auto" && !activeConfig?.id}
          onClick={onPickAuto} t={t} />

        {savedConfigs.length > 0 && (
          <>
            <SectionHeader label="Saved configs" t={t} />
            {savedConfigs.map((c) => (
              <ConfigOption key={c.id}
                icon="★" label={c.name} hint={summarizeConfig(c)}
                active={activeConfig?.id === c.id}
                onClick={() => onPick(c)} t={t} />
            ))}
          </>
        )}

        {pastConfigs.length > 0 && (
          <>
            <SectionHeader label="Past configs (30 days)" t={t} />
            {pastConfigs.map((c) => (
              <ConfigOption key={c.id}
                icon="⏱" label={c.name} hint={summarizeConfig(c)}
                active={activeConfig?.id === c.id}
                onClick={() => onPick(c)} t={t} />
            ))}
          </>
        )}

        <SectionHeader label="" t={t} />
        <ConfigOption
          icon="⚙" label="Manual…" hint="Open the customize panel"
          onClick={onOpenManual} t={t} />
      </div>
    </>
  );
}

function SectionHeader({ label, t }) {
  return (
    <div style={{ padding: "8px 8px 4px", color: t.textGhost, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
      {label}
    </div>
  );
}

function ConfigOption({ icon, label, hint, active, onClick, t }) {
  return (
    <button onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left",
        background: active ? `${BLUE}14` : "transparent", border: "none",
        padding: "6px 9px", cursor: "pointer", borderRadius: 4,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = t.panelBg; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      <div style={{ color: active ? t.textStrong : t.text, fontSize: 11, fontWeight: active ? 700 : 600 }}>
        {icon} {label}
      </div>
      {hint && <div style={{ color: t.textDisabled, fontSize: 9, marginTop: 1, fontFamily: MONO }}>{hint}</div>}
    </button>
  );
}

function summarizeConfig(c) {
  const rp = c.retrievalParams || {};
  return `topK ${rp.topK ?? "?"} · rerank ${rp.rerankTopN ?? "?"} · α ${rp.hybridAlpha ?? "?"}`;
}

function configPickerBtn(t, activeConfig) {
  const saved = activeConfig?.kind === "saved";
  return {
    background: t.inputBg, color: t.text,
    border: `1px solid ${saved ? BLUE : t.borderSubtle}`, borderRadius: 5,
    padding: "3px 9px", fontSize: 10, fontWeight: 600, cursor: "pointer",
    maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  };
}

function configActionBtn(t) {
  return {
    background: "transparent", color: t.textMuted,
    border: `1px solid ${t.borderSubtle}`, borderRadius: 5,
    padding: "3px 9px", fontSize: 10, fontWeight: 600, cursor: "pointer",
  };
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
              {m.kbCount > 1 ? `${m.kbCount} KBs · ` : ""}{m.scope}
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
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
          {m.model && (
            <span style={{ color: t.textGhost, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, fontFamily: MONO }}>
              {m.model}
            </span>
          )}
          {m.routedTo?.length > 0 && (
            <span style={{ color: BLUE, fontSize: 9, fontFamily: MONO }}>
              → routed to {m.routedTo.join(", ")}{m.routerFallback ? " (fallback)" : ""}
            </span>
          )}
          {m.configName && (
            <span style={{ color: t.textDisabled, fontSize: 9, fontFamily: MONO }}>
              · {m.configMode === "auto" ? "auto" : m.configName}
            </span>
          )}
        </div>
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
