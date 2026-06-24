import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { Heart, Info, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import './PatientPortal.css';

export default function PatientLogin({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNo, setPhoneNo] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Camera State Management
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCameraTrack();
    };
  }, []);

  const stopCameraTrack = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const clearForm = () => {
    setLoginEmail('');
    setLoginPassword('');
    setFullName('');
    setEmail('');
    setPassword('');
    setPhoneNo('');
    setAge('');
    setBloodGroup('');
    setCity('');
    setPinCode('');
    setError('');
    setMessage('');
    setCapturedImage(null);
    stopCameraTrack();
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setCapturedImage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 300, height: 300, facingMode: "user" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setError("Could not open camera. Please check your browser permission settings.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      
      setCapturedImage(dataUrl);
      stopCameraTrack();
      setIsCameraActive(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Please fill in all credentials.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const data = await api.login(loginEmail, loginPassword, 'patient');
      if (data.success) {
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError('Name, email, and password are required.');
      return;
    }
    
    if (!capturedImage) {
      setError('Please turn on the camera and take a photo to complete registration.');
      return;
    }

    if (!bloodGroup) {
      setError('Please select your Blood Group.');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      const fullPhoneNumber = phoneNo ? `${countryCode} ${phoneNo}` : null;
      const signupData = {
        full_name: fullName,
        email,
        password,
        avatar: capturedImage // base64 string transmitted directly to Flask backend
      };
      
      if (fullPhoneNumber) signupData.phone_no = fullPhoneNumber;
      if (age) signupData.age = parseInt(age);
      if (bloodGroup) signupData.blood_group = bloodGroup;
      if (city) signupData.city = city;
      if (pinCode) signupData.pin_code = pinCode;

      const data = await api.patientSignup(signupData);
      if (data.success) {
        setMessage('Registration successful! Please log in.');
        setIsRegister(false);
        clearForm();
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="patient-portal-phone-layout-wrapper">
      <div className={`patient-portal-phone-layout-content ${isRegister ? 'register-mode' : 'login-mode'}`}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '50%', color: '#06b6d4', marginBottom: '12px' }}>
            <Heart size={32} fill="rgba(6, 182, 212, 0.2)" />
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: 700 }}>
            {isRegister ? 'Patient Onboarding' : 'Patient Care Portal'}
          </h2>
          <p className="login-sub">
            {isRegister ? 'Register a personal digital wallet profile to access line slots.' : 'Sign in to access your consultations queue'}
          </p>
        </div>

        {/* Status Toast notifications */}
        {error && (
          <div className="alert-toast alert-toast-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="alert-toast alert-toast-success">
            <CheckCircle size={18} />
            <span>{message}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="light-tab-nav" style={{ position: 'relative' }}>
          <div 
            style={{
              position: 'absolute',
              top: '4px',
              bottom: '4px',
              left: isRegister ? '50%' : '4px',
              width: 'calc(50% - 8px)',
              background: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
              transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 1
            }}
          />
          <button 
            className={`light-tab-btn ${!isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(false); clearForm(); }}
            style={{ zIndex: 2, position: 'relative', background: 'transparent', boxShadow: 'none' }}
          >
            Login
          </button>
          <button 
            className={`light-tab-btn ${isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(true); clearForm(); }}
            style={{ zIndex: 2, position: 'relative', background: 'transparent', boxShadow: 'none' }}
          >
            Register
          </button>
        </div>

        {/* Sliding Forms Container */}
        <div className="portal-form-slider-container">
          <div className="portal-form-slider-track" style={{ transform: isRegister ? 'translateX(-50%)' : 'translateX(0%)' }}>
            
            {/* Login Slide */}
            <div className="portal-form-slide" style={{ 
              height: isRegister ? '0' : 'auto', 
              overflow: isRegister ? 'hidden' : 'visible', 
              visibility: isRegister ? 'hidden' : 'visible',
              opacity: isRegister ? 0 : 1,
              transition: 'opacity 0.3s ease'
            }}>
              <form onSubmit={handleLogin} key="login" className="animate-form-fade">
                <div className="form-field floating-group">
                  <input 
                    type="email" 
                    placeholder=" " 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                  <label>Email Address</label>
                </div>

                <div className="form-field floating-group" style={{ marginBottom: '24px' }}>
                  <input 
                    type="password" 
                    placeholder=" " 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <label>Password</label>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Authenticating...' : 'Access Dashboard'}
                </button>
              </form>
            </div>

            {/* Register Slide */}
            <div className="portal-form-slide" style={{ 
              height: !isRegister ? '0' : 'auto', 
              overflow: !isRegister ? 'hidden' : 'visible', 
              visibility: !isRegister ? 'hidden' : 'visible',
              opacity: !isRegister ? 0 : 1,
              transition: 'opacity 0.3s ease'
            }}>
              <div className="register-view-container" style={{ display: 'block', padding: 0, minHeight: 'auto', background: 'transparent' }}>
                <form onSubmit={handleRegister} key="register" className="animate-form-fade">
                  <div style={{ marginBottom: '20px' }}>
                    
                    {/* Interactive Dynamic Hardware Camera Box */}
                    <div className="avatar-section">
                      <div className="avatar-preview-box" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isCameraActive ? (
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                          />
                        ) : capturedImage ? (
                          <img 
                            src={capturedImage} 
                            alt="Captured patient profile preview" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                          />
                        ) : (
                          <div className="avatar-placeholder-text">
                            <Camera size={36} style={{ color: '#64748b', opacity: 0.7, marginBottom: '4px' }} />
                          </div>
                        )}
                      </div>
                      
                      {isCameraActive ? (
                        <button type="button" onClick={capturePhoto} className="btn-camera-trigger" style={{ backgroundColor: '#0ea5e9', color: '#ffffff', borderColor: '#0284c7', borderRadius: '50px', padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Camera size={16} /> Take Photo
                        </button>
                      ) : (
                        <button type="button" onClick={startCamera} className="btn-camera-trigger" style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1', borderRadius: '50px', padding: '10px 20px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Camera size={16} /> {capturedImage ? "Retake Photo" : "Open Camera"}
                        </button>
                      )}
                    </div>

                    {/* Input Fields */}
                    <div className="form-field floating-group">
                      <input 
                        type="text" 
                        placeholder=" " 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        required
                      />
                      <label>Full Name *</label>
                    </div>

                    <div className="form-field floating-group">
                      <input 
                        type="email" 
                        placeholder=" " 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required
                      />
                      <label>Email Address *</label>
                    </div>

                    <div className="form-field floating-group">
                      <input 
                        type="password" 
                        placeholder=" " 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required
                      />
                      <label>Password *</label>
                    </div>

                    <div className="input-row" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                      <div className="form-field floating-group age-field-box" style={{ flex: '0 0 80px', width: '80px', minWidth: '80px' }}>
                        <input 
                          type="number" 
                          placeholder=" " 
                          value={age} 
                          onChange={(e) => setAge(e.target.value)} 
                          required
                          style={{ textAlign: 'center', padding: '14px 8px' }}
                        />
                        <label style={{ left: '50%', transform: 'translate(-50%, -50%)', width: '100%', textAlign: 'center' }}>Age</label>
                      </div>

                      <div className="phone-input-row-container" style={{ flex: 1, display: 'flex', height: '50px', marginBottom: '20px' }}>
                        <div className="country-code-prefix-box">
                          <select 
                            value={countryCode} 
                            onChange={(e) => setCountryCode(e.target.value)}
                          >
                            <option value="+91">IN +91</option>
                            <option value="+1">US +1</option>
                            <option value="+44">GB +44</option>
                            <option value="+62">ID +62</option>
                          </select>
                          <span className="mini-arrow">▼</span>
                        </div>

                        <div className="phone-main-number-box" style={{ flex: 1 }}>
                          <input 
                            type="tel" 
                            placeholder="Mobile number (10 digits)" 
                            value={phoneNo} 
                            onChange={(e) => setPhoneNo(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="input-row" style={{ display: 'flex', gap: '12px' }}>
                      <div className="form-field floating-group" style={{ flex: 1 }}>
                        <input 
                          type="text" 
                          placeholder=" " 
                          value={city} 
                          onChange={(e) => setCity(e.target.value)} 
                          required
                        />
                        <label>City</label>
                      </div>

                      <div className="form-field floating-group" style={{ flex: 1 }}>
                        <input 
                          type="text" 
                          placeholder=" " 
                          value={pinCode} 
                          onChange={(e) => setPinCode(e.target.value)} 
                          required
                        />
                        <label>Pin Code (6 digits)</label>
                      </div>
                    </div>

                    {/* Custom Blood Group Dropdown */}
                    <div className="form-field custom-dropdown-container">
                      <div 
                        className={`custom-dropdown-trigger ${bloodGroup ? 'has-value' : ''}`}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      >
                        {bloodGroup ? `Blood Group: ${bloodGroup}` : 'Select Blood Group *'}
                        <span className="dropdown-arrow-icon">▼</span>
                      </div>

                      {isDropdownOpen && (
                        <ul className="custom-dropdown-menu">
                          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                            <li 
                              key={type}
                              className={`custom-dropdown-option ${bloodGroup === type ? 'active' : ''}`}
                              onClick={() => {
                                setBloodGroup(type);
                                setIsDropdownOpen(false);
                              }}
                            >
                              {type === "A+" && "A Positive (A+)"}
                              {type === "A-" && "A Negative (A-)"}
                              {type === "B+" && "B Positive (B+)"}
                              {type === "B-" && "B Negative (B-)"}
                              {type === "AB+" && "AB Positive (AB+)"}
                              {type === "AB-" && "AB Negative (AB-)"}
                              {type === "O+" && "O Positive (O+)"}
                              {type === "O-" && "O Negative (O-)"}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                  </div>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Creating Profile...' : 'Complete Registration'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
