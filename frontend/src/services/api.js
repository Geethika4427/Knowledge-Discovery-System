// const API_BASE =
//   import.meta.env.VITE_REACT_APP_API_BASE || "http://localhost:5000/api/documents";

// // ----------------- UPLOAD -----------------
// export async function uploadDocument(formData) {
//   const res = await fetch(`${API_BASE}/upload`, {
//     method: "POST",
//     body: formData,
//   });
//   return res.json();
// }

// // ----------------- SEARCH -----------------
// export async function searchDocuments(q) {
//   const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
//   const data = await res.json();
//   return data.results || [];
// }

// // ----------------- RECENT -----------------
// export async function fetchRecent() {
//   const res = await fetch(`${API_BASE}/recent?per=10`);
//   const data = await res.json();
//   return data.results || [];
// }

// // ----------------- CATEGORIES -----------------
// export async function fetchCategories() {
//   const res = await fetch(`${API_BASE}/categories`);
//   const data = await res.json();
//   return data.tags || [];
// }

// // ----------------- DELETE DOC -----------------
// export async function deleteDocument(id) {
//   const res = await fetch(`${API_BASE}/delete/${id}`, { method: "DELETE" });
//   return res.json();
// }


const API_BASE =
  import.meta.env.VITE_REACT_APP_API_BASE || "http://localhost:5000/api/documents";

// Upload
export async function uploadDocument(formData) {
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

// Search (with page/per/mode support)
export async function searchDocuments({ q = "", page = 1, per = 10, mode = "keyword" } = {}) {
  const url = new URL(`${API_BASE}/search`, window.location.origin);
  url.searchParams.set("q", q);
  url.searchParams.set("page", page);
  url.searchParams.set("per", per);
  url.searchParams.set("mode", mode);
  const res = await fetch(url.toString());
  return res.json();
}

export async function fetchRecent() {
  const res = await fetch(`${API_BASE}/recent?per=8`);
  const j = await res.json();
  return j.results || [];
}

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  const j = await res.json();
  return j.tags || [];
}

export async function deleteDocument(id) {
  // Your backend earlier expected DELETE /api/documents/:id
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  return res.json();
}

export function fileUrl(id) {
  return `${API_BASE}/file/${id}`;
}
