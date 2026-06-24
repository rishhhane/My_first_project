import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Shield, Info, AlertCircle, CheckCircle, Mail, Lock } from 'lucide-react';
import '../PatientPortal/PatientPortal.css';

export default function DoctorLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const data = await api.login(email, password, 'doctor');
      if (data.success) {
        setMessage('Login successful!');
        onLoginSuccess();
        navigate('/doctor/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div className="login-card" style={{ width: '100%', maxWidth: '420px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '50%', color: '#06b6d4', marginBottom: '12px' }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 700 }}>Doctor Portal</h2>
          <p className="login-sub">
            Log in to manage consultations and see your active patients queue.
          </p>
        </div>

        {error && (
          <div className="alert-toast alert-toast-error" style={{ marginBottom: '16px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="alert-toast alert-toast-success" style={{ marginBottom: '16px' }}>
            <CheckCircle size={18} />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-field floating-group">
            <input 
              type="email" 
              placeholder=" " 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label>Email Address</label>
          </div>

          <div className="form-field floating-group" style={{ marginBottom: '24px' }}>
            <input 
              type="password" 
              placeholder=" " 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label>Password</label>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ background: '#06b6d4' }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: '#64748b' }}>
          New to the hospital? <Link to="/doctor/register" style={{ color: '#06b6d4', fontWeight: 600, textDecoration: 'none' }}>Register as a Doctor</Link>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.875rem' }}>
          <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>← Return to Home Screen</Link>
        </div>
      </div>
    </div>
  );
}
