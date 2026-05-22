import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useWorkspace, KB_CATALOG, CONNECTED_SOURCES } from "../context/WorkspaceContext";
import { deleteFile } from "../services/ragApi";

const MONO = "'IBM Plex Mono', monospace";

function fmt(bytes = 0) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function Section({ title, count, action, children, t, open = true, onToggle }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 10px 6px", color: t.textGhost,
        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
      }}>
        <button onClick={onToggle} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 10 }}>
          {open ? "▾" : "▸"}
        </button>
        <span style={{ flex: 1 }}>{title}</span>
        {count != null && <span style={{ color: t.textDisabled, fontWeight: 700 }}>{count}</span>}
        {action}
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

// ─── Row components ───────────────────────────────────────────────────────

function KBRow({ kb, active, expanded, memberDocs, getDocStatus, onClick, onToggleExpand, onOpenDoc, onIndexStore, activeDocId, t }) {
  const [hover, setHover] = useState(false);
  const isUser = kb.id?.startsWith("u-");
  const isRawStore = isUser && kb.indexed === false;
  const color = kb.status === "restricted"
    ? "#B45309"
    : isRawStore ? "#EA580C" : "#2563EB";
  const canExpand = isUser && (kb.docIds?.length || 0) > 0;

  return (
    <>
      <div
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px 6px 6px", cursor: "pointer",
          background: active ? `${color}14` : (hover ? t.panelBg : "transparent"),
          borderLeft: `2px solid ${active ? color : "transparent"}`,
        }}>
        <button onClick={(e) => { e.stopPropagation(); if (canExpand) onToggleExpand(); }}
          style={{
            background: "transparent", border: "none",
            color: canExpand ? t.textMuted : "transparent",
            cursor: canExpand ? "pointer" : "default",
            padding: 0, fontSize: 10, width: 14, flexShrink: 0,
          }}>
          {canExpand ? (expanded ? "▾" : "▸") : ""}
        </button>
        <span style={{ fontSize: 12, color, flexShrink: 0 }}>{isRawStore ? "📁" : "🗂"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: active ? t.textStrong : t.text, fontSize: 12, fontWeight: active ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {kb.name}
          </div>
          <div style={{ color: t.textDisabled, fontSize: 9, fontFamily: MONO, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {isRawStore
              ? `${kb.docIds?.length || 0} docs · raw context`
              : isUser
                ? `${kb.docIds?.length || 0} docs · ${kb.chunk}`
                : `owner ${kb.owner} · ${kb.records}`}
          </div>
        </div>
        {isRawStore && hover && onIndexStore && (
          <button onClick={(e) => { e.stopPropagation(); onIndexStore(kb); }}
            title="Promote this Store to a KB"
            style={{
              background: "#16A34A", border: "none", borderRadius: 3,
              padding: "1px 6px", color: "#fff", fontSize: 8, fontWeight: 700,
              cursor: "pointer", flexShrink: 0, letterSpacing: 0.3,
            }}>+ INDEX</button>
        )}
        {isRawStore && (!hover || !onIndexStore) && (
          <span style={{ background: "#EA580C20", color: "#EA580C", fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 2, flexShrink: 0 }}>
            STORE
          </span>
        )}
        {isUser && !isRawStore && (
          <IndexingBadge memberDocs={memberDocs} getDocStatus={getDocStatus} t={t} />
        )}
        {!isUser && kb.status === "restricted" && (
          <span style={{ background: "#B4530920", color: "#B45309", fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 2, flexShrink: 0 }}>LOCKED</span>
        )}
      </div>

      {canExpand && expanded && (
        <div style={{ marginLeft: 22, borderLeft: `1px dashed ${t.borderSubtle}`, marginBottom: 4 }}>
          {memberDocs.length === 0 ? (
            <div style={{ color: t.textDisabled, fontSize: 10, fontStyle: "italic", padding: "5px 10px 5px 14px" }}>
              (member docs not in your document list)
            </div>
          ) : memberDocs.map((f) => {
            const id = f.file_id ?? f.id;
            const name = f.original_name ?? f.filename ?? `File ${id}`;
            const status = getDocStatus(id);
            const isActive = activeDocId === id;
            return (
              <div key={id}
                onClick={(e) => { e.stopPropagation(); onOpenDoc(f); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 10px 4px 10px", cursor: "pointer",
                  background: isActive ? "#7C3AED14" : "transparent",
                  borderLeft: `2px solid ${isActive ? "#7C3AED" : "transparent"}`,
                  marginLeft: -1,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = t.panelBg; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontSize: 10, color: "#7C3AED", flexShrink: 0 }}>▤</span>
                <span style={{
                  flex: 1, color: isActive ? t.textStrong : t.text, fontSize: 11, fontWeight: isActive ? 600 : 500,
                  fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{name}</span>
                <span style={{
                  background: `${status.color}20`, color: status.color,
                  fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 6,
                  letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 0,
                }}>
                  {status.dot} {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// Small aggregate badge shown on the KB row summarizing how many members are indexed.
function IndexingBadge({ memberDocs, getDocStatus, t }) {
  const total = memberDocs.length;
  if (total === 0) return null;
  const indexed = memberDocs.filter((f) => getDocStatus(f.file_id ?? f.id).label === "indexed").length;
  const allIndexed = indexed === total;
  const color = allIndexed ? "#16A34A" : "#EA580C";
  return (
    <span style={{
      background: `${color}20`, color,
      fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 2, flexShrink: 0,
    }} title={`${indexed} of ${total} documents indexed`}>
      {indexed}/{total} INDEXED
    </span>
  );
}

function DocRow({ file, active, status, selected, onClick, onToggleSelect, onExtract, onRemove, t }) {
  const [hover, setHover] = useState(false);
  const id = file.file_id ?? file.id;
  const name = file.original_name ?? file.filename ?? `File ${id}`;
  const size = file.size ?? file.file_size ?? 0;
  const ext = name.split(".").pop()?.toUpperCase() || "";
  return (
    <div
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) onToggleSelect();
        else onClick();
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 10px 6px 10px", cursor: "pointer",
        background: active ? "#7C3AED14" : (selected ? "#16A34A10" : (hover ? t.panelBg : "transparent")),
        borderLeft: `2px solid ${active ? "#7C3AED" : (selected ? "#16A34A" : "transparent")}`,
      }}>
      <input type="checkbox" checked={selected} readOnly
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        style={{ accentColor: "#16A34A", margin: 0, flexShrink: 0, cursor: "pointer" }} />
      <span style={{ fontSize: 12, width: 14, textAlign: "center", color: "#7C3AED", flexShrink: 0 }}>{extIcon(ext)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: active ? t.textStrong : t.text, fontSize: 12, fontWeight: active ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: MONO }}>
          {name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span style={{ color: status.color, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", gap: 3, textTransform: "uppercase", letterSpacing: 0.4 }}>
            <span>{status.dot}</span>{status.label}
          </span>
          <span style={{ color: t.textDisabled, fontSize: 9, fontFamily: MONO }}>{fmt(size)}</span>
        </div>
      </div>
      {hover && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onExtract(); }} title="Open in extraction studio"
            style={{ background: "transparent", border: "none", color: "#EA580C", cursor: "pointer", fontSize: 12, padding: 0, flexShrink: 0 }}>⚙</button>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Delete"
            style={{ background: "transparent", border: "none", color: t.textDisabled, cursor: "pointer", fontSize: 12, padding: 0, flexShrink: 0 }}>✕</button>
        </>
      )}
    </div>
  );
}

// Always-visible drop zone at the top of the Documents section.
// Dropping files uploads them (same handler the outer sidebar wires up); they
// appear below in the list as soon as the RAG2 refresh returns.
function DocsDropZone({ onUpload, t }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDrag(true); }}
      onDragLeave={(e) => { e.stopPropagation(); setDrag(false); }}
      onDrop={(e) => {
        e.preventDefault(); e.stopPropagation();
        setDrag(false);
        onUpload(e.dataTransfer.files);
      }}
      style={{
        margin: "2px 10px 6px",
        background: drag ? "rgba(124,58,237,0.14)" : "transparent",
        border: `1.5px dashed ${drag ? "#7C3AED" : t.borderSubtle}`,
        borderRadius: 6, padding: "8px 10px",
        display: "flex", alignItems: "center", gap: 8,
        cursor: "pointer", transition: "all 0.12s",
      }}
      title="Drop files or click to upload">
      <span style={{ fontSize: 14, color: drag ? "#7C3AED" : t.textMuted, flexShrink: 0 }}>⇩</span>
      <span style={{ flex: 1, color: drag ? "#7C3AED" : t.textMuted, fontSize: 11, fontWeight: 600 }}>
        {drag ? "Drop to upload" : "Drag & drop files here"}
      </span>
      <span style={{ color: t.textDisabled, fontSize: 10, fontFamily: MONO }}>or click</span>
      <input ref={ref} type="file" multiple style={{ display: "none" }}
        onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

function SourceRow({ s, active, onClick, t }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 10px 6px 14px", cursor: "pointer",
        background: active ? `${s.color}14` : (hover ? t.panelBg : "transparent"),
        borderLeft: `2px solid ${active ? s.color : "transparent"}`,
      }}>
      <span style={{ fontSize: 10, color: s.color, flexShrink: 0 }}>●</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: active ? t.textStrong : t.text, fontSize: 12, fontWeight: active ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: MONO }}>
          {s.name}
        </div>
      </div>
      <span style={{ color: t.textDisabled, fontSize: 10, fontFamily: MONO, flexShrink: 0 }}>{s.objects}</span>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────

export default function Sidebar({ files, filesLoading, filesError, onRefresh, onUpload, onOpenConnect }) {
  const { user } = useAuth();
  const { t } = useTheme();
  const {
    selection, openDoc, openKB, openSource, openExtraction, openBrowse,
    getDocStatus, getFileBlob, setFileBlob,
    userKBs, selectedDocIds, toggleDocSelected, clearDocSelection,
    openConfigureNew, openReconfigure, createStore,
  } = useWorkspace();

  const [kbTab, setKbTab] = useState("mine");
  const [open, setOpen] = useState({ kb: true, docs: true, srcs: true });
  const [expandedKBs, setExpandedKBs] = useState({});
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const fileInputRef = useRef();

  const filtered = (items, getName) => query
    ? items.filter((x) => getName(x).toLowerCase().includes(query.toLowerCase()))
    : items;

  const removeDoc = async (file) => {
    try {
      await deleteFile(user, file.file_id ?? file.id);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const handleExtract = (file) => {
    const id = file.file_id ?? file.id;
    openExtraction(getFileBlob(id), file);
  };

  const allKBs = [
    ...userKBs,
    ...KB_CATALOG,
  ];

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onUpload(e.dataTransfer.files); }}
      style={{
        width: 296, flexShrink: 0,
        background: t.sidebarBg, borderRight: `1px solid ${t.border}`,
        display: "flex", flexDirection: "column", overflow: "hidden",
        position: "relative",
      }}>
      {/* Header — primary CTA is Configure KB */}
      <div style={{ padding: "10px 10px 6px" }}>
        <button onClick={openConfigureNew}
          style={{
            width: "100%", background: "#3a7aba", color: "#fff", border: "none",
            borderRadius: 6, padding: "9px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer",
            letterSpacing: 0.3, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          }}>
          ⚙ Configure Knowledge Base
        </button>
        <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…"
            style={{
              flex: 1, background: t.inputBg,
              border: `1px solid ${t.borderSubtle}`, borderRadius: 5,
              padding: "5px 10px", color: t.text, fontSize: 11, outline: "none",
            }} />
        </div>
        <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
          onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }} />
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 10 }}>
        {/* Stores (user KBs + raw doc-bags) — with Mine / Browse sub-tabs */}
        <Section title="Stores & KBs" count={allKBs.length} t={t}
          open={open.kb} onToggle={() => setOpen((o) => ({ ...o, kb: !o.kb }))}>
          <div style={{ padding: "2px 10px 8px", display: "flex", gap: 4 }}>
            <KBSubTab active={kbTab === "mine"} onClick={() => setKbTab("mine")} label="Mine" t={t} />
            <KBSubTab
              active={selection.kind === "browse"}
              onClick={() => { setKbTab("browse"); openBrowse(); }}
              label="🧭 Browse"
              t={t} />
          </div>
          {kbTab === "mine" && filtered(allKBs, (k) => k.name).map((kb) => {
            const members = (kb.docIds || [])
              .map((docId) => files.find((f) => (f.file_id ?? f.id) === docId))
              .filter(Boolean);
            return (
              <KBRow key={kb.id} kb={kb}
                active={selection.kind === "kb" && selection.id === kb.id}
                activeDocId={selection.kind === "doc" ? selection.id : null}
                expanded={!!expandedKBs[kb.id]}
                memberDocs={members}
                getDocStatus={getDocStatus}
                onClick={() => {
                  openKB(kb);
                  if (kb.id?.startsWith("u-") && (kb.docIds?.length || 0) > 0) {
                    setExpandedKBs((e) => ({ ...e, [kb.id]: true }));
                  }
                }}
                onToggleExpand={() => setExpandedKBs((e) => ({ ...e, [kb.id]: !e[kb.id] }))}
                onOpenDoc={openDoc}
                onIndexStore={(store) => openReconfigure(store.id)}
                t={t} />
            );
          })}
          {kbTab === "mine" && allKBs.length === 0 && (
            <div style={{ color: t.textDisabled, fontSize: 11, padding: "6px 14px", lineHeight: 1.4 }}>
              No Stores yet. Select docs and click <strong>Save as Store</strong> or <strong>Configure KB</strong> below.
            </div>
          )}
          {kbTab === "browse" && (
            <div style={{ padding: "4px 12px 10px", color: t.textDisabled, fontSize: 11, lineHeight: 1.5 }}>
              Enterprise catalog is open in the main panel →
            </div>
          )}
        </Section>

        {/* Documents */}
        <Section title="Documents" count={filesLoading ? "…" : files.length} t={t}
          open={open.docs}
          onToggle={() => setOpen((o) => ({ ...o, docs: !o.docs }))}
          action={
            <button onClick={onRefresh} style={{
              background: "transparent", border: "none", color: t.textMuted,
              cursor: "pointer", padding: "0 4px", fontSize: 11,
            }} title="Refresh">↻</button>
          }>
          <DocsDropZone onUpload={onUpload} t={t} />
          {filesLoading && <div style={{ color: t.textDisabled, fontSize: 11, padding: "4px 14px" }}>Loading…</div>}
          {filesError && (
            <div style={{
              margin: "4px 10px", background: "#3a1010", border: "1px solid #5a1a1a", borderRadius: 4,
              padding: "7px 9px", color: "#ff8080", fontSize: 10, lineHeight: 1.4,
            }}>
              RAG2 API not reachable<br />
              <span style={{ color: t.textDim, fontSize: 9 }}>Run <span style={{ fontFamily: MONO }}>python deploy.py</span></span>
            </div>
          )}
          {!filesLoading && !filesError && files.length === 0 && (
            <div style={{ color: t.textDisabled, fontSize: 11, padding: "2px 14px 8px", lineHeight: 1.4, fontStyle: "italic" }}>
              No documents yet — drop files above.
            </div>
          )}
          {!filesLoading && filtered(files, (f) => f.original_name ?? f.filename ?? "").map((f) => {
            const id = f.file_id ?? f.id;
            return (
              <DocRow key={id} file={f}
                status={getDocStatus(id)}
                selected={selectedDocIds.includes(id)}
                active={selection.kind === "doc" && selection.id === id}
                onClick={() => openDoc(f)}
                onToggleSelect={() => toggleDocSelected(id)}
                onExtract={() => handleExtract(f)}
                onRemove={() => removeDoc(f)}
                t={t} />
            );
          })}
        </Section>

        {/* Connected Sources */}
        <Section title="Connected Sources" count={CONNECTED_SOURCES.length} t={t}
          open={open.srcs}
          onToggle={() => setOpen((o) => ({ ...o, srcs: !o.srcs }))}
          action={
            <button onClick={onOpenConnect} style={{
              background: "transparent", border: "none", color: t.textMuted,
              cursor: "pointer", padding: "0 4px", fontSize: 13, lineHeight: 1,
            }} title="Connect a source">+</button>
          }>
          {CONNECTED_SOURCES.map((s) => (
            <SourceRow key={s.id} s={s}
              active={selection.kind === "source" && selection.id === s.id}
              onClick={() => openSource(s)} t={t} />
          ))}
        </Section>
      </div>

      {/* ── Bottom strip: contextual actions when docs are selected ── */}
      {selectedDocIds.length > 0 && (
        <div style={{ borderTop: `1px solid ${t.border}`, padding: 10, background: t.sidebarBg, flexShrink: 0 }}>
          <div style={{ color: t.textGhost, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            {selectedDocIds.length} doc{selectedDocIds.length === 1 ? "" : "s"} selected
          </div>
          <button onClick={() => {
              const name = prompt("Name this Store:", `store-${new Date().toISOString().slice(0, 10)}`);
              if (!name) return;
              const store = createStore({ name, docIds: [...selectedDocIds] });
              clearDocSelection();
              openKB(store);
            }}
            style={{
              width: "100%", background: "#EA580C", color: "#fff", border: "none",
              borderRadius: 6, padding: "8px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>
            📁 Save as Store
          </button>
          <button onClick={openConfigureNew}
            style={{
              width: "100%", marginTop: 5, background: "#16A34A", color: "#fff", border: "none",
              borderRadius: 6, padding: "8px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>
            ⚙ Configure KB (index now)
          </button>
          <button onClick={clearDocSelection}
            style={{
              width: "100%", marginTop: 5,
              background: "transparent", border: "none",
              color: t.textMuted, fontSize: 10, cursor: "pointer",
            }}>
            Clear selection
          </button>
        </div>
      )}

      {/* Drop overlay */}
      {dragging && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(124,58,237,0.15)", border: "2px dashed #7C3AED",
          display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
          zIndex: 5,
        }}>
          <div style={{ color: "#7C3AED", fontSize: 13, fontWeight: 700 }}>Drop to upload</div>
        </div>
      )}
    </div>
  );
}

function KBSubTab({ active, onClick, label, t }) {
  return (
    <button onClick={onClick}
      style={{
        flex: 1, background: active ? "#3a7aba" : "transparent",
        color: active ? "#fff" : t.textMuted,
        border: `1px solid ${active ? "#3a7aba" : t.borderSubtle}`,
        borderRadius: 4, padding: "4px 8px",
        cursor: "pointer", fontSize: 10, fontWeight: active ? 700 : 600,
        letterSpacing: 0.3,
      }}>
      {label}
    </button>
  );
}

function extIcon(ext) {
  const e = ext?.toUpperCase();
  if (["PDF"].includes(e)) return "▤";
  if (["MD", "TXT"].includes(e)) return "≡";
  if (["DOCX", "DOC"].includes(e)) return "◫";
  if (["CSV", "XLSX"].includes(e)) return "▦";
  if (["PNG", "JPG", "JPEG", "TIFF", "BMP"].includes(e)) return "▣";
  return "·";
}

