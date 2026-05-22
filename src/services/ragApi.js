// All calls proxied through Vite → http://localhost:8081
const BASE = "/v1";

function authHeaders(user) {
  return {
    "x-user-id": user.userid,
    authorization: `Bearer ${user.token}`,
  };
}

// Upload a file — resolves with { file_id, original_name, size, owner }
export function uploadFile(user, file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/files`);
    xhr.setRequestHeader("x-user-id", user.userid);
    xhr.setRequestHeader("authorization", `Bearer ${user.token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error — is the RAG service running on :8081?"));
    xhr.send(formData);
  });
}

// List files — returns only files owned by the current user
export async function listFiles(user) {
  const res = await fetch(`${BASE}/files`, { headers: authHeaders(user) });
  if (!res.ok) throw new Error(`List files failed (${res.status})`);
  const all = await res.json();
  // Enforce entitlement: only return files owned by this user
  return all.filter((f) => (f.owner ?? f.owneruserid) === user.userid);
}

// Delete a file by id
export async function deleteFile(user, fileId) {
  const res = await fetch(`${BASE}/files/${fileId}`, {
    method: "DELETE",
    headers: authHeaders(user),
  });
  if (!res.ok) throw new Error(`Delete failed (${res.status}): ${await res.text()}`);
}

// Q&A — only callable on files owned by the current user (enforced by listFiles above)
export async function queryFile(user, fileId, question, provider = "xai") {
  const res = await fetch(`${BASE}/qa`, {
    method: "POST",
    headers: { ...authHeaders(user), "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId, question, provider }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Q&A failed (${res.status}): ${text}`);
  }
  return res.json(); // { answer, model }
}

// Multi-doc Store query — chat with a collection of un-indexed docs by
// fan-out over /v1/qa and merging answers. v1 implementation; a real
// /v1/qa/multi endpoint that concatenates parsed chunks server-side would
// be cleaner, but this keeps the backend untouched.
export async function queryStore(user, fileIds, question, provider = "xai") {
  if (!fileIds || fileIds.length === 0) throw new Error("No documents selected");
  const results = await Promise.all(
    fileIds.map((id) =>
      queryFile(user, Number(id), question, provider)
        .then((r) => ({ ok: true, fileId: id, ...r }))
        .catch((e) => ({ ok: false, fileId: id, error: e.message }))),
  );
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  if (ok.length === 0) {
    throw new Error(`All ${failed.length} document queries failed: ${failed[0]?.error || ""}`);
  }
  const merged = ok
    .map((r) => `--- Document ${r.fileId} (${r.model}) ---\n${r.answer}`)
    .join("\n\n");
  return {
    answer: merged,
    model: ok[0].model,
    perDoc: results,
  };
}

// LLM-based router for multi-KB chat — given a question and a list of KBs,
// returns the subset of KB ids that the question should be answered from.
// Falls back to all KB ids if the router LLM call or JSON parsing fails.
export async function routeQuestion(user, question, kbList, provider = "xai") {
  if (!kbList || kbList.length === 0) return { kbIds: [], fallback: false };
  if (kbList.length === 1) return { kbIds: [kbList[0].id], fallback: false };

  // We piggy-back on /v1/qa by routing through the first KB's first member
  // doc — the route prompt asks the model to return strict JSON. If no
  // routing doc is available, we just return all KBs (fallback).
  const routingDocId = kbList[0]?.docIds?.[0];
  if (!routingDocId) return { kbIds: kbList.map((k) => k.id), fallback: true };

  const summary = kbList
    .map((k) => `- id: "${k.id}" · name: "${k.name}"${k.description ? ` · ${k.description}` : ""}`)
    .join("\n");
  const routerPrompt =
    `You are a router. Pick which knowledge bases below are relevant to the user's question. ` +
    `Reply with strict JSON ONLY: {"kb_ids": ["id1", "id2"]}. No prose, no markdown.\n\n` +
    `KNOWLEDGE BASES:\n${summary}\n\n` +
    `USER QUESTION: ${question}`;

  try {
    const res = await queryFile(user, Number(routingDocId), routerPrompt, provider);
    const text = res.answer || "";
    const match = text.match(/\{[\s\S]*?"kb_ids"[\s\S]*?\}/);
    if (!match) throw new Error("router returned no JSON");
    const parsed = JSON.parse(match[0]);
    const valid = kbList.map((k) => k.id);
    const picked = (parsed.kb_ids || []).filter((id) => valid.includes(id));
    if (picked.length === 0) throw new Error("router returned empty set");
    return { kbIds: picked, fallback: false };
  } catch (_e) {
    return { kbIds: kbList.map((k) => k.id), fallback: true };
  }
}
