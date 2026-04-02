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
