import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle, ShieldAlert, AlertTriangle } from 'lucide-react';

export default function CitizenDashboard() {
  const [realVideos, setRealVideos] = useState([]);
  const [aiVideos, setAiVideos] = useState([]);
  
  useEffect(() => {
    fetch('/videos')
      .then(res => res.json())
      .then(data => {
        setRealVideos(data.real);
        setAiVideos(data.ai);
      })
      .catch(err => console.error("Error fetching videos:", err));
  }, []);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [submitStatus, setSubmitStatus] = useState('idle'); // idle | submitting | success
  
  const LOADING_MESSAGES = [
    "Analyzing video frames...",
    "Isolating vehicle entities...",
    "Extracting license plates...",
    "Mapping environmental context...",
    "Querying CDMX Transit Laws database...",
    "Evaluating potential infractions...",
    "Structuring legal document..."
  ];
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Cycle loading messages when analyzing
  useEffect(() => {
    let interval;
    if (isAnalyzing) {
      setLoadingMsgIdx(0);
      interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500); // Change message every 2.5 seconds
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);
  
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // We pass the filename to the backend (assuming it's in the server dir for the hackathon ADK)
    // and we create a local object URL to securely preview it in the browser UI
    const videoData = {
      id: 'uploaded',
      title: file.name,
      url: file.name,
      objectUrl: URL.createObjectURL(file),
      thumb: null
    };
    
    handleSelectVideo(videoData);
  };
  
  const handleSelectVideo = async (video) => {
    setSelectedVideo(video);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setSubmitStatus('idle');
    
    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: video.url })
      });
      
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error(err);
      // Fallback dummy data if backend fails/timeout
      setAnalysisResult({
        detected_vehicle: "Network Error",
        infraction_detected: true,
        violated_article: "API Error",
        legal_text: "Could not connect to Backend.",
        action_description: "Check logs.",
        penalty: "N/A"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitStatus('submitting');
    try {
      await fetch('/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: selectedVideo.url,
          ...analysisResult
        })
      });
      setSubmitStatus('success');
    } catch (err) {
      console.error(err);
      setSubmitStatus('idle');
    }
  };

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Report a Traffic Violation</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Select a video to upload. Our AI agent will process the footage and search the <b>Mexico City (CDMX) Transit Laws</b> to determine infractions. All results are translated to English.
        </p>
      </div>
      
      {/* Upload / Preview Area */}
      {!selectedVideo ? (
        <div className="upload-zone" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
          <UploadCloud className="upload-icon" />
          <div>
            <h3>Drag & Drop Video</h3>
            <p>or click to browse local files</p>
          </div>
          <input 
            type="file" 
            accept="video/*" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileUpload} 
          />
        </div>
      ) : (
        <div className={`glass-panel ${isAnalyzing ? 'scanning' : ''}`} style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div style={{ flex: '1', position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
              {selectedVideo.objectUrl || selectedVideo.url ? (
                <video 
                  src={selectedVideo.objectUrl || `/${selectedVideo.url}`} 
                  controls
                  autoPlay
                  muted
                  style={{ width: '100%', height: '300px', objectFit: 'cover', display: 'block', backgroundColor: '#000' }} 
                />
              ) : (
                <img 
                  src={selectedVideo.thumb} 
                  alt="Video Preview" 
                  style={{ width: '100%', height: '300px', objectFit: 'cover', display: 'block' }} 
                />
              )}
              <div className="scanner-overlay"></div>
            </div>
            
            <div style={{ flex: '1' }}>
              {isAnalyzing ? (
                <div className="loader-container">
                  <div className="cyber-loader"></div>
                  <h3 key={loadingMsgIdx} className="animate-fade-in" style={{ marginTop: '1.5rem', color: 'var(--primary)', transition: 'opacity 0.5s ease' }}>
                    {LOADING_MESSAGES[loadingMsgIdx]}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginTop: '0.5rem' }}>
                    Sentinel AI / Google ADK Multimodal Engine
                  </p>
                </div>
              ) : analysisResult ? (
                <div className="animate-slide-up">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    {analysisResult.infraction_detected ? (
                      <AlertTriangle color="var(--danger)" />
                    ) : (
                      <CheckCircle color="var(--primary)" />
                    )}
                    <h3 style={{ fontSize: '1.25rem' }}>
                      {analysisResult.infraction_detected ? 'Infraction Detected (CDMX Law)' : 'No Infraction'}
                    </h3>
                  </div>
                  
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                    <p><strong>Vehicle:</strong> {analysisResult.detected_vehicle}</p>
                    <p style={{ marginTop: '0.5rem' }}><strong>Facts:</strong> {analysisResult.action_description}</p>
                  </div>
                  
                  <div className={`legal-box ${!analysisResult.infraction_detected ? 'safe' : ''}`}>
                    <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{analysisResult.violated_article}</p>
                    <p style={{ fontSize: '0.9rem' }}>{analysisResult.legal_text}</p>
                  </div>
                  
                  {submitStatus === 'success' ? (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(74,222,128,0.1)', color: 'var(--primary)', borderRadius: 'var(--radius-md)', textAlign: 'center', fontWeight: 'bold' }}>
                      <CheckCircle size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/>
                      Thank you! Report submitted successfully.
                    </div>
                  ) : (
                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                      <button onClick={handleSubmit} className="btn btn-primary" disabled={submitStatus === 'submitting'}>
                        {submitStatus === 'submitting' ? 'Submitting...' : 'Approve & Submit Report'}
                      </button>
                      <button onClick={() => setSelectedVideo(null)} className="btn btn-secondary">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Grids */}
      <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
        
        {/* Testing Header */}
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>No Video? No Problem!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            You can test the core AI and RAG capabilities of Sentinel AI right now by selecting one of the pre-loaded videos below.
          </p>
        </div>

        {/* Real World Grid */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.4rem' }}>Real World Cases</h3>
            <span style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 8px', borderRadius: '4px' }}>VERIFIED</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', fontStyle: 'italic' }}>
            * Important Disclaimer: The following real-world videos are sourced from public traffic feeds. Sentinel AI's privacy layer ensures that <b>no PII (Personally Identifiable Information)</b> such as faces or non-relevant license plates are permanently stored or analyzed outside the scope of the infraction.
          </p>
          
          <div className="video-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {realVideos.map(vid => (
              <div key={vid.id} className="glass-panel video-card" onClick={() => handleSelectVideo(vid)}>
                <video src={`/${vid.url}`} style={{ width: '100%', height: '160px', objectFit: 'cover' }} muted loop onMouseOver={e=>e.target.play()} onMouseOut={e=>e.target.pause()} />
                <div className="video-card-info">
                  <h3>{vid.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Generated Grid */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.4rem' }}>AI Generated Scenarios</h3>
            <span style={{ fontSize: '0.8rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '4px 8px', borderRadius: '4px' }}>SYNTHETIC</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Synthetic video simulations featuring imaginary license plates. Used for edge-case training and validation of the ADK visual understanding model.
          </p>

          <div className="video-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {aiVideos.map(vid => (
              <div key={vid.id} className="glass-panel video-card" onClick={() => handleSelectVideo(vid)} style={{ borderStyle: 'dashed' }}>
                <video src={`/${vid.url}`} style={{ width: '100%', height: '160px', objectFit: 'cover' }} muted loop onMouseOver={e=>e.target.play()} onMouseOut={e=>e.target.pause()} />
                <div className="video-card-info">
                  <h3>{vid.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
