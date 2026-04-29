import { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import FeasibilityNote from "../FeasibilityNote";

const FLOW_STEPS = [
  { id: "choose", label: "Choose Method" },
  { id: "bucket", label: "Enter Bucket" },
  { id: "provision", label: "Provision Access" },
  { id: "verify", label: "Verify Connection" },
  { id: "done", label: "Connected" },
];

function ProgressBar({ currentIndex }) {
  const { t } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "32px" }}>
      {FLOW_STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isPast = i < currentIndex;
        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center", flex: i < FLOW_STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "60px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: isPast ? "#1a4a2a" : isActive ? "#1a2a3a" : t.inputBg,
                  border: `2px solid ${isPast ? "#3a9a5a" : isActive ? "#3a7aba" : t.borderMid}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s",
                }}
              >
                {isPast ? (
                  <span style={{ color: "#3a9a5a", fontSize: "14px" }}>✓</span>
                ) : (
                  <span style={{ color: isActive ? "#3a7aba" : t.textGhost, fontSize: "13px", fontWeight: 700 }}>{i + 1}</span>
                )}
              </div>
              <span
                style={{
                  color: isPast ? "#3a9a5a" : isActive ? t.text : t.textGhost,
                  fontSize: "10px",
                  fontWeight: isActive ? 600 : 400,
                  marginTop: "4px",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {step.label}
              </span>
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "2px",
                  background: isPast ? "#3a9a5a40" : t.border,
                  margin: "0 4px",
                  marginBottom: "18px",
                  transition: "all 0.3s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function LoadingDots() {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => setDots((d) => (d % 3) + 1), 400);
    return () => clearInterval(interval);
  }, []);
  return <span style={{ color: "#3a7aba" }}>{".".repeat(dots)}</span>;
}

// ─── Sub-step 1: Choose Method ───
function ChooseMethodStep({ onNext }) {
  const { t } = useTheme();
  const [selected, setSelected] = useState("auto");

  const methods = [
    {
      id: "auto",
      title: "One-Click Setup",
      badge: "RECOMMENDED",
      badgeColor: "#3a9a5a",
      desc: "Knowledge deploys a CloudFormation stack in your AWS account that creates a read-only role scoped to your bucket. You just click 'Authorize' in your AWS console — no policy writing, no ARN copying.",
      steps: ["Enter your S3 bucket path", "Knowledge generates a CloudFormation stack", "You click 'Launch Stack' (opens AWS with pre-filled template)", "AWS creates the role automatically", "Knowledge verifies the connection"],
      time: "~2 minutes",
    },
    {
      id: "terraform",
      title: "Terraform Module",
      badge: "INFRA-AS-CODE",
      badgeColor: "#8a5aba",
      desc: "Download a pre-built Terraform module that creates the IAM role. Ideal for teams managing infrastructure through CI/CD pipelines.",
      steps: ["Enter your S3 bucket path", "Download Terraform module", "Run terraform apply in your pipeline", "Knowledge detects the role automatically"],
      time: "~5 minutes",
    },
    {
      id: "manual",
      title: "Manual Setup",
      badge: "ADVANCED",
      badgeColor: "#ba8a3a",
      desc: "For teams with custom IAM requirements. Knowledge provides the trust policy and permission policy — you create the role yourself.",
      steps: ["Enter your S3 bucket path", "Copy the generated trust policy", "Create role in your AWS account", "Paste Role ARN back into Knowledge"],
      time: "~10 minutes",
    },
  ];

  return (
    <div>
      <h3 style={{ color: t.textStrong, fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>
        How should Knowledge access your S3 bucket?
      </h3>
      <p style={{ color: t.textMuted, fontSize: "13px", lineHeight: "1.6", marginBottom: "20px" }}>
        All methods create an IAM role in <em>your</em> AWS account. Knowledge assumes this role with read-only permissions. No credentials are stored — you can revoke access anytime.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
        {methods.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m.id)}
            style={{
              background: selected === m.id ? t.blueTint : t.cardBg,
              border: `2px solid ${selected === m.id ? "#3a7aba" : t.borderSubtle}`,
              borderRadius: "10px",
              padding: "18px 20px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: `2px solid ${selected === m.id ? "#3a7aba" : t.textDisabled}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                {selected === m.id && (
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3a7aba" }} />
                )}
              </div>
              <span style={{ color: t.textStrong, fontSize: "16px", fontWeight: 600 }}>{m.title}</span>
              <span
                style={{
                  background: `${m.badgeColor}15`,
                  border: `1px solid ${m.badgeColor}40`,
                  color: m.badgeColor,
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                {m.badge}
              </span>
              <span style={{ color: t.textGhost, fontSize: "12px", marginLeft: "auto" }}>{m.time}</span>
            </div>
            <p style={{ color: t.textMuted, fontSize: "13px", lineHeight: "1.5", margin: "0 0 10px 30px" }}>
              {m.desc}
            </p>
            {selected === m.id && (
              <div style={{ marginLeft: "30px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {m.steps.map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span
                      style={{
                        background: "#1a2a3a",
                        color: "#3a7aba",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "9px",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ color: t.textFaint, fontSize: "11px" }}>{step}</span>
                    {i < m.steps.length - 1 && <span style={{ color: t.borderMid, margin: "0 2px" }}>→</span>}
                  </div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        style={{
          background: "#1a3a5a",
          border: "1px solid #3a7aba",
          borderRadius: "8px",
          padding: "12px 32px",
          color: t.textStrong,
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "14px",
          width: "100%",
        }}
      >
        Continue with {methods.find((m) => m.id === selected)?.title}
      </button>
    </div>
  );
}

// ─── Sub-step 2: Enter Bucket ───
function BucketStep({ onNext }) {
  const { t } = useTheme();
  const [bucket, setBucket] = useState("s3://kb-data/ccb-risk/ccb-risk-exposures/");
  const [scanned, setScanned] = useState(false);

  return (
    <div>
      <h3 style={{ color: t.textStrong, fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>
        Point to your S3 bucket
      </h3>
      <p style={{ color: t.textMuted, fontSize: "13px", lineHeight: "1.6", marginBottom: "20px" }}>
        Enter the bucket URI. You can scope to a prefix (folder) within the bucket.
      </p>

      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "20px", marginBottom: "16px" }}>
        <label style={{ color: t.textMuted, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
          S3 Bucket URI
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={bucket}
            onChange={(e) => { setBucket(e.target.value); setScanned(false); }}
            style={{
              flex: 1,
              background: t.inputBg,
              border: `1px solid ${t.borderMid}`,
              borderRadius: "6px",
              padding: "10px 14px",
              color: t.text,
              fontSize: "14px",
              fontFamily: "'IBM Plex Mono', monospace",
              outline: "none",
            }}
          />
          <button
            onClick={() => setScanned(true)}
            style={{
              background: "#1a2a3a",
              border: "1px solid #2a4a6a",
              borderRadius: "6px",
              padding: "10px 20px",
              color: "#3a7aba",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              whiteSpace: "nowrap",
            }}
          >
            Scan Bucket
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
          {[
            { label: "Dataspace", value: "CCB Risk" },
            { label: "Region", value: "us-east-1" },
          ].map((f) => (
            <div key={f.label}>
              <label style={{ color: t.textMuted, fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                {f.label}
              </label>
              <div style={{ background: t.inputBg, border: `1px solid ${t.borderMid}`, borderRadius: "4px", padding: "8px 12px", color: t.textDim, fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {f.value} <span style={{ color: t.textGhost }}>▾</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {scanned && (
        <div style={{ background: t.greenTint, border: "1px solid #1a4a2a", borderRadius: "10px", padding: "20px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3a9a5a" }} />
            <span style={{ color: "#3a9a5a", fontWeight: 700, fontSize: "13px" }}>Bucket found</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            {[
              { label: "Account", value: "987654321098" },
              { label: "Objects", value: "1,247" },
              { label: "Total Size", value: "2.8 GB" },
              { label: "Last Modified", value: "2025-12-22" },
            ].map((m) => (
              <div key={m.label} style={{ background: t.deepBg, border: "1px solid #1a3a1a", borderRadius: "4px", padding: "8px 10px" }}>
                <div style={{ color: "#5a8a5a", fontSize: "10px", fontWeight: 600 }}>{m.label}</div>
                <div style={{ color: t.text, fontSize: "14px", fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{m.value}</div>
              </div>
            ))}
          </div>

          <div style={{ color: "#5a8a5a", fontSize: "12px", marginBottom: "4px", fontWeight: 600 }}>File types detected:</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { type: "PDF", count: 342, pct: "27%" },
              { type: "Parquet", count: 580, pct: "47%" },
              { type: "CSV", count: 198, pct: "16%" },
              { type: "DOCX", count: 89, pct: "7%" },
              { type: "JSON", count: 38, pct: "3%" },
            ].map((f) => (
              <span key={f.type} style={{ background: t.greenTint, border: `1px solid ${t.green}50`, borderRadius: "4px", padding: "4px 10px", fontSize: "11px", color: t.green }}>
                {f.type} · {f.count} ({f.pct})
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!scanned}
        style={{
          background: scanned ? t.blue : t.inputBg,
          border: `1px solid ${scanned ? t.blue : t.borderMid}`,
          borderRadius: "8px",
          padding: "12px 32px",
          color: scanned ? "#ffffff" : t.textGhost,
          cursor: scanned ? "pointer" : "not-allowed",
          fontWeight: 600,
          fontSize: "14px",
          width: "100%",
        }}
      >
        Set Up Access to This Bucket
      </button>
    </div>
  );
}

// ─── Sub-step 3: Provision ───
function ProvisionStep({ onNext }) {
  const { t } = useTheme();
  const [phase, setPhase] = useState("preview");

  const handleLaunch = () => {
    setPhase("launching");
    setTimeout(() => setPhase("waiting"), 1500);
    setTimeout(() => setPhase("complete"), 4000);
  };

  const stackDetails = {
    name: "KB-CCBRisk-ReadOnly",
    resources: [
      { type: "AWS::IAM::Role", name: "KBReadOnlyRole", desc: "Cross-account role for Knowledge ingestion service" },
      { type: "AWS::IAM::Policy", name: "KBS3ReadPolicy", desc: "Read-only access scoped to s3://kb-data/ccb-risk/" },
    ],
    permissions: [
      { action: "s3:GetObject", resource: "arn:aws:s3:::kb-data/ccb-risk/*", note: "Read documents" },
      { action: "s3:ListBucket", resource: "arn:aws:s3:::kb-data", note: "List bucket contents" },
      { action: "s3:GetBucketNotificationConfiguration", resource: "arn:aws:s3:::kb-data", note: "Enable event-driven sync" },
    ],
    excluded: ["s3:PutObject", "s3:DeleteObject", "s3:PutBucketPolicy", "iam:CreateUser", "iam:CreateRole", "ec2:*", "lambda:*"],
  };

  return (
    <div>
      <h3 style={{ color: t.textStrong, fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>
        {phase === "complete" ? "Access provisioned" : "Review & authorize access"}
      </h3>
      <p style={{ color: t.textMuted, fontSize: "13px", lineHeight: "1.6", marginBottom: "20px" }}>
        {phase === "preview" && "Knowledge has generated a CloudFormation template. Review what will be created in your AWS account, then click to deploy."}
        {phase === "launching" && "Opening AWS CloudFormation in a new tab with the pre-filled template..."}
        {phase === "waiting" && "Waiting for you to click 'Create Stack' in the AWS tab. Knowledge is polling for the role..."}
        {phase === "complete" && "The IAM role has been created and Knowledge has verified access. No credentials were stored."}
      </p>

      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
        <div style={{ background: t.panelBg, padding: "14px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#ba8a3a", fontSize: "14px" }}>☁</span>
            <span style={{ color: t.text, fontWeight: 600, fontSize: "14px" }}>CloudFormation Stack</span>
            <FeasibilityNote
              align="right"
              title="CloudFormation One-Click — AWS Best Practice"
              verdict="ExternalId + least-privilege IAM is the AWS-documented pattern for SaaS integrations"
              verdictType="success"
              bullets={[
                "AWS IAM documentation explicitly recommends ExternalId in the trust policy to prevent confused deputy attacks when vendors assume cross-account roles",
                "Datadog AWS Integration uses this exact pattern: CF stack, cross-account role with ExternalId, sts:AssumeRole — deployed by 20,000+ AWS accounts",
                "Lacework, Wiz, and Orca Security all use CloudFormation one-click onboarding with the same trust policy structure",
                "Read-only permissions (s3:GetObject, s3:ListBucket, s3:GetBucketNotificationConfiguration) are the minimum needed — principle of least privilege",
                "Customer retains full ownership — the IAM role lives in their AWS account and can be deleted at any time to instantly revoke Knowledge's access",
              ]}
            />
          </div>
          <span style={{ color: t.textFaint, fontSize: "12px", fontFamily: "'IBM Plex Mono', monospace" }}>{stackDetails.name}</span>
        </div>

        <div style={{ padding: "20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <div style={{ color: "#3a7aba", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", marginBottom: "10px" }}>
              Resources Created in Your Account
            </div>
            {stackDetails.resources.map((r) => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: t.deepBg, border: `1px solid ${t.borderSubtle}`, borderRadius: "6px", marginBottom: "6px" }}>
                <span style={{ color: "#3a7aba", fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace", background: t.blueTint, padding: "2px 8px", borderRadius: "3px", flexShrink: 0 }}>
                  {r.type}
                </span>
                <span style={{ color: t.text, fontSize: "13px", fontWeight: 500 }}>{r.name}</span>
                <span style={{ color: t.textMuted, fontSize: "12px", marginLeft: "auto" }}>{r.desc}</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div style={{ color: "#3a9a5a", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", marginBottom: "10px" }}>
              Permissions Granted (Read-Only)
            </div>
            <div style={{ background: t.greenTint, border: `1px solid ${t.green}40`, borderRadius: "6px", overflow: "hidden" }}>
              {stackDetails.permissions.map((p, i) => (
                <div key={p.action} style={{ display: "grid", gridTemplateColumns: "180px 1fr 140px", padding: "8px 12px", borderBottom: i < stackDetails.permissions.length - 1 ? `1px solid ${t.green}30` : "none", alignItems: "center" }}>
                  <span style={{ color: "#3a9a5a", fontSize: "12px", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>{p.action}</span>
                  <span style={{ color: t.textMuted, fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace" }}>{p.resource}</span>
                  <span style={{ color: "#5a8a5a", fontSize: "11px", textAlign: "right" }}>{p.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color: "#ba4a4a", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px" }}>
              Explicitly Excluded (Not Granted)
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {stackDetails.excluded.map((e) => (
                <span key={e} style={{ background: t.redTint, border: `1px solid ${t.red}40`, color: t.red, padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace", textDecoration: "line-through", textDecorationColor: t.red }}>
                  {e}
                </span>
              ))}
            </div>
            <div style={{ color: t.textMuted, fontSize: "11px", marginTop: "8px" }}>
              Knowledge cannot write, delete, modify bucket policies, create users/roles, or access any other AWS service.
            </div>
          </div>
        </div>
      </div>

      {phase === "preview" && (
        <button onClick={handleLaunch} style={{ background: t.blue, border: `1px solid ${t.blue}`, borderRadius: "8px", padding: "14px 32px", color: "#ffffff", cursor: "pointer", fontWeight: 600, fontSize: "14px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <span>Launch Stack in AWS</span>
          <span style={{ fontSize: "12px", opacity: 0.6 }}>↗ opens in new tab with pre-filled template</span>
        </button>
      )}

      {phase === "launching" && (
        <div style={{ background: t.blueTint, border: "1px solid #1a3a5a", borderRadius: "8px", padding: "20px", textAlign: "center" }}>
          <div style={{ color: "#3a7aba", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>Opening AWS CloudFormation<LoadingDots /></div>
          <div style={{ color: t.textMuted, fontSize: "12px" }}>A new tab is opening with the pre-filled template. All fields are auto-populated — just click "Create Stack."</div>
        </div>
      )}

      {phase === "waiting" && (
        <div style={{ background: t.panelBg, border: `1px solid ${t.borderMid}`, borderRadius: "8px", padding: "20px" }}>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ba8a3a", animation: "pulse 1.5s infinite" }} />
            <span style={{ color: "#ba8a3a", fontWeight: 600, fontSize: "14px" }}>Waiting for stack creation</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { label: "CloudFormation template sent", status: "done" },
              { label: "Waiting for you to click 'Create Stack' in AWS console", status: "waiting" },
              { label: "Role creation & policy attachment", status: "pending" },
              { label: "Knowledge verifies role assumption", status: "pending" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {item.status === "done" && <span style={{ color: "#3a9a5a", fontSize: "14px" }}>✓</span>}
                {item.status === "waiting" && <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #ba8a3a", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />}
                {item.status === "pending" && <span style={{ color: t.textDisabled, fontSize: "14px" }}>○</span>}
                <span style={{ color: item.status === "done" ? "#3a9a5a" : item.status === "waiting" ? t.text : t.textGhost, fontSize: "13px" }}>
                  {item.label}{item.status === "waiting" && <LoadingDots />}
                </span>
              </div>
            ))}
          </div>
          <div style={{ color: t.textGhost, fontSize: "11px", marginTop: "12px", borderTop: `1px solid ${t.borderSubtle}`, paddingTop: "10px" }}>
            Don't see the AWS tab? <span style={{ color: "#3a7aba", cursor: "pointer", textDecoration: "underline" }}>Click here to re-open</span>.
          </div>
        </div>
      )}

      {phase === "complete" && (
        <div>
          <div style={{ background: t.greenTint, border: "1px solid #1a4a2a", borderRadius: "8px", padding: "20px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3a9a5a", boxShadow: "0 0 10px #3a9a5a60" }} />
              <span style={{ color: "#3a9a5a", fontWeight: 700, fontSize: "14px" }}>Stack created successfully</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {["CloudFormation template sent", "Stack created in your account", "IAM role created: KBReadOnlyRole", "Knowledge verified role assumption"].map((label) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#3a9a5a", fontSize: "14px" }}>✓</span>
                  <span style={{ color: "#8aaa8a", fontSize: "13px" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
            {[
              { label: "Role ARN", value: "arn:aws:iam::987654321098:role/KBReadOnlyRole" },
              { label: "External ID", value: "kb-ccb-risk-a7f3x" },
              { label: "Permissions", value: "s3:GetObject, s3:ListBucket (read-only)" },
              { label: "Revocation", value: "Delete the CloudFormation stack anytime" },
            ].map((d) => (
              <div key={d.label}>
                <div style={{ color: t.textGhost, fontSize: "10px", fontWeight: 600, textTransform: "uppercase" }}>{d.label}</div>
                <div style={{ color: t.textDim, fontSize: "12px", fontFamily: "'IBM Plex Mono', monospace" }}>{d.value}</div>
              </div>
            ))}
          </div>

          <button onClick={onNext} style={{ background: "#1a4a2a", border: "1px solid #3a9a5a", borderRadius: "8px", padding: "12px 32px", color: t.textStrong, cursor: "pointer", fontWeight: 600, fontSize: "14px", width: "100%" }}>
            Continue to Verify Connection
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-step 4: Verify ───
function VerifyStep({ onNext }) {
  const { t } = useTheme();
  const [verifyPhase, setVerifyPhase] = useState("running");

  useEffect(() => {
    const timer = setTimeout(() => setVerifyPhase("passed"), 3000);
    return () => clearTimeout(timer);
  }, []);

  const checks = [
    { name: "Assume role", desc: "Can Knowledge assume the IAM role?", status: verifyPhase === "running" ? "checking" : "pass", time: "120ms" },
    { name: "List objects", desc: "Can Knowledge list the bucket contents?", status: verifyPhase === "running" ? "checking" : "pass", time: "340ms" },
    { name: "Read sample", desc: "Can Knowledge read a sample document?", status: verifyPhase === "running" ? "pending" : "pass", time: "85ms" },
    { name: "Event notifications", desc: "Can Knowledge receive S3 event notifications?", status: verifyPhase === "running" ? "pending" : "pass", time: "210ms" },
    { name: "Network path", desc: "Is the bucket reachable from Knowledge's VPC?", status: verifyPhase === "running" ? "pending" : "pass", time: "12ms" },
  ];

  return (
    <div>
      <h3 style={{ color: t.textStrong, fontSize: "20px", fontWeight: 700, marginBottom: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
        {verifyPhase === "running" ? "Verifying connection..." : "All checks passed"}
        <FeasibilityNote
          align="right"
          title="IAM Role Verification — Standard AWS Pattern"
          verdict="sts:AssumeRole → s3:ListObjectsV2 → s3:GetObject is the industry-standard verification flow"
          verdictType="success"
          bullets={[
            "sts:AssumeRole returns temporary credentials (STS tokens) — this is how every cross-account service integration works in AWS",
            "S3 event notifications (SNS/SQS) enable real-time incremental sync — same mechanism used by AWS Bedrock Knowledge Bases and Databricks Unity Catalog",
            "VPC endpoint reachability check mirrors AWS recommended IAM Access Analyzer verification steps",
            "Datadog verifies IAM role assumption in exactly this way during their AWS integration setup — latency figures (120ms role assume, 340ms list) are realistic for us-east-1",
            "Once verified, credentials are never stored — Knowledge re-assumes the role on demand using the stored Role ARN + ExternalId",
          ]}
        />
      </h3>
      <p style={{ color: t.textMuted, fontSize: "13px", lineHeight: "1.6", marginBottom: "20px" }}>
        Knowledge is running a series of health checks to confirm end-to-end connectivity before you start loading documents.
      </p>

      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
        {checks.map((check, i) => (
          <div key={check.name} style={{ display: "grid", gridTemplateColumns: "180px 1fr 80px 60px", padding: "12px 16px", borderBottom: i < checks.length - 1 ? `1px solid ${t.borderFaint}` : "none", alignItems: "center", opacity: check.status === "pending" ? 0.4 : 1, transition: "opacity 0.3s" }}>
            <span style={{ color: t.text, fontSize: "13px", fontWeight: 500 }}>{check.name}</span>
            <span style={{ color: t.textFaint, fontSize: "12px" }}>{check.desc}</span>
            <span style={{ textAlign: "right" }}>
              {check.status === "pass" && <span style={{ color: "#3a9a5a", fontWeight: 700, fontSize: "12px" }}>✓ Pass</span>}
              {check.status === "checking" && <span style={{ color: "#ba8a3a", fontSize: "12px" }}>Checking<LoadingDots /></span>}
              {check.status === "pending" && <span style={{ color: t.textDisabled, fontSize: "12px" }}>Pending</span>}
            </span>
            <span style={{ color: t.textGhost, fontSize: "11px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>
              {check.status === "pass" ? check.time : "—"}
            </span>
          </div>
        ))}
      </div>

      {verifyPhase === "passed" && (
        <div>
          <div style={{ background: t.greenTint, border: "1px solid #1a4a2a", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
            <div style={{ color: "#3a9a5a", fontSize: "13px", fontWeight: 600 }}>
              ✓ Connection verified. Knowledge can read from s3://kb-data/ccb-risk/ccb-risk-exposures/ with 1,247 objects detected.
            </div>
          </div>
          <button onClick={onNext} style={{ background: "#1a4a2a", border: "1px solid #3a9a5a", borderRadius: "8px", padding: "12px 32px", color: t.textStrong, cursor: "pointer", fontWeight: 600, fontSize: "14px", width: "100%" }}>
            Start Loading Documents
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-step 5: Done ───
function DoneStep() {
  const { t } = useTheme();
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #0a1a15, #0a1520)", border: "1px solid #1a4a2a", borderRadius: "12px", padding: "32px", textAlign: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>✓</div>
        <h3 style={{ color: t.textStrong, fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>Source Connected</h3>
        <p style={{ color: t.textMuted, fontSize: "14px", lineHeight: "1.6", maxWidth: "500px", margin: "0 auto 20px" }}>
          Your S3 bucket is connected to Knowledge. You can now load documents, configure your RAG pipeline, and start querying.
        </p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {[
            { label: "Load Documents", primary: true },
            { label: "Configure RAG Pipeline", primary: false },
            { label: "View in Knowledge Hub", primary: false },
          ].map((btn) => (
            <button key={btn.label} style={{ background: btn.primary ? "#1a4a2a" : t.panelBg, border: `1px solid ${btn.primary ? "#3a9a5a" : t.borderMid}`, borderRadius: "6px", padding: "10px 20px", color: btn.primary ? t.textStrong : t.textDim, cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px" }}>
        <div style={{ color: t.textMuted, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", marginBottom: "10px" }}>Connection Summary</div>
        {[
          { label: "Source", value: "s3://kb-data/ccb-risk/ccb-risk-exposures/" },
          { label: "Account", value: "987654321098" },
          { label: "Access Method", value: "IAM Cross-Account Role (CloudFormation)" },
          { label: "Role", value: "arn:aws:iam::987654321098:role/KBReadOnlyRole" },
          { label: "Permissions", value: "Read-only (s3:GetObject, s3:ListBucket)" },
          { label: "Credentials Stored", value: "None — role assumption only" },
          { label: "Revocation", value: "Delete CloudFormation stack in your AWS account" },
          { label: "Objects Detected", value: "1,247" },
          { label: "Dataspace", value: "CCB Risk" },
        ].map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
            <span style={{ color: t.textFaint, fontSize: "12px" }}>{r.label}</span>
            <span style={{ color: t.text, fontSize: "12px", fontFamily: "'IBM Plex Mono', monospace", textAlign: "right", maxWidth: "60%" }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main export (used as Step 2 of the outer workflow) ───
export default function CredentialsStep() {
  const { t } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const goNext = () => setStepIndex((i) => Math.min(i + 1, FLOW_STEPS.length - 1));

  return (
    <div>
      <ProgressBar currentIndex={stepIndex} />
      {stepIndex === 0 && <ChooseMethodStep onNext={goNext} />}
      {stepIndex === 1 && <BucketStep onNext={goNext} />}
      {stepIndex === 2 && <ProvisionStep onNext={goNext} />}
      {stepIndex === 3 && <VerifyStep onNext={goNext} />}
      {stepIndex === 4 && <DoneStep />}
    </div>
  );
}
