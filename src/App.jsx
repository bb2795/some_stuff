import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import AuthGate from "./components/AuthGate";
import KBHub from "./KBHub";
import KnowledgeWorkflow from "./KnowledgeWorkflow";

export default function App() {
  const { user } = useAuth();
  const [view, setView] = useState("hub"); // "hub" | "workflow"
  const [workflowInitialStep, setWorkflowInitialStep] = useState(0);
  const [workflowInitialSource, setWorkflowInitialSource] = useState(null);

  if (!user) return <AuthGate />;

  const goToHub = () => { setView("hub"); setWorkflowInitialStep(0); setWorkflowInitialSource(null); };

  if (view === "workflow") {
    return (
      <KnowledgeWorkflow
        initialStep={workflowInitialStep}
        initialSource={workflowInitialSource}
        onBack={goToHub}
      />
    );
  }

  return (
    <KBHub
      onCreateNew={() => { setWorkflowInitialStep(0); setWorkflowInitialSource(null); setView("workflow"); }}
      onUploadDocs={() => { setWorkflowInitialStep(0); setWorkflowInitialSource("upload"); setView("workflow"); }}
    />
  );
}
