import React, { useRef, useState } from "react";
import { uploadDocument } from "../services/api";

export default function UploadPane({ onUploaded }) {
  const fileRef = useRef();
  const titleRef = useRef();
  const [loading, setLoading] = useState(false);

  async function handleUpload(e) {
    e && e.preventDefault();
    const file = fileRef.current.files[0];
    const title = titleRef.current.value;

    if (!file) return alert("Please choose a file to upload.");

    const fd = new FormData();
    fd.append("file", file);
    if (title) fd.append("title", title);

    setLoading(true);
    try {
      const j = await uploadDocument(fd);
      if (j && j.success) {
        alert("Upload successful");
        fileRef.current.value = null;
        if (onUploaded) onUploaded();
      } else {
        alert("Upload failed");
        console.error(j);
      }
    } catch (err) {
      console.error(err);
      alert("Upload error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleUpload}>
      <div style={{ marginBottom: 10 }}>
        <input ref={titleRef} className="input" placeholder="Document title (optional)" />
      </div>

      <div className="upload-dropzone" onClick={() => fileRef.current.click()}>
        <div className="upload-inner">
          <div>Drag & drop a file here or click to choose</div>
          <button type="button" className="btn" style={{ marginTop: 12 }}>
            Choose File
          </button>
        </div>
        <input ref={fileRef} type="file" style={{ display: "none" }} />
      </div>

      <div style={{ marginTop: 14 }}>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </form>
  );
}
