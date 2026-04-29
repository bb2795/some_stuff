# Knowledge

A React + Vite UI for an end-to-end Knowledge Base creation workflow:
**Connect → Credential → Load → Configure → Query**.

The frontend is purely demo/UX — it visualizes the journey of registering a
data source, generating cross-account IAM credentials, ingesting and chunking
documents, configuring a RAG pipeline, and querying the resulting knowledge
artifact.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Stack

- React 18
- Vite 5
- IBM Plex Sans / IBM Plex Mono

## Optional backend services

`deploy.py` boots the full stack (Vite UI + a separate RAG2 backend on
:8080/:8081 + an extraction agent on :8000). The backend services are not
included in this repo — without them, the UI runs but upload, extraction,
and Q&A endpoints will return connection errors.

## Layout

- `src/KBHub.jsx` — KB hub / catalog
- `src/Workspace.jsx` — workspace shell
- `src/phases/` — Connect / Load / Configure / Consume phases
- `src/components/steps/` — individual workflow steps
- `src/screens/` — Agent Studio, Flow Graph, Obsidian Graph
- `src/context/` — Auth, Workspace, Theme, Journey contexts

## License

MIT
