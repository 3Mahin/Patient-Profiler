import { useState } from 'react';
import axios from 'axios';
import { UploadCloud, X, Loader2 } from 'lucide-react';

export default function UploadModal({ patientId, apiBase, onClose, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${apiBase}/upload/${patientId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      onUploadComplete(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to upload and process file. Is the backend and LM Studio running?");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="upload-modal">
        <button className="close-modal" onClick={onClose} disabled={isUploading}>
          <X size={24} />
        </button>
        
        <h2 className="panel-title">Upload Medical Record</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          Upload PDFs or images (English or Bengali). Gemma 4 will extract the history.
        </p>

        <div 
          className="upload-zone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <UploadCloud size={48} className="upload-icon" />
          {file ? (
            <p>{file.name}</p>
          ) : (
            <p>Drag & drop a file here, or click to select</p>
          )}
          <input 
            type="file" 
            style={{ display: 'none' }} 
            id="file-upload" 
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg"
          />
          <button 
            className="btn-secondary" 
            style={{ marginTop: 16, margin: '16px auto 0' }}
            onClick={() => document.getElementById('file-upload').click()}
          >
            Select File
          </button>
        </div>

        {error && <p style={{ color: '#ef4444', marginTop: 16 }}>{error}</p>}

        <button 
          className="add-patient-btn" 
          style={{ width: '100%', marginTop: 24 }}
          onClick={handleUpload}
          disabled={!file || isUploading}
        >
          {isUploading ? (
            <><Loader2 size={20} className="spinner" style={{animation: 'spin 1s linear infinite'}} /> Processing...</>
          ) : (
            "Process with Gemma 4"
          )}
        </button>
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
