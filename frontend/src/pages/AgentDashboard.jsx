import React, { useState, useEffect } from 'react';
import { ShieldCheck, XCircle, FileWarning } from 'lucide-react';

export default function AgentDashboard() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  
  const fetchReports = async () => {
    try {
      const res = await fetch('/reports');
      const data = await res.json();
      setReports(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchReports();
    // Poll every 5 seconds for simulation
    const id = setInterval(fetchReports, 5000);
    return () => clearInterval(id);
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    await fetch(`/reports/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    fetchReports();
    if (selectedReport && selectedReport.id === id) {
      setSelectedReport({ ...selectedReport, status: newStatus });
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', gap: '2rem', minHeight: '80vh' }}>
      
      {/* Left List */}
      <div className="glass-panel" style={{ flex: '1', padding: '1.5rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <FileWarning className="upload-icon" size={24} />
          <h2 style={{ fontSize: '1.5rem' }}>Queue ({reports.length})</h2>
        </div>
        
        {reports.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No pending reports.</p>
        ) : (
          <div className="report-list">
            {reports.map(r => (
              <div 
                key={r.id} 
                className="glass-panel report-item" 
                style={{ borderColor: selectedReport?.id === r.id ? 'var(--primary)' : 'var(--border)' }}
                onClick={() => setSelectedReport(r)}
              >
                <div className="report-item-main">
                  <h3>Report #{r.id}</h3>
                  <div className="report-item-meta">
                    <span className={`status-badge status-${r.status.toLowerCase()}`}>{r.status}</span>
                    <span>{r.detected_vehicle && r.detected_vehicle.substring(0, 30)}...</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Right Details */}
      <div className="glass-panel" style={{ flex: '2', padding: '2rem' }}>
        {!selectedReport ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            Select a report from the queue to review
          </div>
        ) : (
          <div className="animate-slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '2rem' }}>Report #{selectedReport.id}</h2>
              <span className={`status-badge status-${selectedReport.status.toLowerCase()}`} style={{ fontSize: '1rem' }}>
                {selectedReport.status}
              </span>
            </div>

            {/* Video Evidence */}
            <div style={{ marginBottom: '2rem', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', background: '#000' }}>
              <video 
                src={`/${selectedReport.video_url}`} 
                controls 
                style={{ width: '100%', maxHeight: '400px', display: 'block' }}
              />
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Vehicle</h4>
                  <p>{selectedReport.detected_vehicle}</p>
                  
                  <h4 style={{ color: 'var(--text-secondary)', marginTop: '1rem',  marginBottom: '0.25rem' }}>License Plate</h4>
                  <p>{selectedReport.license_plate}</p>
                </div>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Location Area</h4>
                  <p>{selectedReport.location_context}</p>
                  
                  <h4 style={{ color: 'var(--text-secondary)', marginTop: '1rem',  marginBottom: '0.25rem' }}>Environment</h4>
                  <p>{selectedReport.environmental_factors}</p>
                </div>
              </div>
              
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border)' }}>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Descriptive Facts</h4>
                <p style={{ lineHeight: '1.6' }}>{selectedReport.action_description}</p>
              </div>
            </div>
            
            <div className="legal-box" style={{ marginTop: '1.5rem', background: 'rgba(234, 179, 8, 0.1)', borderLeftColor: '#facc15' }}>
              <h4 style={{ color: '#facc15', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                AI Legal RAG Analysis (CDMX Law): {selectedReport.violated_article}
              </h4>
              <p style={{ marginBottom: '1rem', fontStyle: 'italic' }}>{selectedReport.legal_text}</p>
              <h5 style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Agent Reasoning:</h5>
              <p>{selectedReport.ai_reasoning}</p>
              <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem', marginBottom: '0.25rem' }}>Penalty:</h5>
              <p>{selectedReport.penalty}</p>
            </div>
            
            {selectedReport.status === 'PENDING' && (
              <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleUpdateStatus(selectedReport.id, 'REJECTED')}
                >
                  <XCircle size={18} /> Reject Report
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleUpdateStatus(selectedReport.id, 'APPROVED')}
                >
                  <ShieldCheck size={18} /> Approve Fine
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
    </div>
  );
}
