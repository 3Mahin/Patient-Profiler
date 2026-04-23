import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, Loader2 } from 'lucide-react';

export default function EditHistoryModal({ isOpen, onClose, onSave, patientId, category, action, initialData, apiBase, setGlobalLoadingMessage }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setDate(initialData.date || 'Date not available');
      } else {
        setName('');
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onClose();
    setGlobalLoadingMessage(action === 'add' ? `Adding ${name}...` : `Updating ${name}...`);
    try {
      await axios.post(`${apiBase}/history/${patientId}/update`, {
        category,
        action,
        old_item: initialData || null,
        new_item: { name, date: date || 'Date not available' }
      });
      onSave(); // Refresh data
    } catch (error) {
      console.error("Error saving history item:", error);
      alert("Failed to save history item.");
    } finally {
      setGlobalLoadingMessage('');
    }
  };

  const title = action === 'add' ? `Add ${category.slice(0, -1)}` : `Edit ${category.slice(0, -1)}`;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 style={{ textTransform: 'capitalize' }}>{title}</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label htmlFor="edit-name" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Name</label>
            <input 
              type="text" 
              id="edit-name"
              name="edit-name"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              placeholder={`Enter ${category.slice(0, -1)} name`}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-date" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Date</label>
            <input 
              type="text" 
              id="edit-date"
              name="edit-date"
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              placeholder="YYYY-MM-DD or 'Date not available'"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!name.trim()}>
              <Save size={20} />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
