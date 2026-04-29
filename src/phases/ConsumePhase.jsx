import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useJourney } from "../context/JourneyContext";
import { listFiles, queryFile } from "../services/ragApi";

const COLOR = "#0891B2";
const MONO = "'IBM Plex Mono', monospace";

// 4 consumption surfaces: REST API · Agent Tool · Console Query · Monitor.
// Console is wired to the real RAG2 queryFile; the others are spec-views.

export default function ConsumePhase() {
  const { t } = useTheme();
  const { state } = useJourney();
  const [tab, setTab] = useState("console");

  const kbName = state.artifact?.name || state.pipeline?.index?.name || "your-kb";

  return (
    <div>
      <p style={{ color: t.textDim, fontSize: 14, lineHeight: 1.6, marginTop: 0, marginBottom: 18 }}>
        Four ways to consume the Knowledge Artifact. Console runs live against the RAG2 API —
        the others show the integration spec for your team.
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 14, background: t.panelBg, borderRadius: 8, padding: 4 }}>
        {[
          { id: "api",     label: "REST API",    icon: "🛰" },
          { id: "agent",   label: "Agent Tool",  icon: "🤖" },
          { id: "console", label: "Console Query",icon: "💬" },
          { id: "monitor", label: "Monitor",     icon: "📈" },
        ].map((m) => {
          const active = tab === m.id;
          return (
            <button key={m.id} onClick={() => setTab(m.id)}
              style={{
                flex: 1, background: active ? COLOR : "transparent",
                border: "none", borderRadius: 6, padding: "9px 12px",
                color: active ? "#fff" : t.textMuted,
                cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 600,
              }}>
              <span style={{ marginRight: 6 }}>{m.icon}</span>{m.label}
            </button>
          );
        })}
      </div>

      {tab === "api"     && <RestApi kbName={kbName} t={t} />}
      {tab === "agent"   && <AgentTool kbName={kbName} t={t} />}
      {tab === "console" && <ConsoleTab t={t} />}
      {tab === "monitor" && <Monitor kbName={kbName} t={t} />}
    </div>
  );
}

// ─── REST API ──
function RestApi({ kbName, t }) {
  const curl = `curl -X POST https://api.knowledge.internal/v1/knowledge/${kbName}/retrieve \\
  -H "authorization: Bearer $KB_TOKEN" \\
  -H "content-type: application/json" \\
  -d '{
    "query": "What are the key risk exposures in Q3?",
    "top_k": 5,
    "filters": { "domain": "ccb-risk" }
  }'`;

  const resp = `{
  "results": [
    {
      "chunk_id": "12",
      "score": 0.894,
      "text": "...",
      "source": { "doc": "q3-risk-report.pdf", "page": 4 }
    }
    // ... 4 more results
  ],
  "trace_id": "req-8a7f..."
}`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <CodeCard title="Request" code={curl} t={t} />
      <CodeCard title="Response (200 OK)" code={resp} t={t} />
    </div>
  );
}

