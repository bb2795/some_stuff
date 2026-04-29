import { createContext, useContext, useMemo, useState } from "react";

// Selection-based workspace state. Paths are emergent from user actions
// (upload → chat the doc · click KB → chat the KB · select docs + Configure
// KB → create a new KB · click a doc's status pill → extraction studio).
//
// Views:
//   workspace  — sidebar + main chat
//   extraction — full-screen extraction studio (original 3-column panel)
//   flowgraph  — flow-graph viz
//   obsidian   — knowledge-graph viz

const WorkspaceContext = createContext(null);

// Built-in catalog KBs the user may have access to. "My Knowledge Base" is
// NOT a thing — a user's KB only exists if they configure one over their
// documents (see userKBs below).
export const KB_CATALOG = [
  {
    id: "ccb-risk", name: "CCB Risk Exposures", owner: "user1",
    records: "2.4M", tags: ["CCB Risk", "Store"], status: "entitled",
    description: "Consolidated credit risk exposures across CCB portfolios — PD, LGD, EAD metrics.",
    presets: {
      extractionTool: "docling",
      extractionParams: { format: "Markdown", dpi: 300, language: "en", gpu: "auto", preserveTables: true, ocrFallback: true },
      chunk: "semantic",
      chunkParams: { chunkSize: 1024, overlap: 128, preserveTables: true, preserveCodeBlocks: false, splitByPage: false },
      embedding: "openai-text-embedding-3-large",
      embeddingParams: { dimensions: 3072, batchSize: 256, truncation: "end", normalize: true },
      vectorStore: "opensearch",
      vectorParams: { indexType: "hnsw", m: 32, ef_construction: 400, ef_search: 256, metric: "cosine", dedup: true },
      retriever: "hybrid",
      retrievalParams: { topK: 20, rerankTopN: 5, reranker: "cohere-rerank-v3", hybridAlpha: 0.5, scoreThreshold: 0.3, mmr: true, mmrLambda: 0.5, metadataFilters: "domain=ccb-risk, authority>=0.7" },
    },
  },
  {
    id: "equities", name: "Equities Reference", owner: "user2",
    records: "890K", tags: ["Equities Desk"], status: "entitled",
    description: "Reference data for global equities — instruments, corporate actions, identifiers.",
    presets: {
      extractionTool: "docling",
      extractionParams: { format: "JSON", dpi: 200, language: "en", gpu: "auto", preserveTables: true, ocrFallback: false },
      chunk: "fixed",
      chunkParams: { chunkSize: 512, overlap: 64, preserveTables: true, preserveCodeBlocks: false, splitByPage: false },
      embedding: "titan-v2",
      embeddingParams: { dimensions: 1024, batchSize: 512, truncation: "end", normalize: true },
      vectorStore: "pgvector",
      vectorParams: { indexType: "hnsw", m: 16, ef_construction: 256, ef_search: 128, metric: "cosine", dedup: true },
      retriever: "hybrid",
      retrievalParams: { topK: 10, rerankTopN: 5, reranker: "cohere-rerank-v3", hybridAlpha: 0.6, scoreThreshold: 0.0, mmr: false, mmrLambda: 0.5, metadataFilters: "domain=equities" },
    },
  },
  {
    id: "trade-ops", name: "Trade Ops Playbooks", owner: "user1",
    records: "3.2K", tags: ["Operations"], status: "entitled",
    description: "Operations runbooks — settlement, reconciliation, exception handling.",
    presets: {
      extractionTool: "docling",
      extractionParams: { format: "Markdown", dpi: 200, language: "en", gpu: "auto", preserveTables: true, ocrFallback: true },
      chunk: "markdown-header",
      chunkParams: { chunkSize: 768, overlap: 64, preserveTables: true, preserveCodeBlocks: true, splitByPage: false },
      embedding: "bge-large-en",
      embeddingParams: { dimensions: 1024, batchSize: 128, truncation: "end", normalize: true },
      vectorStore: "opensearch",
      vectorParams: { indexType: "hnsw", m: 16, ef_construction: 256, ef_search: 128, metric: "cosine", dedup: true },
      retriever: "hybrid",
      retrievalParams: { topK: 10, rerankTopN: 5, reranker: "bge-reranker-v2", hybridAlpha: 0.4, scoreThreshold: 0.0, mmr: false, mmrLambda: 0.5, metadataFilters: "domain=operations" },
    },
  },
  {
    id: "research", name: "Global Macro Research", owner: "user2",
    records: "1.1K", tags: ["Research", "Restricted"], status: "restricted",
    description: "Long-form macro research — rates, FX, commodities, cross-asset themes.",
    presets: {
      extractionTool: "llamaparse",
      extractionParams: { format: "Markdown", dpi: 300, language: "en", gpu: "auto", preserveTables: true, ocrFallback: true },
      chunk: "recursive",
      chunkParams: { chunkSize: 1536, overlap: 256, preserveTables: true, preserveCodeBlocks: true, splitByPage: false },
      embedding: "cohere-embed-v3-multi",
      embeddingParams: { dimensions: 1024, batchSize: 128, truncation: "end", normalize: true },
      vectorStore: "pinecone",
      vectorParams: { indexType: "hnsw", m: 32, ef_construction: 400, ef_search: 256, metric: "cosine", dedup: true },
      retriever: "hybrid",
      retrievalParams: { topK: 20, rerankTopN: 8, reranker: "cohere-rerank-v3", hybridAlpha: 0.5, scoreThreshold: 0.4, mmr: true, mmrLambda: 0.6, metadataFilters: "domain=research, period=last-90d" },
    },
  },
];

