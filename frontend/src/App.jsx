// import React, { useState, useEffect } from "react";
// import Sidebar from "./components/Sidebar";
// import SearchPane from "./components/SearchPane";
// import UploadPane from "./components/UploadPane";
// import PreviewModal from "./components/PreviewModal";
// import { fetchRecent, fetchCategories } from "./services/api";

// export default function App() {
//   const [recentDocs, setRecentDocs] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [previewFile, setPreviewFile] = useState(null);

//   useEffect(() => {
//     loadData();
//   }, []);

//   const loadData = async () => {
//     const r = await fetchRecent();
//     const c = await fetchCategories();
//     setRecentDocs(r || []);
//     setCategories(c || []);
//   };

//   return (
//     <div className="container">
//       <Sidebar recentDocs={recentDocs} categories={categories} />

//       <div className="main-area">
//         <h1>Knowledge Search</h1>

//         <UploadPane onUploaded={loadData} />

//         <SearchPane onPreview={setPreviewFile} />

//         {previewFile && (
//           <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
//         )}
//       </div>
//     </div>
//   );
// }


import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import SearchPane from "./components/SearchPane";
import UploadPane from "./components/UploadPane";
import PreviewModal from "./components/PreviewModal";
import { fetchRecent, fetchCategories } from "./services/api";

export default function App() {
  const [recentDocs, setRecentDocs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [dark, setDark] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("kd_dark")) ?? false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", dark);
    localStorage.setItem("kd_dark", JSON.stringify(dark));
  }, [dark]);

  async function loadData() {
    try {
      const r = await fetchRecent();
      const c = await fetchCategories();
      setRecentDocs(r || []);
      setCategories(c || []);
    } catch (e) {
      console.error("loadData", e);
    }
  }

  return (
    <div className="layout">
      <Sidebar
        recent={recentDocs}
        categories={categories}
        onPreview={(d) => setPreviewDoc(d)}
      />

      <div className="main-area">
        <div className="topbar">
          <div className="top-left">
            <h1 className="title">Knowledge Search</h1>
            <div className="subtitle">Marketing Knowledge Hub</div>
          </div>

          <div className="top-right">
            <label className="dark-toggle">
              <input
                type="checkbox"
                checked={dark}
                onChange={(e) => setDark(e.target.checked)}
              />
              <span className="toggle-slider" />
              <span className="toggle-label">Dark Mode</span>
            </label>
          </div>
        </div>

        <div className="content-grid">
          <div className="card">
            <h2>Upload Document</h2>
            <UploadPane onUploaded={loadData} />
          </div>

          <div className="card">
            <h2>Search</h2>
            <SearchPane onPreview={(d) => setPreviewDoc(d)} onReload={loadData} />
          </div>
        </div>
      </div>

      {previewDoc && (
        <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}
