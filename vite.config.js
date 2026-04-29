import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy /v1/* → RAG pipeline service on :8081
      "/v1": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      // Proxy /extraction/* → Extraction Agent on :8000
      "/extraction": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/extraction/, ""),
      },
    },
  },
});