// Browse directory — enterprise-wide catalog the user can discover and
// request access to. Mix of entitled, requestable, and restricted KBs
// across LoBs / classifications / owners.
export const BROWSE_CATALOG = [
  ...KB_CATALOG,

  { id: "cib-prime-risk",      name: "Prime Brokerage Risk Analytics",        owner: "Prime Brokerage Risk", lob: "CIB",        classification: "Confidential",      records: "8.1M",  updated: "2h ago",   tags: ["Risk", "Margin", "Stress"],        status: "requestable", description: "Real-time margin + stress-test outputs across prime brokerage portfolios. Powers overnight VaR attribution." },
  { id: "cib-rates-desk",      name: "Rates Desk Daily Recaps",               owner: "Global Rates",        lob: "CIB",        classification: "Internal",          records: "47K",   updated: "18m ago",  tags: ["Rates", "Trading"],                status: "requestable", description: "Daily desk commentary, positioning recaps, and flow summaries from the G10 and EM rates desks." },
  { id: "cib-fx-flows",        name: "FX Desk Flow Commentary",               owner: "FX Sales & Trading",  lob: "CIB",        classification: "Internal",          records: "62K",   updated: "1h ago",   tags: ["FX", "Flows"],                     status: "requestable", description: "Spot, forwards, and options flow commentary with color from the FX desk." },
  { id: "cib-commodities",     name: "Commodities Research",                  owner: "Commodities Strategy",lob: "CIB",        classification: "Internal",          records: "11.4K", updated: "yesterday",tags: ["Oil", "Metals", "Power"],          status: "requestable", description: "Deep research into energy, metals, agriculture — supply/demand models + geopolitical overlay." },
  { id: "cib-ib-deals",        name: "Investment Banking Deal Templates",     owner: "IB Platform",         lob: "CIB",        classification: "Highly Restricted", records: "2.8K",  updated: "3d ago",   tags: ["M&A", "ECM", "DCM"],               status: "restricted",  description: "Pitch templates, model repositories, precedent transactions. MNPI-adjacent — request with justification." },
  { id: "cib-eqd-playbook",    name: "Equity Derivatives Playbook",           owner: "Equity Derivatives",  lob: "CIB",        classification: "Confidential",      records: "5.6K",  updated: "1w ago",   tags: ["EQD", "Structuring"],              status: "requestable", description: "Structuring playbook — exotics, autocallables, variance swaps. Pricing notebooks + desk policies." },

  { id: "ccb-auto-originations", name: "CCB Auto Loan Originations",          owner: "Auto Lending",        lob: "CCB",        classification: "Restricted",        records: "12.4M", updated: "30m ago",  tags: ["Auto", "Originations"],            status: "requestable", description: "Auto loan application records, credit decisions, vehicle VINs, dealer partner metadata." },
  { id: "ccb-mortgage-servicing", name: "Mortgage Servicing Records",         owner: "Home Lending",        lob: "CCB",        classification: "Restricted",        records: "29.8M", updated: "4h ago",   tags: ["Mortgage", "Servicing"],           status: "requestable", description: "Servicing events, escrow, loss mitigation, HAMP/HARP workouts. PII + regulated." },
  { id: "ccb-card-transactions", name: "Card Network Transactions",           owner: "Card Services",       lob: "CCB",        classification: "Highly Restricted", records: "1.4B",  updated: "10m ago",  tags: ["Cards", "Transactions"],           status: "restricted",  description: "Full transaction fact table across card portfolios. PAN tokenized — access audit required." },
  { id: "ccb-kyc-onboarding",  name: "Retail KYC Onboarding",                 owner: "KYC Operations",      lob: "CCB",        classification: "Restricted",        records: "37.1M", updated: "1h ago",   tags: ["KYC", "Compliance"],               status: "requestable", description: "KYC onboarding docs, customer identification records, CIP/CDD outputs." },
  { id: "ccb-complaints",      name: "Customer Complaint Resolution",         owner: "Customer Experience", lob: "CCB",        classification: "Internal",          records: "4.3M",  updated: "2h ago",   tags: ["Complaints", "CFPB"],              status: "requestable", description: "CFPB-reportable complaint narratives and resolution outcomes across retail products." },

  { id: "awm-client-notes",    name: "Private Bank Client Notes",             owner: "Private Bank",        lob: "AWM",        classification: "Highly Restricted", records: "220K",  updated: "30m ago",  tags: ["Wealth", "Client"],                status: "restricted",  description: "Advisor call notes, family office meeting minutes, client investment objectives. Highly sensitive." },
  { id: "awm-theses",          name: "Asset Management Investment Theses",    owner: "AM Research",         lob: "AWM",        classification: "Confidential",      records: "8.9K",  updated: "6h ago",   tags: ["Equity", "Credit", "Themes"],      status: "requestable", description: "Buy/Sell/Hold investment theses — single-name equity, credit, and thematic coverage." },
  { id: "awm-aladdin-portfolios", name: "AWM Aladdin Portfolio Snapshots",    owner: "AWM Portfolio Ops",   lob: "AWM",        classification: "Confidential",      records: "1.7M",  updated: "15m ago",  tags: ["Portfolios", "Aladdin"],           status: "requestable", description: "Daily portfolio snapshots — positions, exposures, benchmarks. Feeds Aladdin + Portia." },

  { id: "legal-policies",      name: "Legal & Compliance Policies",           owner: "Legal Dept",          lob: "Legal",      classification: "Internal",          records: "6.1K",  updated: "2w ago",   tags: ["Policy", "Compliance"],            status: "requestable", description: "Firm-wide policies — AML, sanctions, conflicts, Reg W, Volcker, trade surveillance." },
  { id: "audit-reports",       name: "Internal Audit Reports",                owner: "Internal Audit",      lob: "Internal Audit", classification: "Highly Restricted", records: "3.4K", updated: "3d ago", tags: ["Audit", "Findings"],               status: "restricted",  description: "IA issue reports, management response letters, remediation tracking. Access with oversight approval." },
  { id: "model-risk-inventory", name: "Model Risk Inventory (SR 11-7)",       owner: "Model Risk Mgmt",     lob: "Risk",       classification: "Confidential",      records: "27K",   updated: "1d ago",   tags: ["SR 11-7", "Models"],               status: "requestable", description: "All models registered under SR 11-7 governance — validation reports, effective challenge, tiering." },
  { id: "regulatory-filings",  name: "Regulatory Filings (OCC · FDIC · SEC · FINRA)", owner: "Regulatory Affairs", lob: "Finance", classification: "Internal",    records: "89K",   updated: "12h ago",  tags: ["Reg", "Filings"],                  status: "requestable", description: "Submitted regulatory filings, consent orders, exam correspondence, MRAs/MRIAs." },
  { id: "finance-mgmt-reporting", name: "Firmwide Management Reporting",      owner: "Corp Finance",        lob: "Finance",    classification: "Confidential",      records: "18K",   updated: "1h ago",   tags: ["MIS", "P&L"],                      status: "requestable", description: "Daily/weekly/monthly MIS — P&L, VaR, RWA, expenses at the firm, LoB, and desk level." },

  { id: "ops-settlement-runbook", name: "Settlement Operations Runbook",      owner: "Global Ops",          lob: "Operations", classification: "Internal",          records: "1.8K",  updated: "4d ago",   tags: ["Settlement", "Runbook"],           status: "entitled",    description: "Runbooks for cash, securities, FX, and derivatives settlement. Playbooks for breaks and exceptions." },
  { id: "ops-recon-breaks",    name: "Reconciliation Break Archive",          owner: "Recon Ops",           lob: "Operations", classification: "Internal",          records: "740K",  updated: "45m ago",  tags: ["Recon", "Breaks"],                 status: "requestable", description: "Historical reconciliation breaks across Nostro, intercompany, and client accounts. Used for root-cause analytics." },
  { id: "tech-platform-docs",  name: "Technology Platform Docs",              owner: "CTO Platform",        lob: "Technology", classification: "Internal",          records: "14.2K", updated: "2h ago",   tags: ["Platform", "Docs"],                status: "entitled",    description: "CTO org platform documentation — Athena, Inspire, CDAOSDK, Mosaic, Cloud Common." },
  { id: "tech-incidents",      name: "Tech Incident Postmortems",             owner: "SRE",                 lob: "Technology", classification: "Internal",          records: "4.6K",  updated: "6h ago",   tags: ["SRE", "Postmortem"],               status: "entitled",    description: "Major incident postmortems — root cause, blast radius, remediation, follow-ups." },
  { id: "hr-policies",         name: "HR Policies & Benefits",                owner: "HR",                  lob: "HR",         classification: "Public",            records: "2.3K",  updated: "1w ago",   tags: ["HR", "Benefits"],                  status: "entitled",    description: "Public HR documentation — handbook, benefits, time off, remote work, code of conduct." },

  { id: "fcc-sars",            name: "Financial Crimes SAR Library",          owner: "Financial Crimes",    lob: "Risk",       classification: "Highly Restricted", records: "560K",  updated: "8h ago",   tags: ["SAR", "FinCrime"],                 status: "restricted",  description: "Suspicious Activity Report narratives + dispositions. Access requires GFCR approval." },
  { id: "fcc-sanctions-screening", name: "Sanctions Screening Alerts",        owner: "Sanctions Ops",       lob: "Risk",       classification: "Restricted",        records: "3.2M",  updated: "20m ago",  tags: ["Sanctions", "OFAC"],               status: "requestable", description: "OFAC / UN / EU / UK sanctions screening alerts with dispositions and justifications." },
  { id: "risk-market-risk",    name: "Market Risk Limits & Utilisation",      owner: "Market Risk",         lob: "Risk",       classification: "Confidential",      records: "9.1K",  updated: "15m ago",  tags: ["Market Risk", "Limits"],           status: "requestable", description: "Desk-level limit inventory, daily utilization, breaches, extensions, and approvals." },
  { id: "risk-credit-memos",   name: "Commercial Credit Memos",               owner: "Commercial Credit",   lob: "CCB",        classification: "Confidential",      records: "76K",   updated: "1h ago",   tags: ["Credit", "Memos"],                 status: "requestable", description: "Underwriting memos, annual reviews, covenant monitoring for middle-market and large corporate clients." },
];

