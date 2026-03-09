import { STEPS } from "../constants/steps";
import { useTheme } from "../context/ThemeContext";

export default function StepIndicator({ currentStep, onStepClick }) {
  const { t } = useTheme();

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
              background: isActive ? t.blueTint : isPast ? t.greenTint : t.panelBg,
              border: `1px solid ${isActive ? t.blue : isPast ? t.green : t.border}`,
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
                color: isActive ? t.blue : isPast ? t.green : t.textMuted,
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
