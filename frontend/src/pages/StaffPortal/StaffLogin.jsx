import React, { useState } from 'react';
import { api } from '../../services/api';
import { Shield, Mail, Lock, Info, Activity } from 'lucide-react';
import '../PatientPortal/PatientPortal.css';

export default function StaffLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, password, 'staff');
      if (data.success) {
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-view-container">
      <form className="login-card" onSubmit={handleLogin}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '50%', color: '#06b6d4', marginBottom: '12px' }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 700 }}>Hospital Staff Console</h2>
          <p className="login-sub">
            Login for Medical Practitioners and Administrators
          </p>
        </div>

        {error && (
          <div className="alert-toast alert-toast-error">
            <Info size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="form-field floating-group">
          <input 
            type="email" 
            placeholder=" " 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label>Staff Email Address</label>
        </div>

        <div className="form-field floating-group" style={{ marginBottom: '24px' }}>
          <input 
            type="password" 
            placeholder=" " 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <label>Secure Password</label>
        </div>

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={loading}
        >
          {loading ? (
            <span>Authenticating...</span>
          ) : (
            <>
              <Activity size={18} />
              <span>Verify & Login</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