export const ACCESS_TYPES = {
  sid: { label: "SID",  long: "Standard ID (just me)",   desc: "Request access scoped to your individual user id." },
  fid: { label: "WID",  long: "Workspace ID (whole workspace)", desc: "Request access for every member of your current workspace." },
};

export const CLASSIFICATION_STYLE = {
  "Public":             { bg: "#DCFCE7", fg: "#16A34A" },
  "Internal":           { bg: "#DBEAFE", fg: "#2563EB" },
  "Confidential":       { bg: "#FEF3C7", fg: "#B45309" },
  "Restricted":         { bg: "#FED7AA", fg: "#9A3412" },
  "Highly Restricted":  { bg: "#FEE2E2", fg: "#DC2626" },
};

export const CONNECTED_SOURCES = [
  { id: "s3-ccb",  name: "s3://kb-data/ccb-risk/", badge: "S3", color: "#ba8a3a", objects: 1247 },
  { id: "sp-risk", name: "SharePoint · Risk Research",  badge: "SP", color: "#8a5aba", objects: 342  },
];

// Status pipeline for a document. Lowest to highest:
//   new       — just uploaded, nothing run
//   parsed    — extraction produced markdown
//   chunked   — split into chunks
//   embedded  — vectors generated
//   indexed   — written to vector store (i.e. ready for retrieval)
export const DOC_STATUS = {
  new:      { label: "new",       color: "#9CA3AF", dot: "○" },
  parsed:   { label: "parsed",    color: "#EA580C", dot: "●" },
  chunked:  { label: "chunked",   color: "#7C3AED", dot: "●" },
  embedded: { label: "embedded",  color: "#2563EB", dot: "●" },
  indexed:  { label: "indexed",   color: "#16A34A", dot: "●" },
};

