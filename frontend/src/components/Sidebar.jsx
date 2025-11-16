import React from "react";

function IconDocs() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 2v6h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCategory() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 7h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M3 12h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M3 17h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

export default function Sidebar({ recent = [], categories = [], onPreview }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          <div className="brand-logo">K</div>
          <div className="brand-title">Knowledge</div>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-item">
          <IconDocs />
          <span>Dashboard</span>
        </div>
      </div>

      <div className="sidebar-block">
        <h4>Recent Documents</h4>
        <ul className="list">
          {recent.map((r) => (
            <li key={r._id} className="list-row" onClick={() => onPreview(r)}>
              <div className="row-title">{r.title}</div>
              <div className="row-meta">{r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString() : ""}</div>
            </li>
          ))}
          {recent.length === 0 && <div className="muted">No recent documents</div>}
        </ul>
      </div>

      <div className="sidebar-block">
        <h4><IconCategory /> Categories</h4>
        <ul className="list">
          {categories.map((c) => (
            <li key={c._id} className="list-row">
              <div className="row-title">{c._id}</div>
              <div className="row-meta">({c.count})</div>
            </li>
          ))}
          {categories.length === 0 && <div className="muted">No categories</div>}
        </ul>
      </div>

      <div style={{ flex: 1 }} />

      <div className="sidebar-footer muted">© {new Date().getFullYear()} Knowledge</div>
    </aside>
  );
}

