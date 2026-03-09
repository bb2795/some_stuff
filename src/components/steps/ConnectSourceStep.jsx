import { useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { uploadFile } from "../../services/ragApi";

const sources = [
  {
    id: "s3",
    name: "S3 Bucket",
    badge: "S3",
    badgeColor: "#ba8a3a",
    desc: "Connect to your LOB's S3 bucket. Most common path for teams with existing data in AWS.",
    fields: [
      { label: "Bucket URI", placeholder: "s3://fusion-data/ccb-risk/ccb-risk-exposures/", type: "uri" },
      { label: "Region", placeholder: "us-east-1", type: "select" },
      { label: "Dataspace", placeholder: "CCB Risk", type: "select" },
    ],
    authMethods: [
      { id: "iam", label: "IAM Cross-Account Role", tag: "RECOMMENDED" },
      { id: "accesskey", label: "Access Key + Secret" },
    ],
  },
  {
    id: "cos",
    name: "Cloud Object Storage",
    badge: "COS",
    badgeColor: "#3a7aba",
    desc: "Connect to IBM Cloud Object Storage or Azure Blob. For teams running on non-AWS infrastructure.",
    fields: [
      { label: "Endpoint URL", placeholder: "https://s3.us-south.cloud-object-storage.appdomain.cloud", type: "uri" },
      { label: "Bucket Name", placeholder: "my-knowledge-bucket", type: "text" },
      { label: "Dataspace", placeholder: "Select dataspace...", type: "select" },
    ],
    authMethods: [
      { id: "hmac", label: "HMAC Credentials" },
      { id: "iamkey", label: "IAM API Key" },
      { id: "svcjson", label: "Service Credential JSON" },
    ],
  },
  {
    id: "sharepoint",
    name: "SharePoint / Documentum",
    badge: "DOC",
    badgeColor: "#8a5aba",
    desc: "Connect to enterprise document management systems. Supports incremental sync via change feeds.",
    fields: [
      { label: "Site URL", placeholder: "https://jpmc.sharepoint.com/sites/trading-desk", type: "uri" },
      { label: "Document Library", placeholder: "/Shared Documents/Research", type: "text" },
      { label: "Dataspace", placeholder: "Select dataspace...", type: "select" },
    ],
    authMethods: [
      { id: "oauth", label: "Service Principal (OAuth 2.0)", tag: "RECOMMENDED" },
      { id: "appreg", label: "App Registration + Client Secret" },
    ],
  },
  {
    id: "dataproduct",
    name: "Data Product",
    badge: "DP",
    badgeColor: "#3a9a5a",
    desc: "Consume an existing governed Data Product from the Fusion catalog. Entitlements inherited automatically.",
    fields: [{ label: "Data Product", placeholder: "Search data products...", type: "search" }],
    authMethods: [{ id: "inherited", label: "Inherited from Data Product entitlements — no additional credentials needed" }],
  },
  {
    id: "upload",
    name: "Direct Upload",
    badge: "UP",
    badgeColor: "#5a6aba",
    desc: "Upload documents directly from your machine. Files land in S3Bucket/ and are scoped to your user account.",
  },
];

function AccessKeyForm() {
  const { t } = useTheme();
  const [keyId, setKeyId] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [rotation, setRotation] = useState("90");
  const [testState, setTestState] = useState("idle");

  const handleTest = () => {
    setTestState("testing");
    setTimeout(() => setTestState(keyId && secret ? "pass" : "fail"), 1800);
  };

  return (
    <div style={{ background: t.deepBg, border: `1px solid ${t.amberTint}`, borderRadius: "8px", padding: "16px", marginTop: "10px" }}>
      <div style={{ background: t.amberTint, border: `1px solid #3a2a0860`, borderRadius: "6px", padding: "10px 14px", marginBottom: "16px", display: "flex", gap: "8px" }}>
        <span style={{ color: "#ba8a3a", flexShrink: 0 }}>⚠</span>
        <div>
          <div style={{ color: "#ba8a3a", fontSize: "12px", fontWeight: 600, marginBottom: "2px" }}>Less secure than IAM Cross-Account Role</div>
          <div style={{ color: "#887050", fontSize: "11px", lineHeight: "1.5" }}>Keys are encrypted at rest but represent long-lived credentials. Use only if your org cannot provision cross-account IAM roles.</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "14px" }}>
        <div>
          <label style={{ color: t.textMuted, fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "4px" }}>ACCESS KEY ID</label>
          <input type="text" value={keyId} onChange={(e) => { setKeyId(e.target.value); setTestState("idle"); }} placeholder="AKIAIOSFODNN7EXAMPLE"
            style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.borderMid}`, borderRadius: "4px", padding: "8px 12px", color: t.text, fontSize: "13px", fontFamily: "'IBM Plex Mono', monospace", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ color: t.textMuted, fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "4px" }}>SECRET ACCESS KEY</label>
          <div style={{ position: "relative" }}>
            <input type={showSecret ? "text" : "password"} value={secret} onChange={(e) => { setSecret(e.target.value); setTestState("idle"); }} placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.borderMid}`, borderRadius: "4px", padding: "8px 40px 8px 12px", color: t.text, fontSize: "13px", fontFamily: "'IBM Plex Mono', monospace", outline: "none", boxSizing: "border-box" }} />
            <button onClick={() => setShowSecret((v) => !v)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: t.textGhost, cursor: "pointer", fontSize: "12px", padding: 0 }}>
              {showSecret ? "HIDE" : "SHOW"}
            </button>
          </div>
        </div>
        <div>
          <label style={{ color: t.textMuted, fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "4px" }}>KEY ROTATION REMINDER</label>
          <div style={{ display: "flex", gap: "6px" }}>
            {[{ value: "30", label: "30 days" }, { value: "60", label: "60 days" }, { value: "90", label: "90 days", rec: true }, { value: "never", label: "Never" }].map((opt) => (
              <button key={opt.value} onClick={() => setRotation(opt.value)}
                style={{ flex: 1, background: rotation === opt.value ? t.amberTint : t.inputBg, border: `1px solid ${rotation === opt.value ? "#ba8a3a60" : t.border}`, borderRadius: "4px", padding: "6px 8px", cursor: "pointer", color: rotation === opt.value ? "#ba8a3a" : t.textMuted, fontSize: "11px", fontWeight: rotation === opt.value ? 700 : 400, position: "relative" }}>
                {opt.label}
                {opt.rec && <span style={{ position: "absolute", top: "-8px", left: "50%", transform: "translateX(-50%)", background: t.amberTint, color: "#ba8a3a", fontSize: "8px", fontWeight: 700, padding: "1px 4px", borderRadius: "2px", whiteSpace: "nowrap" }}>REC</span>}
              </button>
            ))}
          </div>
          {rotation === "never" && <div style={{ color: "#cc4444", fontSize: "11px", marginTop: "5px" }}>⚠ Not recommended.</div>}
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button onClick={handleTest} disabled={testState === "testing"}
          style={{ flex: 1, background: testState === "pass" ? t.greenTint : testState === "fail" ? t.redTint : testState === "testing" ? t.inputBg : t.blueTint, border: `1px solid ${testState === "pass" ? "#3a9a5a" : testState === "fail" ? "#7a2a2a" : testState === "testing" ? t.borderMid : t.blue}`, borderRadius: "6px", padding: "10px 20px", color: testState === "pass" ? "#3a9a5a" : testState === "fail" ? "#ba4a4a" : testState === "testing" ? t.textMuted : t.blue, cursor: testState === "testing" ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "13px" }}>
          {testState === "idle" && "Test Connection"}
          {testState === "testing" && "Testing…"}
          {testState === "pass" && "✓ Connection successful"}
          {testState === "fail" && "✗ Connection failed — check credentials"}
        </button>
        {testState === "pass" && <button style={{ background: t.greenTint, border: "1px solid #3a9a5a", borderRadius: "6px", padding: "10px 20px", color: t.textStrong, cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>Save & Continue</button>}
      </div>
    </div>
  );
}

