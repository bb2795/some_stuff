import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import KnowledgeWorkflow from "./KnowledgeWorkflow";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <KnowledgeWorkflow />
    </AuthProvider>
  </StrictMode>
);
