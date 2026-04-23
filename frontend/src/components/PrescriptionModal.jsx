import { useState } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, Printer, Save, Loader2 } from 'lucide-react';

export default function PrescriptionModal({ isOpen, onClose, patient, apiBase, onSave, setGlobalLoadingMessage }) {
  const [medications, setMedications] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);

  if (!isOpen || !patient) return null;

  const handleAddMed = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handleRemoveMed = (index) => {
    const newMeds = [...medications];
    newMeds.splice(index, 1);
    setMedications(newMeds);
  };

  const handleChange = (index, field, value) => {
    const newMeds = [...medications];
    newMeds[index][field] = value;
    setMedications(newMeds);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    // Filter out empty ones
    const validMeds = medications.filter(m => m.name.trim() !== '');
    if (validMeds.length === 0) {
      alert("Please add at least one medication.");
      return;
    }

    // Format for the backend history
    const formattedMeds = validMeds.map(m => {
      let details = [];
      if (m.dosage) details.push(m.dosage);
      if (m.frequency) details.push(m.frequency);
      if (m.duration) details.push(`for ${m.duration}`);
      
      const fullName = details.length > 0 ? `${m.name} (${details.join(', ')})` : m.name;
      return { name: fullName, date: new Date().toISOString().split('T')[0] };
    });

    onClose();
    setGlobalLoadingMessage('Saving Prescription...');
    try {
      await axios.post(`${apiBase}/patients/${patient.id}/prescription`, {
        medications: formattedMeds
      });
      onSave(); // Refresh data
    } catch (error) {
      console.error("Error saving prescription:", error);
      alert("Failed to save prescription.");
    } finally {
      setGlobalLoadingMessage('');
    }
  };

  return (
    <div className="modal-overlay print-modal">
      <div className="modal-content rx-modal-content">
        
        {/* Screen Header (Hidden on print) */}
        <div className="modal-header no-print">
          <h2>New Prescription</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        {/* Printable Area */}
        <div className="print-area" style={{ padding: '24px' }}>
          
          <div className="rx-header">
            <h1 style={{ fontSize: '24px', color: '#0f172a', marginBottom: '8px' }}>Dr. Smith Clinic</h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>123 Medical Way, Health City, HC 12345</p>
            <div style={{ borderBottom: '2px solid #e2e8f0', margin: '20px 0' }}></div>
          </div>

          <div className="rx-patient-info" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div>
              <strong>Patient:</strong> {patient.name}<br/>
              <strong>Patient ID:</strong> #{patient.id.toString().padStart(4, '0')}
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong>Date:</strong> {new Date().toLocaleDateString()}<br/>
            </div>
          </div>

          <div className="rx-symbol" style={{ fontSize: '48px', fontFamily: 'serif', color: '#0f172a', marginBottom: '16px' }}>
            Rx
          </div>

          <div className="rx-medications">
            {medications.map((med, index) => (
              <div key={index} className="rx-med-row" style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Medication Name (e.g. Amoxicillin 500mg)" 
                    value={med.name} 
                    onChange={(e) => handleChange(index, 'name', e.target.value)}
                    className="rx-input print-text"
                    style={{ fontWeight: 'bold', fontSize: '16px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Dosage" 
                      value={med.dosage} 
                      onChange={(e) => handleChange(index, 'dosage', e.target.value)}
                      className="rx-input print-text"
                      style={{ flex: 1 }}
                    />
                    <input 
                      type="text" 
                      placeholder="Frequency (e.g. 1-0-1)" 
                      value={med.frequency} 
                      onChange={(e) => handleChange(index, 'frequency', e.target.value)}
                      className="rx-input print-text"
                      style={{ flex: 1 }}
                    />
                    <input 
                      type="text" 
                      placeholder="Duration (e.g. 5 days)" 
                      value={med.duration} 
                      onChange={(e) => handleChange(index, 'duration', e.target.value)}
                      className="rx-input print-text"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
                <button className="icon-btn remove-med-btn no-print" onClick={() => handleRemoveMed(index)} style={{ marginTop: '4px', color: '#ef4444' }}>
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            
            <button className="btn-secondary no-print" onClick={handleAddMed} style={{ marginTop: '8px' }}>
              <Plus size={16} /> Add Medication
            </button>
          </div>

          <div className="rx-footer" style={{ marginTop: '64px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Please review your prescription carefully.
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '8px', height: '40px' }}></div>
              Doctor's Signature
            </div>
          </div>
          
        </div>

        {/* Screen Footer (Hidden on print) */}
        <div className="modal-footer no-print" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
          <button className="btn-secondary" onClick={handlePrint}>
            <Printer size={20} /> Print
          </button>
          <button className="btn-primary" onClick={handleSave}>
            <Save size={20} />
            Save to Patient History
          </button>
        </div>

      </div>
    </div>
  );
}
