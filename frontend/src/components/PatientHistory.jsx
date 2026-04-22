import { useState } from 'react';
import { FileText, Loader2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

const groupHistoryItems = (items) => {
  if (!items || !items.length) return [];
  
  const groups = {};
  
  items.forEach(item => {
    const rawName = item.name || item;
    const date = item.date || "Date not available";
    
    // Aggressive normalization: take the primary identifier (usually the first word)
    let tokens = rawName.toLowerCase().split(/[\s,(]+/);
    let key = tokens[0] || rawName.toLowerCase();
    
    // If the first word is a generic medical term, use the first two words to avoid bad grouping
    const genericTerms = ['vitamin', 'blood', 'complete', 'chest', 'mri', 'ct', 'x-ray', 'serum', 'urine'];
    if (genericTerms.includes(key) && tokens.length > 1) {
      key = tokens[0] + ' ' + tokens[1];
    }
    
    if (!groups[key]) {
      groups[key] = { latest: { name: rawName, date }, history: [] };
    } else {
      // If we encounter a duplicate, push the current "latest" to history, and set the new one as latest.
      // We assume the DB returns them chronologically (oldest to newest), so the last one processed is the newest.
      
      // Only add to history if the exact name or date is different from the current latest
      if (groups[key].latest.name !== rawName || groups[key].latest.date !== date) {
        groups[key].history.unshift(groups[key].latest); // push old latest to history (unshift so newest history is on top)
        groups[key].latest = { name: rawName, date };
      }
    }
  });
  
  return Object.values(groups);
};

const HistoryItemNode = ({ itemData }) => {
  const [expanded, setExpanded] = useState(false);
  const { latest, history } = itemData;
  const hasHistory = history.length > 0;
  
  return (
    <li style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
      <div 
        onClick={() => hasHistory && setExpanded(!expanded)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', width: '100%', cursor: hasHistory ? 'pointer' : 'default', userSelect: 'none' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {latest.name} 
          {hasHistory && (
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#e0f2fe', color: '#0284c7', borderRadius: '12px', fontWeight: 600 }}>
              {history.length} updates
            </span>
          )}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          <Calendar size={12} /> {latest.date}
          {hasHistory && (expanded ? <ChevronUp size={14} style={{marginLeft: 2}} /> : <ChevronDown size={14} style={{marginLeft: 2}} />)}
        </span>
      </div>
      
      {expanded && hasHistory && (
        <div style={{ marginTop: '4px', paddingLeft: '16px', borderLeft: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {history.map((hist, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.9rem', color: '#64748b' }}>
              <span>{hist.name}</span>
              <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}><Calendar size={12} /> {hist.date}</span>
            </div>
          ))}
        </div>
      )}
    </li>
  );
};

export default function PatientHistory({ data, loading }) {
  
  if (loading) {
    return (
      <div className="glass-panel" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-color)' }} />
        <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading history...</p>
      </div>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="glass-panel">
        <h2 className="panel-title"><FileText size={20} /> Medical History</h2>
        <div className="empty-state">
          <FileText size={48} opacity={0.3} />
          <p>No medical history extracted yet.<br/>Upload records to generate the dataset.</p>
        </div>
      </div>
    );
  }

  const groupedMedications = groupHistoryItems(data.medications);
  const groupedSurgeries = groupHistoryItems(data.surgeries);
  const groupedTests = groupHistoryItems(data.tests);

  return (
    <div className="glass-panel">
      <h2 className="panel-title"><FileText size={20} /> Medical History Dataset</h2>
      
      <div className="history-container">
        
        <div className="history-section" style={{ backgroundColor: '#f0f9ff', padding: '20px', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
          <div className="history-section-title" style={{ borderBottom: 'none', marginBottom: '8px', color: '#0284c7' }}>Patient Summary</div>
          <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: data.summary ? 'inherit' : '#64748b' }}>
            {data.summary || "No summary available for this patient. Please upload a medical record to generate a summary."}
          </p>
        </div>

        <div className="history-section">
          <div className="history-section-title">Medications</div>
          {groupedMedications.length > 0 ? (
            <ul className="history-list">
              {groupedMedications.map((itemData, i) => <HistoryItemNode key={i} itemData={itemData} />)}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No medications found.</p>
          )}
        </div>

        <div className="history-section">
          <div className="history-section-title">Surgeries & Procedures</div>
          {groupedSurgeries.length > 0 ? (
            <ul className="history-list">
              {groupedSurgeries.map((itemData, i) => <HistoryItemNode key={i} itemData={itemData} />)}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No surgeries found.</p>
          )}
        </div>

        <div className="history-section">
          <div className="history-section-title">Tests & Results</div>
          {groupedTests.length > 0 ? (
            <ul className="history-list">
              {groupedTests.map((itemData, i) => <HistoryItemNode key={i} itemData={itemData} />)}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No tests found.</p>
          )}
        </div>

      </div>
    </div>
  );
}
