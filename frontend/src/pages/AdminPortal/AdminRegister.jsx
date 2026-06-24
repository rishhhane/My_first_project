import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Shield, Info, AlertCircle, CheckCircle } from 'lucide-react';
import '../PatientPortal/PatientPortal.css';

export default function AdminRegister() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName || !username || !email || !password) {
      setError('Please fill in all mandatory fields.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const signupData = {
        name: fullName,
        username,
        email,
        password,
        role: 'admin'
      };

      const data = await api.adminSignup(signupData);
      if (data.success) {
        setMessage('Registration successful! Redirecting to login page...');
        setTimeout(() => {
          navigate('/admin/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Email or Username might already be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div className="login-card" style={{ width: '100%', maxWidth: '440px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '50%', color: '#06b6d4', marginBottom: '12px' }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 700 }}>Admin Registration</h2>
          <p className="login-sub">
            Create a clinic administrator profile to control database records.
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

        <form onSubmit={handleRegister}>
          <div className="form-field floating-group">
            <input 
              type="text" 
              placeholder=" " 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <label>Full Name</label>
          </div>

          <div className="form-field floating-group">
            <input 
              type="text" 
              placeholder=" " 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label>Username</label>
          </div>

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
            <label>Secure Password</label>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ background: '#0f172a' }}>
            {loading ? 'Submitting Registration...' : 'Complete Admin SignUp'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: '#64748b' }}>
          Already have an account? <Link to="/admin/login" style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}>Log In Here</Link>
        </div>
      </div>
    </div>
  );
}
