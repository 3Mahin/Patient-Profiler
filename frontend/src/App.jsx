import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Activity, Plus, UploadCloud, User, Camera } from 'lucide-react';
import PatientHistory from './components/PatientHistory';
import ChatInterface from './components/ChatInterface';
import UploadModal from './components/UploadModal';
import PrescriptionModal from './components/PrescriptionModal';
import { FilePlus } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';
const SERVER_BASE = 'http://localhost:8000';

function App() {
  const [patients, setPatients] = useState([]);
  const [activePatient, setActivePatient] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState('');
  const [systemStatus, setSystemStatus] = useState({ status: 'yellow', message: 'Checking...' });
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE}/status`);
        setSystemStatus(res.data);
      } catch (err) {
        setSystemStatus({ status: 'red', message: 'API Offline' });
      }
    };
    checkStatus();
    const statusInterval = setInterval(checkStatus, 10000);
    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (activePatient) {
      // Re-find active patient to get updated image_path
      const updatedPatient = patients.find(p => p.id === activePatient.id);
      if (updatedPatient && updatedPatient.image_path !== activePatient.image_path) {
        setActivePatient(updatedPatient);
      }
      fetchPatientHistory(activePatient.id);
    }
  }, [activePatient?.id, patients]);

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API_BASE}/patients`);
      setPatients(res.data);
      if (res.data.length > 0 && !activePatient) {
        setActivePatient(res.data[0]);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
    }
  };

  const fetchPatientHistory = async (id) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/history/${id}`);
      setHistoryData(res.data);
    } catch (err) {
      console.error("Error fetching history:", err);
      setHistoryData(null);
    } finally {
      setLoading(false);
    }
  };

  const createPatient = async () => {
    const name = prompt("Enter patient name:");
    if (!name) return;
    try {
      await axios.post(`${API_BASE}/patients`, { name });
      fetchPatients();
    } catch (err) {
      console.error("Error creating patient:", err);
    }
  };

  const handleUploadComplete = () => {
    setIsUploadModalOpen(false);
    if (activePatient) fetchPatientHistory(activePatient.id);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activePatient) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await axios.post(`${API_BASE}/patients/${activePatient.id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchPatients(); // Refresh the patients list to get the new image_path
    } catch (err) {
      console.error("Error uploading image:", err);
      alert("Failed to upload image.");
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <Activity size={24} />
          </div>
          <div className="logo-text">Patient Profiler</div>
        </div>

        <div className="sidebar-title">PATIENTS DIRECTORY</div>
        <div className="patient-list">
          {patients.map(p => (
            <div 
              key={p.id} 
              className={`patient-item ${activePatient?.id === p.id ? 'active' : ''}`}
              onClick={() => setActivePatient(p)}
            >
              {p.image_path ? (
                <img src={`${SERVER_BASE}${p.image_path}`} alt={p.name} className="sidebar-avatar" />
              ) : (
                <div className="sidebar-avatar-placeholder"><User size={16} /></div>
              )}
              <div className="patient-item-info">
                <span className="patient-item-name">{p.name}</span>
                <span className="patient-item-id">ID: #{p.id.toString().padStart(4, '0')}</span>
              </div>
            </div>
          ))}
        </div>

        <button className="add-patient-btn" onClick={createPatient}>
          <Plus size={20} />
          New Patient
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activePatient ? (
          <>
            <header className="header">
              <div className="patient-profile-header">
                <div className="profile-image-container" onClick={() => fileInputRef.current?.click()}>
                  {activePatient.image_path ? (
                    <img src={`${SERVER_BASE}${activePatient.image_path}`} alt={activePatient.name} className="profile-image" />
                  ) : (
                    <div className="profile-image-placeholder"><User size={40} /></div>
                  )}
                  <div className="profile-image-overlay">
                    <Camera size={24} />
                  </div>
                  <input 
                    type="file" 
                    id="profile-image-upload"
                    name="profile-image-upload"
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
                <div>
                  <h1 className="page-title">{activePatient.name}</h1>
                  <p className="patient-meta">Patient ID: {activePatient.id.toString().padStart(4, '0')} | Registered: {new Date(activePatient.created_at || Date.now()).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="actions">
                <button 
                  className="btn-secondary" 
                  onClick={() => setIsPrescriptionModalOpen(true)}
                >
                  <FilePlus size={20} />
                  New Prescription
                </button>
                <button 
                  className="btn-primary" 
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <UploadCloud size={20} />
                  Upload Records
                </button>
              </div>
            </header>

            <div className="dashboard-grid">
              <PatientHistory data={historyData} loading={loading} patientId={activePatient.id} apiBase={API_BASE} onRefresh={() => fetchPatientHistory(activePatient.id)} setGlobalLoadingMessage={setGlobalLoadingMessage} />
              <ChatInterface patientId={activePatient.id} apiBase={API_BASE} systemStatus={systemStatus} />
            </div>
          </>
        ) : (
          <div className="empty-state">
            <Activity size={48} opacity={0.5} />
            <h2>No Patients Found</h2>
            <p>Create a new patient to get started.</p>
          </div>
        )}
      </main>

      {isUploadModalOpen && (
        <UploadModal 
          patientId={activePatient?.id}
          apiBase={API_BASE}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
      <PrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        patient={activePatient}
        apiBase={API_BASE}
        onSave={() => fetchPatientHistory(activePatient?.id)}
        setGlobalLoadingMessage={setGlobalLoadingMessage}
      />
      {globalLoadingMessage && (
        <div className="modal-overlay" style={{ zIndex: 9999, flexDirection: 'column', color: 'white', background: 'rgba(15, 23, 42, 0.7)' }}>
          <div className="spin" style={{ marginBottom: '16px' }}><Activity size={48} /></div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{globalLoadingMessage}</h2>
          <p style={{ marginTop: '8px', opacity: 0.8 }}>Please wait while the AI updates the patient records...</p>
        </div>
      )}
    </div>
  );
}

export default App;
