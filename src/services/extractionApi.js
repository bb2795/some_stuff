// Extraction Agent API — proxied through Vite → http://localhost:8000
const BASE = "/extraction";

/** List available extraction tools and their status */
export async function listTools() {
  const res = await fetch(`${BASE}/tools`);
  if (!res.ok) throw new Error(`Tools check failed (${res.status})`);
  return res.json(); // { tools: { docling: {available, ...}, ... } }
}

/**
 * Parse a document — full markdown extraction
 * @param {File} file - the file to parse
 * @param {string} tool - extraction tool name (e.g. "docling")
 * @param {(pct: number) => void} onProgress - optional progress callback
 * @returns {{ markdown, metadata, upload_id }}
 */
export function parseDocument(file, tool = "docling", onProgress) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("tool", tool);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/parse`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Parse failed (${xhr.status}): ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error — is the Extraction Agent running on :8000?"));
    xhr.send(formData);
  });
}

/**
 * Extract specific fields from a document
 * @param {File} file
 * @param {string} tool
 * @param {string[]} fields - field names to extract
 * @returns {{ markdown, metadata, fields, upload_id }}
 */
export async function extractFields(file, tool = "docling", fields = []) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("tool", tool);
  fields.forEach((f) => formData.append("extract_fields", f));

  const res = await fetch(`${BASE}/extract`, { method: "POST", body: formData });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Extract failed (${res.status}): ${text}`);
  }
  return res.json();
}

/** Get upload history */
export async function getUploads(limit = 20, offset = 0) {
  const res = await fetch(`${BASE}/uploads?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`Uploads fetch failed (${res.status})`);
  return res.json();
}
