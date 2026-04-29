import { useWorkspace } from "../context/WorkspaceContext";
import ExtractionPanel from "../components/ExtractionPanel";

// Thin wrapper that renders the original ExtractionPanel as a full-screen
// workspace view. Pipeline stage updates are forwarded into the workspace
// pipelines map so sidebar status badges update live.

export default function ExtractionView() {
  const { extractionFile, extractionFileMeta, closeExtraction, patchPipeline, setFileBlob } = useWorkspace();
  const fileId = extractionFileMeta?.file_id ?? extractionFileMeta?.id ?? null;

  return (
    <ExtractionPanel
      onBack={closeExtraction}
      initialFile={extractionFile}
      initialFileMeta={extractionFileMeta}
      onStage={(stage, value) => { if (fileId != null) patchPipeline(fileId, { [stage]: value }); }}
      onAttach={(blob) => { if (fileId != null && blob) setFileBlob(fileId, blob); }}
    />
  );
}