function DirectUploadPanel({ user }) {
  const { t } = useTheme();
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState([]);
  const fileInputRef = useRef();

  const handleFiles = (files) => {
    const newItems = Array.from(files).map((f) => ({
      file: f, status: "uploading", progress: 0, result: null, error: null,
    }));
    setUploads((prev) => {
      const startIdx = prev.length;
      const next = [...prev, ...newItems];
      newItems.forEach((item, i) => {
        const idx = startIdx + i;
        uploadFile(user, item.file, (pct) =>
          setUploads((p) => { const n = [...p]; n[idx] = { ...n[idx], progress: pct }; return n; })
        )
          .then((result) =>
            setUploads((p) => { const n = [...p]; n[idx] = { ...n[idx], status: "done", result }; return n; })
          )
          .catch((err) =>
            setUploads((p) => { const n = [...p]; n[idx] = { ...n[idx], status: "error", error: err.message }; return n; })
          );
      });
      return next;
    });
  };

  if (!user) {
    return (
      <div style={{ background: t.redTint, border: "1px solid #3a1a0a", borderRadius: "8px", padding: "20px", textAlign: "center" }}>
        <div style={{ color: "#ba4a4a", fontSize: "13px" }}>You must be logged in to upload documents.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: t.blueTint, border: `1px solid ${t.blue}50`, borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ color: t.blue }}>🔒</span>
        <span style={{ color: t.textDim, fontSize: "12px" }}>
          Uploading as <strong style={{ color: t.blue }}>{user.userid}</strong> · Files stored in S3Bucket/ · Only accessible by you
        </span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current.click()}
        style={{ border: `2px dashed ${dragging ? "#5a6aba" : t.borderMid}`, borderRadius: "10px", padding: "36px 24px", textAlign: "center", cursor: "pointer", background: dragging ? t.blueTint : t.deepBg, transition: "all 0.15s", marginBottom: "14px" }}
      >
        <div style={{ fontSize: "32px", marginBottom: "8px" }}>📂</div>
        <div style={{ color: t.textDim, fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>Drop files here or click to browse</div>
        <div style={{ color: t.textGhost, fontSize: "12px" }}>PDF, DOCX, TXT, CSV, Parquet · Stored in S3Bucket/ via RAG2 API</div>
        <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {uploads.length > 0 && (
        <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 140px 100px", padding: "7px 14px", borderBottom: `1px solid ${t.borderSubtle}` }}>
            {["File", "Size", "Status", "File ID"].map((h) => (
              <span key={h} style={{ color: t.textGhost, fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>
          {uploads.map((u, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 80px 140px 100px", padding: "10px 14px", borderBottom: `1px solid ${t.borderFaint}`, alignItems: "center" }}>
              <span style={{ color: t.text, fontSize: "12px", fontFamily: "'IBM Plex Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.file.name}</span>
              <span style={{ color: t.textFaint, fontSize: "12px" }}>{(u.file.size / 1024).toFixed(0)} KB</span>
              <span>
                {u.status === "uploading" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ flex: 1, height: "4px", background: t.borderSubtle, borderRadius: "2px" }}>
                      <div style={{ width: `${u.progress}%`, height: "100%", background: "#5a6aba", borderRadius: "2px", transition: "width 0.2s" }} />
                    </div>
                    <span style={{ color: "#5a6aba", fontSize: "10px", flexShrink: 0 }}>{u.progress}%</span>
                  </div>
                )}
                {u.status === "done" && <span style={{ background: t.greenTint, color: "#3a9a5a", padding: "2px 8px", borderRadius: "3px", fontSize: "10px", fontWeight: 700 }}>✓ Uploaded</span>}
                {u.status === "error" && <span style={{ background: t.redTint, color: "#ba4a4a", padding: "2px 8px", borderRadius: "3px", fontSize: "10px", fontWeight: 700 }} title={u.error}>✗ Failed</span>}
              </span>
              <span style={{ color: u.result ? t.blue : t.textDisabled, fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace" }}>
                {u.result ? `id: ${u.result.file_id}` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {uploads.some((u) => u.status === "error") && (
        <div style={{ background: t.redTint, border: "1px solid #3a1a1a", borderRadius: "6px", padding: "10px 14px", marginTop: "10px" }}>
          <div style={{ color: "#ba4a4a", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Upload errors — is the RAG service running?</div>
          {uploads.filter((u) => u.status === "error").map((u, i) => (
            <div key={i} style={{ color: "#7a4a4a", fontSize: "11px" }}>{u.file.name}: {u.error}</div>
          ))}
          <div style={{ color: t.textGhost, fontSize: "11px", marginTop: "6px" }}>Run <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: t.textFaint }}>python deploy.py</span> to start all services.</div>
        </div>
      )}

      {uploads.some((u) => u.status === "done") && (
        <div style={{ background: t.greenTint, border: "1px solid #1a4a2a", borderRadius: "6px", padding: "10px 14px", marginTop: "10px" }}>
          <div style={{ color: "#3a9a5a", fontSize: "12px", fontWeight: 600 }}>
            ✓ {uploads.filter((u) => u.status === "done").length} file(s) stored in S3Bucket/ and scoped to <strong>{user.userid}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConnectSourceStep({ onSkipToStep, initialSource = null }) {
  const { user } = useAuth();
  const { t } = useTheme();
  const [selectedSource, setSelectedSource] = useState(initialSource || "s3");
  const [selectedAuth, setSelectedAuth] = useState(0);

  const active = sources.find((s) => s.id === selectedSource);

  const handleSourceChange = (id) => {
    setSelectedSource(id);
    setSelectedAuth(0);
  };

  return (
    <div>
      <p style={{ color: t.textMuted, fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px 0" }}>
        Choose where your knowledge lives. Fusion connects to the source — it indexes and serves, but{" "}
        <strong style={{ color: t.text }}>data stays in your account</strong>.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {sources.map((src) => (
          <button
            key={src.id}
            onClick={() => handleSourceChange(src.id)}
            style={{ background: selectedSource === src.id ? t.blueTint : t.cardBg, border: `1px solid ${selectedSource === src.id ? t.blue : t.border}`, borderRadius: "6px", padding: "14px 12px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <span style={{ background: `${src.badgeColor}20`, border: `1px solid ${src.badgeColor}50`, color: src.badgeColor, padding: "2px 5px", borderRadius: "3px", fontSize: "9px", fontWeight: 700 }}>{src.badge}</span>
              <span style={{ color: selectedSource === src.id ? t.textStrong : t.textDim, fontSize: "12px", fontWeight: 600 }}>{src.name}</span>
            </div>
            <div style={{ color: t.textMuted, fontSize: "11px", lineHeight: "1.4" }}>{src.desc}</div>
            {src.id === "upload" && (
              <div style={{ marginTop: "6px", background: t.blueTint, border: `1px solid ${t.blue}50`, borderRadius: "3px", padding: "2px 5px", color: "#5a6aba", fontSize: "9px", fontWeight: 700, display: "inline-block" }}>
                LIVE · RAG2 API
              </div>
            )}
          </button>
        ))}
      </div>

      {selectedSource === "upload" && (
        <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{ background: "#5a6aba20", border: "1px solid #5a6aba50", color: "#5a6aba", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>UP</span>
            <span style={{ color: t.textStrong, fontSize: "15px", fontWeight: 600 }}>Direct Upload</span>
            <span style={{ color: t.textGhost, fontSize: "12px", marginLeft: "auto" }}>→ S3Bucket/ via RAG2 API (:8081)</span>
          </div>
          <DirectUploadPanel user={user} />

          {onSkipToStep && (
            <div style={{ marginTop: "20px", padding: "14px 16px", background: t.blueTint, border: `1px solid ${t.blue}50`, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ color: t.blue, fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>Skip credentials &amp; document review?</div>
                <div style={{ color: t.textDim, fontSize: "11px" }}>Since you're uploading directly, steps 2 &amp; 3 are optional — jump straight to configuring your RAG pipeline.</div>
              </div>
              <button
                onClick={() => onSkipToStep(3)}
                style={{ background: t.blueTint, border: `1px solid ${t.blue}`, borderRadius: "6px", padding: "10px 20px", color: t.blue, cursor: "pointer", fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap", marginLeft: "16px" }}>
                Skip to Configure RAG →
              </button>
            </div>
          )}
        </div>
      )}

      {selectedSource !== "upload" && (
        <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{ background: `${active.badgeColor}20`, border: `1px solid ${active.badgeColor}50`, color: active.badgeColor, padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>{active.badge}</span>
            <span style={{ color: t.textStrong, fontSize: "15px", fontWeight: 600 }}>Connect {active.name}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
            {active.fields.map((field) => (
              <div key={field.label}>
                <label style={{ color: t.textMuted, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>{field.label}</label>
                <div style={{ background: t.inputBg, border: `1px solid ${t.borderMid}`, borderRadius: "4px", padding: "8px 12px", color: t.textGhost, fontSize: "13px", fontFamily: field.type === "uri" ? "'IBM Plex Mono', monospace" : "inherit" }}>{field.placeholder}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${t.borderSubtle}`, paddingTop: "12px" }}>
            <div style={{ color: t.textMuted, fontSize: "11px", fontWeight: 600, marginBottom: "6px" }}>AUTHENTICATION METHOD</div>
            {active.authMethods.map((m, i) => (
              <div key={m.id}>
                <div onClick={() => setSelectedAuth(i)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", background: selectedAuth === i ? t.blueTint : "transparent", border: selectedAuth === i ? `1px solid ${t.blue}50` : "1px solid transparent", borderRadius: "4px", marginBottom: "4px", cursor: "pointer" }}>
                  <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: `2px solid ${selectedAuth === i ? t.blue : t.textDisabled}`, background: selectedAuth === i ? t.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {selectedAuth === i && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: t.textStrong }} />}
                  </div>
                  <span style={{ color: selectedAuth === i ? t.text : t.textFaint, fontSize: "12px" }}>{m.label}</span>
                  {m.tag && <span style={{ background: t.greenTint, color: "#3a9a5a", padding: "1px 6px", borderRadius: "3px", fontSize: "9px", fontWeight: 700 }}>{m.tag}</span>}
                </div>
                {selectedAuth === i && m.id === "accesskey" && <AccessKeyForm />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
