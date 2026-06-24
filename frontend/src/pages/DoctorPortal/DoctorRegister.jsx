import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Shield, Info, AlertCircle, CheckCircle } from 'lucide-react';
import '../PatientPortal/PatientPortal.css';

export default function DoctorRegister() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.getDepartments();
        if (res.success) {
          setDepartments(res.data);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepts();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password || !department || !roomNumber) {
      setError('Please fill in all mandatory fields.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const signupData = {
        full_name: fullName,
        email,
        password,
        specialty: department,
        department,
        room_number: roomNumber,
        status: 'OUT',
        no_of_sessions: 20
      };

      const data = await api.doctorSignup(signupData);
      if (data.success) {
        setMessage('Registration successful! Redirecting to login page...');
        setTimeout(() => {
          navigate('/doctor/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Email might already be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div className="login-card" style={{ width: '100%', maxWidth: '460px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '50%', color: '#06b6d4', marginBottom: '12px' }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 700 }}>Doctor Registration</h2>
          <p className="login-sub">
            Create an official practitioner account to consult patients.
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
            <label>Full Name (e.g. Dr. Sarah Connor)</label>
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

          <div className="form-field floating-group">
            <input 
              type="password" 
              placeholder=" " 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label>Secure Password</label>
          </div>

          <div className="form-field floating-group">
            <input 
              type="text" 
              placeholder=" " 
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              required
            />
            <label>Room Number (e.g. Room 405)</label>
          </div>

          <div className="form-field dynamic-dropdown-group" style={{ marginBottom: '24px' }}>
            <select 
              value={department} 
              onChange={(e) => setDepartment(e.target.value)} 
              className="custom-portal-select-input"
              required
            >
              <option value="" disabled hidden></option>
              {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
            <label className="floating-select-label">Medical Department</label>
            <div className="select-arrow-indicator" style={{ top: '14px' }}>▼</div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ background: '#06b6d4' }}>
            {loading ? 'Submitting Registration...' : 'Complete Doctor SignUp'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: '#64748b' }}>
          Already have an account? <Link to="/doctor/login" style={{ color: '#06b6d4', fontWeight: 600, textDecoration: 'none' }}>Log In Here</Link>
        </div>
      </div>
    </div>
  );
}
