import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useJourney } from "../context/JourneyContext";
import ConnectSourceStep from "../components/steps/ConnectSourceStep";
import CredentialsStep from "../components/steps/CredentialsStep";

// Inner sub-steps for the Connect phase
const SUB_STEPS = [
  { id: "source", label: "Select Source",      desc: "Pick S3 / SharePoint / COS / Data Product" },
  { id: "creds",  label: "Establish Creds",    desc: "CloudFormation · IAM · OAuth" },
  { id: "verify", label: "Scan · Register · Verify", desc: "Validate access & classify" },
];

export default function ConnectPhase() {
  const { t } = useTheme();
  const { nextPhase, patch } = useJourney();
  const [sub, setSub] = useState("source");
  const [verifyState, setVerifyState] = useState("idle"); // idle | running | done

  const runVerify = () => {
    setVerifyState("running");
    setTimeout(() => {
      setVerifyState("done");
      patch({ source: { id: "s3", bucket: "s3://kb-data/ccb-risk/", objects: 1247 } });
    }, 2200);
  };

  return (
    <div>
      <p style={{ color: t.textDim, fontSize: 14, lineHeight: 1.6, marginTop: 0, marginBottom: 20 }}>
        Connect an enterprise source to Knowledge. Credentials are scoped, read-only, and revocable.
        Once verified, documents become visible in the next phase.
      </p>

      {/* Sub-step rail */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {SUB_STEPS.map((s, i) => {
          const active = sub === s.id;
          return (
            <button key={s.id} onClick={() => setSub(s.id)}
              style={{
                flex: 1, background: active ? "#EFF6FF" : t.cardBg,
                border: `2px solid ${active ? "#2563EB" : t.border}`, borderRadius: 8,
                padding: "12px 14px", textAlign: "left", cursor: "pointer",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 11,
                  background: active ? "#2563EB" : t.panelBg, color: active ? "#fff" : t.textMuted,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                }}>{i + 1}</span>
                <span style={{ color: active ? "#2563EB" : t.text, fontSize: 13, fontWeight: 700 }}>
                  {s.label}
                </span>
              </div>
              <div style={{ color: t.textMuted, fontSize: 11, marginTop: 4, marginLeft: 30 }}>
                {s.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Sub-step body */}
      <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 22 }}>
        {sub === "source" && (
          <>
            <ConnectSourceStep />
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSub("creds")}
                style={{ background: "#2563EB", color: "#fff", border: "1px solid #2563EB", borderRadius: 6, padding: "9px 22px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                Next · Credentials →
              </button>
            </div>
          </>
        )}

        {sub === "creds" && (
          <>
            <CredentialsStep />
            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setSub("source")}
                style={{ background: "transparent", color: t.textMuted, border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "9px 22px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                ← Back
              </button>
              <button onClick={() => setSub("verify")}
                style={{ background: "#2563EB", color: "#fff", border: "1px solid #2563EB", borderRadius: 6, padding: "9px 22px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                Next · Verify →
              </button>
            </div>
          </>
        )}

        {sub === "verify" && (
          <div>
            <h3 style={{ color: t.textStrong, fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>
              Scan · Register · Verify
            </h3>
            <p style={{ color: t.textDim, fontSize: 13, lineHeight: 1.6, margin: "0 0 18px" }}>
              Knowledge inventories the source, registers it into your dataspace, and runs a Terminal Verification Audit
              (TVA) to confirm credentials, browse permissions, and health.
            </p>

            <div style={{ background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: 16 }}>
              {[
                { label: "Assume role / use credentials",    done: verifyState !== "idle" },
                { label: "Enumerate bucket contents (1,247 objects detected)", done: verifyState === "done" },
                { label: "Classify & register into dataspace", done: verifyState === "done" },
                { label: "Health probe + permissions audit", done: verifyState === "done" },
              ].map((c, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 0", borderBottom: i < 3 ? `1px solid ${t.borderFaint}` : "none",
                }}>
                  <span style={{ fontSize: 14, color: c.done ? "#16A34A" : verifyState === "running" ? "#DC2626" : t.textDisabled }}>
                    {c.done ? "✓" : verifyState === "running" ? "⟳" : "○"}
                  </span>
                  <span style={{ color: c.done ? "#16A34A" : t.text, fontSize: 13 }}>{c.label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 12 }}>
              <button onClick={() => setSub("creds")}
                style={{ background: "transparent", color: t.textMuted, border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "9px 22px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                ← Back
              </button>

              {verifyState === "idle" && (
                <button onClick={runVerify}
                  style={{ background: "#2563EB", color: "#fff", border: "1px solid #2563EB", borderRadius: 6, padding: "9px 22px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  ▶ Run Verification
                </button>
              )}
              {verifyState === "running" && (
                <button disabled style={{ background: t.panelBg, color: t.textMuted, border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "9px 22px", fontWeight: 600, fontSize: 13 }}>
                  Running…
                </button>
              )}
              {verifyState === "done" && (
                <button onClick={nextPhase}
                  style={{ background: "#16A34A", color: "#fff", border: "1px solid #16A34A", borderRadius: 6, padding: "9px 22px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  ✓ Verified · Continue to Curate →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
