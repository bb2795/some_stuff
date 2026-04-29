import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import ConnectSourceStep from "../components/steps/ConnectSourceStep";
import CredentialsStep from "../components/steps/CredentialsStep";

// Slide-in drawer for the Connect Source flow. Reuses the existing step
// components so the backend/credential logic is preserved verbatim.

const STEPS = [
  { id: "source", label: "Source" },
  { id: "creds",  label: "Credentials" },
  { id: "verify", label: "Verify" },
];

export default function ConnectDrawer({ onClose }) {
  const { t } = useTheme();
  const [step, setStep] = useState("source");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const runVerify = () => {
    setVerifying(true);
    setTimeout(() => { setVerifying(false); setVerified(true); }, 1800);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", justifyContent: "flex-end",
    }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
      <div style={{
        position: "relative", width: "min(900px, 90vw)", height: "100vh",
        background: t.pageBg, borderLeft: `1px solid ${t.border}`,
        boxShadow: "-10px 0 40px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column",
        animation: "slideIn 0.2s ease-out",
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${t.border}`, background: t.sidebarBg, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: 5, padding: "5px 10px", color: t.textMuted, cursor: "pointer", fontSize: 12 }}>✕</button>
          <div>
            <div style={{ color: t.textStrong, fontSize: 14, fontWeight: 800 }}>Connect a source</div>
            <div style={{ color: t.textMuted, fontSize: 11 }}>Source → Credentials → Verify. Data stays in your account.</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 4 }}>
            {STEPS.map((s, i) => {
              const active = s.id === step;
              const idx = STEPS.findIndex((x) => x.id === step);
              const past = i < idx;
              return (
                <button key={s.id} onClick={() => setStep(s.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: active ? "#2563EB" : (past ? "#2563EB20" : "transparent"),
                    border: `1px solid ${active ? "#2563EB" : (past ? "#2563EB40" : t.borderSubtle)}`,
                    color: active ? "#fff" : (past ? "#2563EB" : t.textMuted),
                    borderRadius: 14, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                  }}>
                  <span style={{ fontSize: 9 }}>{past ? "✓" : i + 1}</span> {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "22px 28px" }}>
          {step === "source" && (
            <>
              <ConnectSourceStep />
              <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setStep("creds")}
                  style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 6, padding: "9px 22px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  Next · Credentials →
                </button>
              </div>
            </>
          )}

          {step === "creds" && (
            <>
              <CredentialsStep />
              <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between" }}>
                <button onClick={() => setStep("source")}
                  style={{ background: "transparent", color: t.textMuted, border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "9px 22px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  ← Back
                </button>
                <button onClick={() => setStep("verify")}
                  style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 6, padding: "9px 22px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  Next · Verify →
                </button>
              </div>
            </>
          )}

          {step === "verify" && (
            <div>
              <h3 style={{ color: t.textStrong, fontSize: 18, fontWeight: 800, margin: 0 }}>Verify access</h3>
              <p style={{ color: t.textMuted, fontSize: 13, lineHeight: 1.6, marginTop: 6 }}>
                Assume role · enumerate bucket · classify · register. The source will appear in your sidebar under <strong>Connected Sources</strong>.
              </p>
              <div style={{ marginTop: 18, background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 18 }}>
                {[
                  { label: "sts:AssumeRole" },
                  { label: "s3:ListBucket · enumerate 1,247 objects" },
                  { label: "Classify & register into dataspace" },
                  { label: "Health probe · permissions audit" },
                ].map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 3 ? `1px solid ${t.borderFaint}` : "none" }}>
                    <span style={{ color: verified ? "#16A34A" : verifying ? "#EA580C" : t.textDisabled, fontSize: 14, width: 14 }}>
                      {verified ? "✓" : verifying ? "⟳" : "○"}
                    </span>
                    <span style={{ color: verified ? "#16A34A" : t.text, fontSize: 13 }}>{c.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between" }}>
                <button onClick={() => setStep("creds")}
                  style={{ background: "transparent", color: t.textMuted, border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "9px 22px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  ← Back
                </button>
                {!verifying && !verified && (
                  <button onClick={runVerify}
                    style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 6, padding: "9px 22px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    ▶ Run verification
                  </button>
                )}
                {verifying && (
                  <button disabled style={{ background: t.panelBg, color: t.textMuted, border: `1px solid ${t.borderMid}`, borderRadius: 6, padding: "9px 22px", fontWeight: 600, fontSize: 12 }}>
                    Running…
                  </button>
                )}
                {verified && (
                  <button onClick={onClose}
                    style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 6, padding: "9px 22px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    ✓ Connected · Close
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
