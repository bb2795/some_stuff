import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import { useWorkspace } from "./context/WorkspaceContext";
import { listFiles, uploadFile } from "./services/ragApi";

import TopBar from "./workspace/TopBar";
import Sidebar from "./workspace/Sidebar";
import MainPanel from "./workspace/MainPanel";
import ConnectDrawer from "./workspace/ConnectDrawer";
import ConfigureKBWizard from "./workspace/ConfigureKBWizard";
import BrowseView from "./workspace/BrowseView";

// NotebookLM-style workspace. Left sidebar with KBs + Documents + Sources;
// main panel is contextual to selection; connect flow is a drawer.
// Upload paths are implicit: drop a file, it uploads, appears in sidebar,
// click it to open the pipeline view.

export default function Workspace() {
  const { user } = useAuth();
  const { t } = useTheme();
  const { selection, openDoc, connectOpen, setConnectOpen, configureOpen, setConfigureOpen, browseOpen, closeBrowse, setFileBlob } = useWorkspace();
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState(null);

  const refresh = useCallback(() => {
    if (!user) return;
    setFilesLoading(true); setFilesError(null);
    listFiles(user)
      .then((f) => { setFiles(f); setFilesLoading(false); })
      .catch((e) => { setFilesError(e.message); setFilesLoading(false); });
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Upload files and, when the first one completes, open it.
  const handleUpload = async (fileList, { openFirst = true } = {}) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    for (let i = 0; i < arr.length; i++) {
      try {
        const result = await uploadFile(user, arr[i]);
        // Cache the actual File so extraction can run without re-prompting.
        setFileBlob(result.file_id, arr[i]);
        if (i === 0 && openFirst) {
          // Re-list so the new file is in state with real metadata
          const fresh = await listFiles(user);
          setFiles(fresh);
          const match = fresh.find((f) => (f.file_id ?? f.id) === result.file_id);
          if (match) openDoc(match);
        }
      } catch (e) {
        // Push error surface-level
        setFilesError(e.message);
      }
    }
    refresh();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: t.pageBg, color: t.text,
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <TopBar />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Sidebar
          files={files}
          filesLoading={filesLoading}
          filesError={filesError}
          onRefresh={refresh}
          onUpload={handleUpload}
          onOpenConnect={() => setConnectOpen(true)}
        />
        <MainPanel
          files={files}
          onUpload={handleUpload}
          onRefresh={refresh}
          selection={selection}
        />
      </div>

      {connectOpen && (
        <ConnectDrawer onClose={() => setConnectOpen(false)} />
      )}
      {configureOpen && (
        <ConfigureKBWizard onClose={() => setConfigureOpen(false)} />
      )}
      {browseOpen && (
        <BrowseView onClose={closeBrowse} />
      )}
    </div>
  );
}
