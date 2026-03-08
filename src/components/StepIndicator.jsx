import { STEPS } from "../constants/steps";

export default function StepIndicator({ currentStep, onStepClick }) {
  return (
    <div style={{ display: "flex", gap: "2px", marginBottom: "28px" }}>
      {STEPS.map((step, i) => {
        const isActive = step.id === currentStep;
        const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
        const isPast = i < stepIndex;
        return (
          <button
            key={step.id}
            onClick={() => onStepClick(step.id)}
            style={{
              flex: 1,
              background: isActive ? "#1a2a3a" : isPast ? "#0a1a15" : "#111",
              border: `1px solid ${isActive ? "#3a7aba" : isPast ? "#1a4a2a" : "#222"}`,
              borderRadius: "6px",
              padding: "10px 8px",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "16px" }}>{step.icon}</span>
            <span
              style={{
                color: isActive ? "#3a7aba" : isPast ? "#3a9a5a" : "#666",
                fontSize: "11px",
                fontWeight: isActive ? 700 : 500,
                textAlign: "center",
              }}
            >
              {step.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
