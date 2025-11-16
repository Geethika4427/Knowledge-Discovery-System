
import React, { useState } from "react";
import { searchDocuments, deleteDocument, fileUrl } from "../services/api";

export default function SearchPane({ onPreview, onReload }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("keyword");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const per = 10;
  const [loading, setLoading] = useState(false);

  async function doSearch(p = 1) {
    setLoading(true);
    try {
      const res = await searchDocuments({ q: query, page: p, per, mode });
      setResults(res.results || []);
      setTotal(res.total || 0);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this document?")) return;
    await deleteDocument(id);
    onReload && onReload();
    setResults((r) => r.filter((x) => x._id !== id));
  }

  return (
    <div>
      <div className="search-row" style={{ marginBottom: 12 }}>
        <input
          className="input"
          placeholder="Search documents (keyword or semantic)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="input" style={{ width: 140 }}>
          <option value="keyword">Keyword</option>
          <option value="semantic">Semantic</option>
        </select>
        <button className="btn" onClick={() => doSearch(1)} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      <div>
        {results.length === 0 && !loading && <div className="muted">No results.</div>}

        <ul className="list" style={{ marginTop: 8 }}>
          {results.map((r) => (
            <li className="list-item" key={r._id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div className="list-item-title">{r.title}</div>
                  <div className="snippet" dangerouslySetInnerHTML={{ __html: formatSnippet(r.snippet || r.bodyText || "") }} />
                  <div style={{ marginTop: 8 }}>
                    {(r.tags || []).slice(0, 6).map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                </div>

                <div style={{ width: 120, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <button className="btn-small" onClick={() => onPreview(r)}>Preview</button>
                  <a className="btn-small" href={fileUrl(r._id)} target="_blank" rel="noreferrer">Open</a>
                  <button className="btn-small red" onClick={() => handleDelete(r._id)}>Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {total > per && (
          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="muted">Showing {(page-1)*per + 1} - {Math.min(page*per, total)} of {total}</div>
            <div>
              <button className="btn-small" disabled={page === 1} onClick={() => doSearch(page - 1)}>Prev</button>
              <button className="btn-small" style={{ marginLeft: 6 }} disabled={page*per >= total} onClick={() => doSearch(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function escapeHtml(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatSnippet(s) {
  const esc = escapeHtml(s);
  return esc.replace(/\*\*(.*?)\*\*/g, "<mark>$1</mark>").replace(/\n/g, "<br/>");
}
