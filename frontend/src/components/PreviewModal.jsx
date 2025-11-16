
import React from "react";
import { fileUrl } from "../services/api";

export default function PreviewModal({ doc, onClose }) {
  const url = fileUrl(doc._id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>{doc.title}</h3>
            <div className="muted" style={{ fontSize: 13 }}>{doc.originalName || ""}</div>
          </div>
          <div>
            <button className="btn-small" onClick={onClose}>Close</button>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {doc.mimetype === "application/pdf" ? (
            <iframe src={url} title="preview" style={{ width: "100%", height: "100%", border: "none", borderRadius: 10 }} />
          ) : (
            <pre style={{ whiteSpace: "pre-wrap", padding: 12, background: "#fafafa", borderRadius: 8 }}>{doc.bodyText}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

