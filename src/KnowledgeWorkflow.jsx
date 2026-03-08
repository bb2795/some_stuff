import { useState } from "react";
import { STEPS } from "./constants/steps";
import { useAuth } from "./context/AuthContext";
import AuthGate from "./components/AuthGate";
import StepIndicator from "./components/StepIndicator";
import ConnectSourceStep from "./components/steps/ConnectSourceStep";
import CredentialsStep from "./components/steps/CredentialsStep";
import LoadDocsStep from "./components/steps/LoadDocsStep";
import ConfigureRAGStep from "./components/steps/ConfigureRAGStep";
import DeployQueryStep from "./components/steps/DeployQueryStep";

export default function KnowledgeWorkflow({ onBack, initialStep = 0 }) {
  const { user, setUser } = useAuth();
  const [stepIndex, setStepIndex] = useState(initialStep);

  if (!user) return <AuthGate />;
  const currentStep = STEPS[stepIndex].id;

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0));
  const goToStep = (idx) => setStepIndex(Math.max(0, Math.min(idx, STEPS.length - 1)));

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div
      style={{
        background: "#0d0d0d",
        minHeight: "100vh",
        color: "#e0e0e0",
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: "1px solid #222", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {onBack && (
            <button onClick={onBack}
              style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "6px 12px", color: "#555", cursor: "pointer", fontSize: "12px" }}>
              ← Hub
            </button>
          )}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontWeight: 700, fontSize: "22px", color: "#fff", letterSpacing: "-0.5px" }}>
                Knowledge on Fusion
              </span>
              <span style={{ color: "#555", fontSize: "14px" }}>New KB Workflow</span>
            </div>
            <div style={{ color: "#444", fontSize: "12px", marginTop: "4px" }}>
              Connect → Credential → Load → Configure → Query
            </div>
          </div>
        </div>
        {/* User badge + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ background: `${user.color}15`, border: `1px solid ${user.color}40`, borderRadius: "6px", padding: "6px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: user.color, fontSize: "12px" }}>👤</span>
            <div>
              <div style={{ color: user.color, fontSize: "12px", fontWeight: 700 }}>{user.userid}</div>
              <div style={{ color: "#555", fontSize: "10px" }}>{user.label}</div>
            </div>
          </div>
          <button onClick={() => setUser(null)}
            style={{ background: "transparent", border: "1px solid #333", borderRadius: "6px", padding: "6px 12px", color: "#666", cursor: "pointer", fontSize: "12px" }}>
            Switch user
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "920px", margin: "0 auto", padding: "28px 32px" }}>
        <StepIndicator currentStep={currentStep} onStepClick={(id) => setStepIndex(STEPS.findIndex((s) => s.id === id))} />

        {/* Step title */}
        <h2
          style={{
            color: "#fff",
            fontSize: "24px",
            fontWeight: 700,
            marginBottom: "4px",
            letterSpacing: "-0.3px",
          }}
        >
          {STEPS[stepIndex].label}
        </h2>
        <div
          style={{
            height: "1px",
            background: "linear-gradient(to right, #3a7aba30, transparent)",
            marginBottom: "20px",
          }}
        />

        {currentStep === "connect" && <ConnectSourceStep onSkipToStep={goToStep} />}
        {currentStep === "credentials" && <CredentialsStep />}
        {currentStep === "load" && <LoadDocsStep />}
        {currentStep === "configure" && <ConfigureRAGStep onDeploy={goNext} />}
        {currentStep === "deploy" && <DeployQueryStep />}

        {/* Prev / Next navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px", paddingTop: "20px", borderTop: "1px solid #1a1a1a" }}>
          <button
            onClick={goPrev}
            disabled={isFirst}
            style={{
              background: isFirst ? "transparent" : "#111",
              border: `1px solid ${isFirst ? "transparent" : "#333"}`,
              borderRadius: "8px",
              padding: "10px 24px",
              color: isFirst ? "transparent" : "#888",
              cursor: isFirst ? "default" : "pointer",
              fontWeight: 600,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ← Previous
          </button>

          <span style={{ color: "#444", fontSize: "12px", alignSelf: "center" }}>
            {stepIndex + 1} / {STEPS.length}
          </span>

          <button
            onClick={goNext}
            disabled={isLast}
            style={{
              background: isLast ? "#1a4a2a" : "#1a2a3a",
              border: `1px solid ${isLast ? "#3a9a5a" : "#3a7aba"}`,
              borderRadius: "8px",
              padding: "10px 24px",
              color: "#fff",
              cursor: isLast ? "default" : "pointer",
              fontWeight: 600,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: isLast ? 0.5 : 1,
            }}
          >
            {isLast ? "Deployed ✓" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
