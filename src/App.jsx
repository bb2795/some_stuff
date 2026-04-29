import { useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext";
import AuthGate from "./components/AuthGate";

import Workspace from "./Workspace";
import ExtractionView from "./workspace/ExtractionView";
import FlowGraphScreen from "./screens/FlowGraphScreen";
import ObsidianGraphScreen from "./screens/ObsidianGraphScreen";
import AgentStudioScreen from "./screens/AgentStudioScreen";

function Router() {
  const { view } = useWorkspace();
  if (view === "extraction")    return <ExtractionView />;
  if (view === "flowgraph")     return <FlowGraphScreen />;
  if (view === "obsidian")      return <ObsidianGraphScreen />;
  if (view === "agent-studio")  return <AgentStudioScreen />;
  return <Workspace />;
}

// Shell reads the current user so it can re-key the WorkspaceProvider on
// user change — this remounts it with a clean slate (userKBs, pipelines,
// selection, file blobs, etc.) so switching users doesn't leak state.
function Shell() {
  const { user } = useAuth();
  if (!user) return <AuthGate />;
  return (
    <WorkspaceProvider key={user.userid}>
      <Router />
    </WorkspaceProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}