export function WorkspaceProvider({ children }) {
  const [view, setView] = useState("workspace");
  const [selection, setSelection] = useState({ kind: "empty" });
  const [connectOpen, setConnectOpen] = useState(false);
  const [configureOpen, setConfigureOpen] = useState(false);
  const [configureEditId, setConfigureEditId] = useState(null);
  const [configureCloneSource, setConfigureCloneSource] = useState(null);
  const [browseOpen, setBrowseOpen] = useState(false);

  // Access requests submitted from the Browse flow
  const [accessRequests, setAccessRequests] = useState([]);

  // Workspaces — one user can have multiple named workspaces. Each has its
  // own user-created KBs. Documents stay user-scoped at the RAG2 backend.
  const [workspaces, setWorkspaces] = useState([
    { id: "ccb-risk", name: "CCB Risk", createdAt: new Date().toISOString() },
    { id: "equities", name: "Equities", createdAt: new Date().toISOString() },
  ]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState("ccb-risk");

  const [pipelines, setPipelines] = useState({});
  const [fileBlobs, setFileBlobs] = useState({});

  // User-created KBs over their own documents
  const [userKBs, setUserKBs] = useState([]); // { id, name, docIds, chunk, embedding, vectorStore, createdAt }

  // Multi-select for docs (used by Configure KB action)
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  // File being extracted (scopes the ExtractionPanel when view="extraction")
  const [extractionFile, setExtractionFile] = useState(null);
  const [extractionFileMeta, setExtractionFileMeta] = useState(null); // the RAG file row
  const [extractionReturnView, setExtractionReturnView] = useState("workspace");

  // Agent Studio state — tracks which files are attached as knowledge
  const [agentKnowledgeIds, setAgentKnowledgeIds] = useState([]);

  const api = useMemo(() => ({
    view, setView,
    selection, setSelection,
    connectOpen, setConnectOpen,
    configureOpen,
    setConfigureOpen: (v) => {
      setConfigureOpen(v);
      if (!v) { setConfigureEditId(null); setConfigureCloneSource(null); }
    },
    configureEditId, setConfigureEditId,
    configureCloneSource,
    openConfigureNew: () => { setConfigureEditId(null); setConfigureCloneSource(null); setConfigureOpen(true); },
    openReconfigure: (kbId) => { setConfigureEditId(kbId); setConfigureCloneSource(null); setConfigureOpen(true); },
    openCloneFromKB: (kb) => { setConfigureEditId(null); setConfigureCloneSource(kb); setConfigureOpen(true); },

    openEmpty:  ()    => setSelection({ kind: "empty" }),
    openDoc:    (file) => setSelection({ kind: "doc", id: file.file_id ?? file.id, file }),
    openKB:     (kb)  => setSelection({ kind: "kb", id: kb.id, kb }),
    openSource: (s)   => setSelection({ kind: "source", id: s.id, source: s }),
    browseOpen,
    openBrowse:  () => setBrowseOpen(true),
    closeBrowse: () => setBrowseOpen(false),

    // Access requests (demo state — in production, submits to a request service)
    accessRequests,
    submitAccessRequest: (req) => {
      const id = `req-${Date.now().toString(36)}`;
      setAccessRequests((l) => [...l, { id, ...req, submittedAt: new Date().toISOString(), status: "pending" }]);
      return id;
    },

    openFlowGraph: () => setView("flowgraph"),
    openObsidian:  () => setView("obsidian"),
    openAgentStudio: () => setView("agent-studio"),
    goWorkspace:   () => setView("workspace"),

    openExtraction: (file, meta) => {
      setExtractionReturnView(view); // remember where we came from
      if (file) setExtractionFile(file);
      if (meta) setExtractionFileMeta(meta);
      setView("extraction");
    },
    closeExtraction: () => { setView(extractionReturnView || "workspace"); },
    extractionFile, extractionFileMeta,

    // Agent Studio knowledge
    agentKnowledgeIds,
    addAgentKnowledge: (id) =>
      setAgentKnowledgeIds((ids) => (ids.includes(id) ? ids : [...ids, id])),
    removeAgentKnowledge: (id) =>
      setAgentKnowledgeIds((ids) => ids.filter((x) => x !== id)),

    // Pipeline state (per file)
    getPipeline: (fileId) => pipelines[fileId] || { parsed: null, chunks: null, nodes: null, index: null },
    patchPipeline: (fileId, partial) =>
      setPipelines((p) => ({ ...p, [fileId]: { ...(p[fileId] || {}), ...partial } })),
    resetPipeline: (fileId) =>
      setPipelines((p) => ({ ...p, [fileId]: { parsed: null, chunks: null, nodes: null, index: null } })),

    // Status derived from pipeline progress
    getDocStatus: (fileId) => {
      const p = pipelines[fileId];
      if (!p) return DOC_STATUS.new;
      if (p.index)  return DOC_STATUS.indexed;
      if (p.nodes)  return DOC_STATUS.embedded;
      if (p.chunks) return DOC_STATUS.chunked;
      if (p.parsed) return DOC_STATUS.parsed;
      return DOC_STATUS.new;
    },

    // File blob cache (so extraction can run without re-attaching)
    getFileBlob: (fileId) => fileBlobs[fileId] || null,
    setFileBlob: (fileId, blob) => setFileBlobs((b) => ({ ...b, [fileId]: blob })),

    // User KBs — filtered to the current workspace
    userKBs: userKBs.filter((k) => !k.workspaceId || k.workspaceId === currentWorkspaceId),
    createUserKB: (kb) => {
      const id = `u-${Date.now().toString(36)}`;
      const next = { id, workspaceId: currentWorkspaceId, createdAt: new Date().toISOString(), ...kb };
      setUserKBs((list) => [...list, next]);
      return next;
    },
    updateUserKB: (id, partial) =>
      setUserKBs((list) => list.map((k) => (k.id === id ? { ...k, ...partial, updatedAt: new Date().toISOString() } : k))),
    deleteUserKB: (id) => setUserKBs((list) => list.filter((k) => k.id !== id)),
    getUserKB: (id) => userKBs.find((k) => k.id === id) || null,

    // Workspaces
    workspaces,
    currentWorkspaceId,
    currentWorkspace: workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0],
    switchWorkspace: (id) => {
      if (!workspaces.some((w) => w.id === id)) return;
      setCurrentWorkspaceId(id);
      setSelection({ kind: "empty" });
      setSelectedDocIds([]);
    },
    createWorkspace: (name) => {
      const id = `ws-${Date.now().toString(36)}`;
      const next = { id, name: (name || "").trim() || "Untitled", createdAt: new Date().toISOString() };
      setWorkspaces((l) => [...l, next]);
      setCurrentWorkspaceId(id);
      setSelection({ kind: "empty" });
      setSelectedDocIds([]);
      return next;
    },
    renameWorkspace: (id, name) => {
      setWorkspaces((l) => l.map((w) => (w.id === id ? { ...w, name: name.trim() || w.name } : w)));
    },
    deleteWorkspace: (id) => {
      const remaining = workspaces.filter((w) => w.id !== id);
      if (remaining.length === 0) return; // always keep at least one
      setWorkspaces(remaining);
      setUserKBs((l) => l.filter((k) => k.workspaceId !== id));
      if (currentWorkspaceId === id) {
        setCurrentWorkspaceId(remaining[0].id);
        setSelection({ kind: "empty" });
      }
    },

    // Multi-select
    selectedDocIds,
    toggleDocSelected: (id) =>
      setSelectedDocIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    clearDocSelection: () => setSelectedDocIds([]),
  }), [view, selection, connectOpen, configureOpen, configureEditId, configureCloneSource, browseOpen, pipelines, fileBlobs, userKBs, selectedDocIds, extractionFile, extractionFileMeta, extractionReturnView, agentKnowledgeIds, workspaces, currentWorkspaceId, accessRequests]);

  return <WorkspaceContext.Provider value={api}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