// ─── Agent Tool ──
function AgentTool({ kbName, t }) {
  const code = `import { Agent } from "knowledge-agents";

const agent = new Agent({
  model: "claude-opus-4-7",
  tools: [
    {
      type: "knowledge",
      kb_id: "${kbName}",
      description: "Retrieves from the ${kbName} knowledge artifact. Use for risk exposure, compliance, and ops questions."
    }
  ]
});

const answer = await agent.run("What moved CCB VaR most in Q3?");`;

  return (
    <div>
      <CodeCard title="Agent Configuration" code={code} t={t} />
      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16, marginTop: 14 }}>
        <div style={{ color: t.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          Tool Semantics
        </div>
        <ul style={{ color: t.text, fontSize: 13, lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
          <li>Agents call this KB as a first-class tool, not a preambling RAG step.</li>
          <li>Entitlements are inherited — the agent inherits the calling user's access.</li>
          <li>Tool-use traces are logged to the Monitor tab.</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Console (real) ──
function ConsoleTab({ t }) {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filesErr, setFilesErr] = useState(null);
  const [fileId, setFileId] = useState("");
  const [question, setQuestion] = useState("What is this document about?");
  const [provider, setProvider] = useState("xai");
  const [state, setState] = useState("idle");
  const [answer, setAnswer] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    listFiles(user)
      .then((f) => { setFiles(f); setLoading(false); if (f.length) setFileId(String(f[0].file_id ?? f[0].id)); })
      .catch((e) => { setFilesErr(e.message); setLoading(false); });
  }, [user]);

  const ask = async () => {
    if (!fileId) return;
    setState("loading"); setErr(null); setAnswer(null);
    try {
      const res = await queryFile(user, Number(fileId), question.trim(), provider);
      setAnswer(res); setState("done");
    } catch (e) { setErr(e.message); setState("error"); }
  };

  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 18 }}>
      <div style={{ background: "#ECFEFF", border: `1px solid ${COLOR}40`, borderRadius: 6, padding: "8px 12px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: COLOR }}>🔒</span>
        <span style={{ color: t.textDim, fontSize: 12 }}>
          Live RAG2 API — showing only <strong style={{ color: COLOR }}>{user.userid}</strong>'s documents.
          Cross-user access is blocked.
        </span>
      </div>

      {loading && <div style={{ color: t.textMuted, fontSize: 13 }}>Loading your files…</div>}
      {filesErr && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 12 }}>
          <div style={{ color: "#DC2626", fontSize: 12, fontWeight: 700 }}>RAG2 API unreachable</div>
          <div style={{ color: "#991B1B", fontSize: 11, marginTop: 4 }}>{filesErr}</div>
        </div>
      )}
      {!loading && !filesErr && files.length === 0 && (
        <div style={{ color: t.textMuted, fontSize: 13 }}>No documents — upload in Curate first.</div>
      )}
      {!loading && files.length > 0 && (
        <>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: t.textMuted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>DOCUMENT</label>
            <select value={fileId} onChange={(e) => setFileId(e.target.value)}
              style={{ width: "100%", background: t.panelBg, border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "9px 12px", color: t.text, fontSize: 13, outline: "none" }}>
              {files.map((f) => {
                const id = f.file_id ?? f.id;
                const name = f.original_name ?? f.filename ?? `File ${id}`;
                return <option key={id} value={String(id)}>{name} (id: {id})</option>;
              })}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: t.textMuted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>QUESTION</label>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2}
              style={{ width: "100%", background: t.panelBg, border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "10px 12px", color: t.text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[{ id: "xai", label: "Grok (xAI)" }, { id: "anthropic", label: "Claude" }].map((p) => (
              <button key={p.id} onClick={() => setProvider(p.id)}
                style={{ background: provider === p.id ? COLOR : t.panelBg, border: `1px solid ${provider === p.id ? COLOR : t.borderMid}`, borderRadius: 6, padding: "7px 14px", color: provider === p.id ? "#fff" : t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {p.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={ask} disabled={state === "loading" || !fileId}
              style={{ background: COLOR, border: `1px solid ${COLOR}`, borderRadius: 6, padding: "7px 22px", color: "#fff", cursor: state === "loading" || !fileId ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13, opacity: state === "loading" || !fileId ? 0.6 : 1 }}>
              {state === "loading" ? "Querying…" : "Ask"}
            </button>
          </div>

          {state === "error" && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 12, color: "#DC2626", fontSize: 12 }}>Query failed: {err}</div>}
          {state === "done" && answer && (
            <div style={{ background: "#ECFEFF", border: `1px solid ${COLOR}50`, borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: COLOR, fontSize: 11, fontWeight: 700 }}>ANSWER</span>
                <span style={{ background: t.panelBg, color: t.textMuted, fontSize: 10, fontFamily: MONO, padding: "2px 8px", borderRadius: 3 }}>{answer.model}</span>
              </div>
              <div style={{ color: t.text, fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{answer.answer}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Monitor ──
function Monitor({ kbName, t }) {
  const metrics = [
    { label: "Queries (24h)",   value: "1,482", delta: "+12%" },
    { label: "p50 latency",     value: "142ms", delta: "−8ms" },
    { label: "p95 latency",     value: "487ms", delta: "−23ms" },
    { label: "Retrieval quality (ndcg@5)", value: "0.84", delta: "+0.02" },
    { label: "Index freshness", value: "7 min", delta: "OK" },
    { label: "Health",          value: "● LIVE", delta: "100%" },
  ];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ color: t.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{m.label}</div>
            <div style={{ color: t.textStrong, fontSize: 22, fontWeight: 800, fontFamily: MONO, marginTop: 2 }}>{m.value}</div>
            <div style={{ color: COLOR, fontSize: 11, fontWeight: 700, marginTop: 2 }}>{m.delta}</div>
          </div>
        ))}
      </div>
      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ color: t.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Audit · Drift · Evals</div>
        <ul style={{ color: t.text, fontSize: 13, lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
          <li><strong>Audit log</strong>: every query logs user, KB, prompt, retrieved chunk IDs, trace ID.</li>
          <li><strong>Eval set</strong>: 200 golden Q/A pairs run nightly — regressions page on-call.</li>
          <li><strong>Drift</strong>: embedding distribution + retrieval ranking monitored; alert on shift &gt;5σ.</li>
          <li><strong>Entitlement audit</strong>: weekly verification that {kbName} respects inherited classifications.</li>
        </ul>
      </div>
    </div>
  );
}

function CodeCard({ title, code, t }) {
  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}`, background: t.panelBg, color: t.textStrong, fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
        {title}
      </div>
      <pre style={{ fontFamily: MONO, fontSize: 12, color: t.text, lineHeight: 1.6, padding: 14, margin: 0, whiteSpace: "pre-wrap", background: t.pageBg }}>
        {code}
      </pre>
    </div>
  );
}
