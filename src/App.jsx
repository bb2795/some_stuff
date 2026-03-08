import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import AuthGate from "./components/AuthGate";
import KBHub from "./KBHub";
import KnowledgeWorkflow from "./KnowledgeWorkflow";

export default function App() {
  const { user } = useAuth();
  const [view, setView] = useState("hub"); // "hub" | "workflow"
  const [workflowInitialStep, setWorkflowInitialStep] = useState(0);

  if (!user) return <AuthGate />;

  if (view === "workflow") {
    return (
      <KnowledgeWorkflow
        initialStep={workflowInitialStep}
        onBack={() => { setView("hub"); setWorkflowInitialStep(0); }}
      />
    );
  }

  return (
    <KBHub
      onCreateNew={() => { setWorkflowInitialStep(0); setView("workflow"); }}
    />
  );
}
