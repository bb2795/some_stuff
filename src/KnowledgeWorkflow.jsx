import { useState } from "react";
import { STEPS } from "./constants/steps";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import AuthGate from "./components/AuthGate";
import StepIndicator from "./components/StepIndicator";
import ConnectSourceStep from "./components/steps/ConnectSourceStep";
import CredentialsStep from "./components/steps/CredentialsStep";
import LoadDocsStep from "./components/steps/LoadDocsStep";
import ConfigureRAGStep from "./components/steps/ConfigureRAGStep";
import DeployQueryStep from "./components/steps/DeployQueryStep";

export default function KnowledgeWorkflow({ onBack, initialStep = 0, initialSource = null }) {
  const { user, setUser } = useAuth();
  const { t, isDark, toggleTheme } = useTheme();
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
        background: t.pageBg,
        minHeight: "100vh",
        color: t.text,
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${t.border}`, padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: t.sidebarBg }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {onBack && (
            <button onClick={onBack}
              style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: "6px", padding: "6px 12px", color: t.textGhost, cursor: "pointer", fontSize: "12px" }}>
              ← Hub
            </button>
          )}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontWeight: 700, fontSize: "22px", color: t.textStrong, letterSpacing: "-0.5px" }}>
                Knowledge
              </span>
              <span style={{ color: t.textGhost, fontSize: "14px" }}>New KB Workflow</span>
            </div>
            <div style={{ color: t.textDisabled, fontSize: "12px", marginTop: "4px" }}>
              Connect → Credential → Load → Configure → Query
            </div>
          </div>
        </div>
        {/* User badge + theme toggle + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ background: `${user.color}15`, border: `1px solid ${user.color}40`, borderRadius: "6px", padding: "6px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: user.color, fontSize: "12px" }}>👤</span>
            <div>
              <div style={{ color: user.color, fontSize: "12px", fontWeight: 700 }}>{user.userid}</div>
              <div style={{ color: t.textGhost, fontSize: "10px" }}>{user.label}</div>
            </div>
          </div>
          <button onClick={toggleTheme}
            style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: "6px", padding: "6px 12px", color: t.textMuted, cursor: "pointer", fontSize: "12px" }}>
            {isDark ? "☀" : "🌙"}
          </button>
          <button onClick={() => setUser(null)}
            style={{ background: "transparent", border: `1px solid ${t.borderMid}`, borderRadius: "6px", padding: "6px 12px", color: t.textMuted, cursor: "pointer", fontSize: "12px" }}>
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
            color: t.textStrong,
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
            background: `linear-gradient(to right, ${t.blue}30, transparent)`,
            marginBottom: "20px",
          }}
        />

        {currentStep === "connect" && <ConnectSourceStep onSkipToStep={goToStep} initialSource={initialSource} />}
        {currentStep === "credentials" && <CredentialsStep />}
        {currentStep === "load" && <LoadDocsStep />}
        {currentStep === "configure" && <ConfigureRAGStep onDeploy={goNext} />}
        {currentStep === "deploy" && <DeployQueryStep />}

        {/* Prev / Next navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px", paddingTop: "20px", borderTop: `1px solid ${t.borderSubtle}` }}>
          <button
            onClick={goPrev}
            disabled={isFirst}
            style={{
              background: isFirst ? "transparent" : t.panelBg,
              border: `1px solid ${isFirst ? "transparent" : t.borderMid}`,
              borderRadius: "8px",
              padding: "10px 24px",
              color: isFirst ? "transparent" : t.textMuted,
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

          <span style={{ color: t.textDisabled, fontSize: "12px", alignSelf: "center" }}>
            {stepIndex + 1} / {STEPS.length}
          </span>

          <button
            onClick={goNext}
            disabled={isLast}
            style={{
              background: isLast ? t.greenTint : t.blueTint,
              border: `1px solid ${isLast ? t.green : t.blue}`,
              borderRadius: "8px",
              padding: "10px 24px",
              color: t.textStrong,
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
