import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ShieldAlert, Fingerprint } from 'lucide-react';
import CitizenDashboard from './pages/CitizenDashboard';
import AgentDashboard from './pages/AgentDashboard';

function Header() {
  const location = useLocation();
  
  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShieldAlert className="upload-icon" />
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', letterSpacing: '1px' }}>
          SENTINEL<span style={{ color: 'var(--primary)' }}>.AI</span>
        </h1>
      </div>
      
      <nav className="nav-links">
        <Link 
          to="/" 
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          Citizen Portal
        </Link>
        <Link 
          to="/agent" 
          className={`nav-link ${location.pathname === '/agent' ? 'active' : ''}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Fingerprint size={18} />
            HITL Review
          </span>
        </Link>
      </nav>
    </header>
  );
}

function App() {
  return (
    <Router>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<CitizenDashboard />} />
          <Route path="/agent" element={<AgentDashboard />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
