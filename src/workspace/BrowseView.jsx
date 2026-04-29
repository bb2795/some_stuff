import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useWorkspace, BROWSE_CATALOG, CLASSIFICATION_STYLE, ACCESS_TYPES } from "../context/WorkspaceContext";
import ConnectSourceStep from "../components/steps/ConnectSourceStep";
import CredentialsStep from "../components/steps/CredentialsStep";

// Enterprise KB browse popout — modal dialog centered over the workspace.
// Two tabs: Browse (3-column tile grid with filters + request-access) and
// New S3 Connection.

const MONO = "'IBM Plex Mono', monospace";
const BLUE = "#2563EB";
const GREEN = "#16A34A";
const AMBER = "#B45309";

export default function BrowseView({ onClose }) {
  const { t } = useTheme();
  const { accessRequests, currentWorkspace } = useWorkspace();
  const [tab, setTab] = useState("browse");
  const [requestingKB, setRequestingKB] = useState(null);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 40,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 32,
    }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />

      <div style={{
        position: "relative",
        width: "min(1280px, 96vw)",
        height: "min(860px, 92vh)",
        background: t.pageBg, border: `1px solid ${t.border}`, borderRadius: 14,
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        animation: "brvSlide 0.18s ease-out",
      }}>
        <style>{`@keyframes brvSlide { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{
          padding: "14px 18px", borderBottom: `1px solid ${t.border}`, background: t.sidebarBg,
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontSize: 20 }}>🧭</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: t.textStrong, fontSize: 15, fontWeight: 800 }}>
              Browse Knowledge Catalog
            </div>
            <div style={{ color: t.textMuted, fontSize: 11 }}>
              {BROWSE_CATALOG.length} KBs across the enterprise — request access or register a new source.
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, background: t.panelBg, borderRadius: 6, padding: 3 }}>
            <Tab active={tab === "browse"} onClick={() => setTab("browse")} label={`🧭 Browse · ${BROWSE_CATALOG.length}`} t={t} />
            <Tab active={tab === "new"}    onClick={() => setTab("new")}    label="+ New S3 Connection"  t={t} />
          </div>
          <button onClick={onClose}
            style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 5, padding: "6px 12px", color: t.textMuted, cursor: "pointer", fontSize: 13 }}>
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", background: t.pageBg }}>
          {tab === "browse" && (
            <BrowseCatalog
              onRequest={(kb) => setRequestingKB(kb)}
              accessRequests={accessRequests}
              workspaceName={currentWorkspace.name}
              t={t} />
          )}
          {tab === "new" && <NewConnectionTab t={t} />}
        </div>
      </div>

      {requestingKB && (
        <RequestAccessModal
          kb={requestingKB}
          onClose={() => setRequestingKB(null)}
          t={t} />
      )}
    </div>
  );
}

// ─── Browse catalog grid ─────────────────────────────────────────────────

function BrowseCatalog({ onRequest, accessRequests, workspaceName, t }) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [lob, setLob] = useState("all");
  const [classification, setClassification] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("recent");

  const lobs = useMemo(() => [...new Set(BROWSE_CATALOG.map((k) => k.lob).filter(Boolean))].sort(), []);
  const classifications = useMemo(() => [...new Set(BROWSE_CATALOG.map((k) => k.classification).filter(Boolean))], []);

  const filtered = BROWSE_CATALOG.filter((kb) => {
    if (q && !(kb.name.toLowerCase().includes(q.toLowerCase()) ||
               kb.description?.toLowerCase().includes(q.toLowerCase()) ||
               (kb.tags || []).some((t) => t.toLowerCase().includes(q.toLowerCase())))) return false;
    if (lob !== "all" && kb.lob !== lob) return false;
    if (classification !== "all" && kb.classification !== classification) return false;
    if (status !== "all" && kb.status !== status) return false;
    return true;
  });

  return (
    <div style={{ padding: "16px 22px 22px" }}>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <span style={{ position: "absolute", left: 10, top: 9, color: t.textMuted, fontSize: 12 }}>🔍</span>
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${BROWSE_CATALOG.length} KBs by name, description, tags…`}
            style={{
              width: "100%", boxSizing: "border-box",
              background: t.inputBg, border: `1px solid ${t.borderSubtle}`, borderRadius: 6,
              padding: "8px 10px 8px 30px", color: t.text, fontSize: 12, outline: "none",
            }} />
        </div>
        <FilterSelect label="LOB"            value={lob}            onChange={setLob}            options={[{ v: "all", l: "All LoBs" }, ...lobs.map((x) => ({ v: x, l: x }))]} t={t} />
        <FilterSelect label="Classification" value={classification} onChange={setClassification} options={[{ v: "all", l: "Any" }, ...classifications.map((x) => ({ v: x, l: x }))]} t={t} />
        <FilterSelect label="Status"         value={status}         onChange={setStatus}         options={[
          { v: "all",         l: "Any" },
          { v: "entitled",    l: "Entitled" },
          { v: "requestable", l: "Requestable" },
          { v: "restricted",  l: "Restricted" },
        ]} t={t} />
        <FilterSelect label="Sort"           value={sort}           onChange={setSort}           options={[
          { v: "recent", l: "Recently updated" }, { v: "records", l: "Record count" }, { v: "name", l: "Name A–Z" },
        ]} t={t} />
      </div>

      <div style={{ color: t.textMuted, fontSize: 11, marginBottom: 10 }}>
        <strong style={{ color: t.text }}>{filtered.length}</strong> of {BROWSE_CATALOG.length} KBs
        {q && <> · filter: <span style={{ fontFamily: MONO, color: t.text }}>{q}</span></>}
      </div>

      {/* Grid — 3 tiles per row */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontSize: 12 }}>
          No results. Try a different filter.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}>
          {filtered.map((kb) => (
            <KBTile key={kb.id} kb={kb} onRequest={onRequest}
              pendingRequest={accessRequests.find((r) => r.kbId === kb.id)} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tile card (3-per-row) ───────────────────────────────────────────────

function KBTile({ kb, onRequest, pendingRequest, t }) {
  const cls = CLASSIFICATION_STYLE[kb.classification] || { bg: "#e5e7eb", fg: "#6b7280" };
  const statusBadge = {
    entitled:    { bg: "#DCFCE7", fg: GREEN, label: "● ENTITLED" },
    requestable: { bg: "#DBEAFE", fg: BLUE,  label: "REQUESTABLE" },
    restricted:  { bg: "#FEE2E2", fg: "#DC2626", label: "🔒 RESTRICTED" },
  }[kb.status] || { bg: "#F3F4F6", fg: "#6B7280", label: kb.status };

  return (
    <div style={{
      background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10,
      padding: 12, display: "flex", flexDirection: "column", gap: 8,
      minHeight: 240,
    }}>
      {/* Header: icon + name */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>🗂</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: t.textStrong, fontSize: 13, fontWeight: 700, lineHeight: 1.3,
            overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>{kb.name}</div>
        </div>
      </div>

      {/* Badges row */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <span style={{ background: statusBadge.bg, color: statusBadge.fg, fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 3, letterSpacing: 0.5 }}>
          {statusBadge.label}
        </span>
        {kb.classification && (
          <span style={{ background: cls.bg, color: cls.fg, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 3, letterSpacing: 0.4 }}>
            {kb.classification.toUpperCase()}
          </span>
        )}
        {kb.lob && (
          <span style={{ background: t.panelBg, color: t.textMuted, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 3, border: `1px solid ${t.borderSubtle}`, letterSpacing: 0.4 }}>
            {kb.lob}
          </span>
        )}
      </div>

      {/* Description */}
      {kb.description && (
        <div style={{
          color: t.textDim, fontSize: 11, lineHeight: 1.5,
          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
        }}>{kb.description}</div>
      )}

      {/* Meta */}
      <div style={{ color: t.textMuted, fontSize: 9, fontFamily: MONO, lineHeight: 1.6 }}>
        <div>👤 {kb.owner}</div>
        <div>📊 {kb.records} · 🕐 {kb.updated || "—"}</div>
      </div>

      {/* Tags */}
      {kb.tags?.length > 0 && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {kb.tags.slice(0, 3).map((tag) => (
            <span key={tag} style={{
              background: t.panelBg, border: `1px solid ${t.borderSubtle}`,
              color: t.textDim, fontSize: 8, fontWeight: 600,
              padding: "1px 6px", borderRadius: 8,
            }}>{tag}</span>
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Actions */}
      {pendingRequest ? (
        <div style={{ background: AMBER + "20", color: AMBER, fontSize: 9, fontWeight: 700, padding: "7px 10px", borderRadius: 5, textAlign: "center", letterSpacing: 0.4 }}>
          REQUEST · {pendingRequest.status.toUpperCase()}
        </div>
      ) : kb.status === "entitled" ? (
        <div style={{ background: GREEN + "14", color: GREEN, fontSize: 10, fontWeight: 700, padding: "7px 10px", borderRadius: 5, textAlign: "center", border: `1px solid ${GREEN}40` }}>
          ✓ Available
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
          <button onClick={() => onRequest({ ...kb, accessType: "sid" })}
            style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 5, padding: "6px 4px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            Request SID
          </button>
          <button onClick={() => onRequest({ ...kb, accessType: "fid" })}
            style={{ background: "transparent", border: `1px solid ${BLUE}`, color: BLUE, borderRadius: 5, padding: "6px 4px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            Request FID
          </button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, t }) {
  const norm = options.map((o) => typeof o === "object" ? o : { v: o, l: String(o) });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ color: t.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          background: t.inputBg, border: `1px solid ${t.borderSubtle}`, borderRadius: 5,
          padding: "5px 8px", color: t.text, fontSize: 11, outline: "none",
        }}>
        {norm.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

// ─── Request access modal ────────────────────────────────────────────────

function RequestAccessModal({ kb, onClose, t }) {
  const { user } = useAuth();
  const { currentWorkspace, submitAccessRequest } = useWorkspace();
  const [accessType, setAccessType] = useState(kb.accessType || "sid");
  const [duration, setDuration] = useState("30");
  const [justification, setJustification] = useState("");
  const [submitted, setSubmitted] = useState(null);

  const submit = () => {
    if (!justification.trim()) return;
    const reqId = submitAccessRequest({
      kbId: kb.id,
      kbName: kb.name,
      accessType,
      requester: user.userid,
      scope: accessType === "sid" ? user.userid : currentWorkspace.id,
      duration: Number(duration),
      justification: justification.trim(),
    });
    setSubmitted({ reqId });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div style={{
        position: "relative", width: "min(560px, 92vw)",
        background: t.pageBg, border: `1px solid ${t.border}`, borderRadius: 12,
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${t.border}`, background: t.sidebarBg }}>
          <div style={{ color: t.textStrong, fontSize: 14, fontWeight: 800 }}>
            {submitted ? "Request submitted" : "Request Access"}
          </div>
          <div style={{ color: t.textMuted, fontSize: 11, marginTop: 2 }}>
            {submitted
              ? `Tracking id: ${submitted.reqId}. You'll be notified when it's approved.`
              : `Knowledge base: ${kb.name}`}
          </div>
        </div>

        <div style={{ padding: "18px 22px" }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✓</div>
              <div style={{ color: t.textStrong, fontSize: 14, fontWeight: 700 }}>
                {accessType === "sid"
                  ? `Requested for ${user.userid}`
                  : `Requested for workspace "${currentWorkspace.name}"`}
              </div>
              <div style={{ color: t.textDim, fontSize: 12, lineHeight: 1.6, marginTop: 6, maxWidth: 400, margin: "6px auto 0" }}>
                Your {accessType.toUpperCase()} request has been logged. Approval typically takes 1–2 business days.
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: t.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  Access scope
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.entries(ACCESS_TYPES).map(([key, cfg]) => {
                    const sel = accessType === key;
                    const scope = key === "sid" ? user.userid : currentWorkspace.name;
                    return (
                      <button key={key} onClick={() => setAccessType(key)}
                        style={{
                          background: sel ? `${BLUE}14` : t.cardBg,
                          border: `2px solid ${sel ? BLUE : t.border}`,
                          borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                          textAlign: "left",
                        }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <div style={{
                            width: 12, height: 12, borderRadius: 6,
                            border: `2px solid ${sel ? BLUE : t.textDisabled}`,
                            background: sel ? BLUE : "transparent",
                          }} />
                          <span style={{ color: sel ? BLUE : t.text, fontSize: 12, fontWeight: 800 }}>{cfg.label}</span>
                          <span style={{ color: t.textMuted, fontSize: 10 }}>{cfg.long}</span>
                        </div>
                        <div style={{ color: t.textMuted, fontSize: 10, marginLeft: 22, lineHeight: 1.5 }}>{cfg.desc}</div>
                        <div style={{ marginTop: 4, marginLeft: 22, color: t.textDim, fontSize: 10, fontFamily: MONO }}>
                          scope: <span style={{ color: t.text }}>{scope}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: t.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, minWidth: 80 }}>Duration</span>
                <select value={duration} onChange={(e) => setDuration(e.target.value)}
                  style={{
                    background: t.inputBg, border: `1px solid ${t.borderSubtle}`, borderRadius: 5,
                    padding: "7px 10px", color: t.text, fontSize: 12, outline: "none",
                  }}>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                  <option value="perm">Permanent (re-attestation quarterly)</option>
                </select>
              </div>

              <div style={{ marginBottom: 6 }}>
                <div style={{ color: t.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  Justification <span style={{ color: "#DC2626" }}>*</span>
                </div>
                <textarea rows={3} value={justification} onChange={(e) => setJustification(e.target.value)}
                  placeholder="Why do you need access to this KB? (audited — be specific)"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: t.inputBg, border: `1px solid ${t.borderSubtle}`, borderRadius: 6,
                    padding: "9px 12px", color: t.text, fontSize: 12, outline: "none",
                    resize: "vertical", fontFamily: "inherit",
                  }} />
              </div>

              {(kb.classification === "Highly Restricted" || kb.status === "restricted") && (
                <div style={{
                  background: "#FEE2E220", border: "1px solid #DC262660",
                  borderRadius: 6, padding: "8px 12px", marginTop: 10,
                  color: "#DC2626", fontSize: 11, display: "flex", gap: 8, alignItems: "center",
                }}>
                  <span>⚠</span>
                  <span>This KB is <strong>{kb.classification}</strong>. Requests are subject to owner review, line-1 sign-off, and classification-level attestation.</span>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: "10px 18px", borderTop: `1px solid ${t.border}`, background: t.sidebarBg, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose}
            style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "7px 16px", color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {submitted ? "Close" : "Cancel"}
          </button>
          {!submitted && (
            <button onClick={submit} disabled={!justification.trim()}
              style={{
                background: justification.trim() ? BLUE : t.panelBg,
                border: `1px solid ${justification.trim() ? BLUE : t.borderMid}`,
                color: justification.trim() ? "#fff" : t.textMuted,
                borderRadius: 6, padding: "7px 20px", fontSize: 12, fontWeight: 700,
                cursor: justification.trim() ? "pointer" : "not-allowed",
              }}>
              Submit {accessType.toUpperCase()} request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New S3 Connection tab ───────────────────────────────────────────────

function NewConnectionTab({ t }) {
  const [sub, setSub] = useState("source");
  return (
    <div style={{ padding: "16px 22px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ background: "#DBEAFE", border: "1px solid #2563EB50", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: BLUE }}>ℹ</span>
        <span style={{ color: "#1E3A8A", fontSize: 12 }}>
          Register a new S3 bucket into the enterprise catalog. Knowledge uses a cross-account IAM role — no credentials stored.
          Once verified, this bucket becomes discoverable in Browse.
        </span>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 14, padding: 3, background: t.panelBg, borderRadius: 6 }}>
        {[
          { id: "source",  label: "1. Pick source" },
          { id: "creds",   label: "2. Credentials" },
          { id: "verify",  label: "3. Verify" },
        ].map((s) => (
          <button key={s.id} onClick={() => setSub(s.id)}
            style={{
              flex: 1, background: sub === s.id ? BLUE : "transparent",
              color: sub === s.id ? "#fff" : t.textMuted,
              border: "none", borderRadius: 4, padding: "7px 10px",
              fontSize: 11, fontWeight: sub === s.id ? 700 : 600, cursor: "pointer",
            }}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
        {sub === "source" && <ConnectSourceStep />}
        {sub === "creds"  && <CredentialsStep />}
        {sub === "verify" && <VerifyPane t={t} />}
      </div>

      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between" }}>
        <button onClick={() => sub === "creds" ? setSub("source") : sub === "verify" ? setSub("creds") : null}
          disabled={sub === "source"}
          style={{
            background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 6,
            padding: "8px 16px", color: sub === "source" ? t.textDisabled : t.textMuted,
            fontSize: 12, fontWeight: 600, cursor: sub === "source" ? "not-allowed" : "pointer",
          }}>
          ← Back
        </button>
        <button onClick={() => sub === "source" ? setSub("creds") : sub === "creds" ? setSub("verify") : null}
          disabled={sub === "verify"}
          style={{
            background: sub === "verify" ? t.panelBg : BLUE,
            border: `1px solid ${sub === "verify" ? t.borderMid : BLUE}`,
            color: sub === "verify" ? t.textMuted : "#fff",
            borderRadius: 6, padding: "8px 20px", fontSize: 12, fontWeight: 700,
            cursor: sub === "verify" ? "not-allowed" : "pointer",
          }}>
          Next →
        </button>
      </div>
    </div>
  );
}

function VerifyPane({ t }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div>
      <h3 style={{ color: t.textStrong, fontSize: 16, fontWeight: 700, margin: 0 }}>Verify & publish to catalog</h3>
      <p style={{ color: t.textMuted, fontSize: 12, lineHeight: 1.6, marginTop: 6 }}>
        Run connectivity checks, scan the bucket, classify per firm policy, and register in the Browse catalog.
      </p>
      <div style={{ background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14, margin: "14px 0" }}>
        {["sts:AssumeRole", "s3:ListBucket · enumerate objects", "Classify per firm policy", "Register in Browse catalog"].map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 3 ? `1px solid ${t.borderFaint}` : "none" }}>
            <span style={{ color: done ? GREEN : running ? "#EA580C" : t.textDisabled, fontSize: 13 }}>
              {done ? "✓" : running ? "⟳" : "○"}
            </span>
            <span style={{ color: done ? GREEN : t.text, fontSize: 12 }}>{c}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {!done ? (
          <button onClick={() => { setRunning(true); setTimeout(() => { setRunning(false); setDone(true); }, 1800); }}
            disabled={running}
            style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: running ? "not-allowed" : "pointer" }}>
            {running ? "Running…" : "▶ Run verification"}
          </button>
        ) : (
          <div style={{ background: GREEN + "14", border: `1px solid ${GREEN}`, color: GREEN, borderRadius: 6, padding: "8px 18px", fontSize: 12, fontWeight: 700 }}>
            ✓ Connection registered — now discoverable in Browse
          </div>
        )}
      </div>
    </div>
  );
}

function Tab({ active, onClick, label, t }) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? BLUE : "transparent",
        color: active ? "#fff" : t.textMuted,
        border: "none", borderRadius: 4, padding: "6px 14px",
        cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 600,
        whiteSpace: "nowrap",
      }}>
      {label}
    </button>
  );
}
