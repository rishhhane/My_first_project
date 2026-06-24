import React, { useState, useEffect } from 'react';
import { api, getMediaUrl } from '../../services/api';
import { 
  LogOut, User, Calendar, Clock, Activity, FileText, CheckCircle, 
  RefreshCw, Upload, MapPin, Phone, Heart, AlertCircle, RefreshCcw, Eye, Shield
} from 'lucide-react';
import ConsultationOverview from './ConsultationOverview';
import './PatientPortal.css';

export default function PatientDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [patientUser, setPatientUser] = useState(null);
  
  // States for Booking
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [capacityInfo, setCapacityInfo] = useState(null);
  
  // Slot allocation preview state (for ConsultationOverview)
  const [pendingAppointment, setPendingAppointment] = useState(null);

  // Appointments list
  const [myAppointments, setMyAppointments] = useState([]);
  const [activeAppointment, setActiveAppointment] = useState(null); // The pending/called appointment today
  const [queueTracker, setQueueTracker] = useState(null);
  
  // Prescriptions list
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedVisitDetails, setSelectedVisitDetails] = useState(null);
  
  // Profile Editor Fields
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAge, setProfileAge] = useState('');
  const [profileBloodGroup, setProfileBloodGroup] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profilePinCode, setProfilePinCode] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Status handlers
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Custom Web App Dialog state
  const [customDialog, setCustomDialog] = useState({
    show: false,
    type: 'confirm',
    title: '',
    message: '',
    defaultValue: '',
    onConfirm: null,
    onCancel: null
  });

  useEffect(() => {
    // Load patient profile from localStorage
    const userStr = localStorage.getItem('patient_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setPatientUser(user);
      initProfileFields(user);
      fetchInitialData(user);
    }
  }, []);

  useEffect(() => {
    if (!activeAppointment) return;
    const interval = setInterval(() => {
      fetchAppointments(patientUser?.id);
    }, 10000); // Auto-poll every 10 seconds
    return () => clearInterval(interval);
  }, [activeAppointment, patientUser]);

  const fetchDepartments = async () => {
    try {
      const res = await api.getDepartments();
      if (res.success) {
        setDepartments(res.data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchInitialData = (user) => {
    const targetUser = user || patientUser;
    fetchDoctors();
    fetchDepartments();
    fetchAppointments(targetUser?.id);
  };

  const initProfileFields = (user) => {
    setProfileName(user.full_name || '');
    setProfilePhone(user.phone_no || '');
    setProfileAge(user.age || '');
    setProfileBloodGroup(user.blood_group || '');
    setProfileCity(user.city || '');
    setProfilePinCode(user.pin_code || '');
    setProfilePhoto(user.photo_url || '');
  };

  const fetchDoctors = async (dept = '') => {
    try {
      const res = await api.getDoctors(dept);
      if (res.success) {
        setDoctors(res.data);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  const fetchAppointments = async (userId) => {
    try {
      const res = await api.getMyAppointments();
      if (res.success) {
        setMyAppointments(res.data);
        
        // Find the most relevant active appointment (pending or called)
        const active = res.data.find(a => a.status === 'pending' || a.status === 'called');
        if (active) {
          setActiveAppointment(active);
          fetchQueueDetails(active.appointment_id);
        } else {
          const id = userId || patientUser?.id;
          if (id) {
            fetchPrescriptions(id);
          }
          setActiveAppointment(null);
          setQueueTracker(null);
        }
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
  };

  const fetchQueueDetails = async (apptId) => {
    if (!apptId) return;
    try {
      const res = await api.getQueuePosition(apptId);
      if (res.success) {
        setQueueTracker(res.data);
      }
    } catch (err) {
      console.error('Queue tracking error:', err);
    }
  };

  const fetchPrescriptions = async (userId) => {
    const id = userId || (patientUser ? patientUser.id : null);
    if (!id) return;
    try {
      const res = await api.getPatientPrescriptions(id);
      if (res.success) {
        setPrescriptions(res.data);
      }
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
    }
  };

  const handleDeptChange = (e) => {
    const dept = e.target.value;
    setSelectedDept(dept);
    setSelectedDoctor(null);
    setCapacityInfo(null);
    fetchDoctors(dept);
  };

  const handleDoctorChange = (e) => {
    const docId = parseInt(e.target.value);
    const doc = doctors.find(d => d.id === docId);
    setSelectedDoctor(doc);
    setCapacityInfo(null);
  };

  const checkSlotCapacity = async () => {
    if (!selectedDoctor || !bookingDate) {
      setError('Please select a doctor and date first.');
      return;
    }
    setError('');
    try {
      const res = await api.getQueueCapacity(selectedDoctor.id, bookingDate);
      if (res.success) {
        setCapacityInfo(res.data);
      }
    } catch (err) {
      setError(err.message || 'Could not fetch scheduling capacity.');
    }
  };

  // Triggers ConsultationOverview preview overlay
  const handleRequestOverview = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !bookingDate) {
      setError('Doctor and Date are required.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.getQueueCapacity(selectedDoctor.id, bookingDate);
      if (res.success) {
        if (res.data.is_full || res.data.available <= 0) {
          setError('Doctor has no available slots for the selected date.');
          return;
        }
        
        // Pre-populate data structure for preview screen
        setPendingAppointment({
          doctor_id: selectedDoctor.id,
          doctor_name: selectedDoctor.full_name,
          department: selectedDept,
          date: bookingDate,
          room_number: selectedDoctor.room_number
        });
      }
    } catch (err) {
      setError(err.message || 'Doctor has no active scheduling capacity allocated for this date.');
    } finally {
      setLoading(false);
    }
  };

  // Called when slot is confirmed on the ConsultationOverview page
  const handleConfirmAppointment = async () => {
    if (!pendingAppointment) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.bookAppointment(pendingAppointment.doctor_id, pendingAppointment.date);
      if (res.success) {
        setSuccess('Appointment booked successfully!');
        
        // Clear wizard fields
        setSelectedDept('');
        setSelectedDoctor(null);
        setBookingDate('');
        setCapacityInfo(null);
        setPendingAppointment(null);
        
        // Refresh queue ledger
        fetchAppointments();
        setActiveTab('home'); // Route back to main home page
      }
    } catch (err) {
      setError(err.message || 'Failed to book appointment.');
      setPendingAppointment(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (apptId) => {
    setCustomDialog({
      show: true,
      type: 'confirm',
      title: 'Cancel Appointment',
      message: 'Are you sure you want to cancel this appointment?',
      onConfirm: async () => {
        setError('');
        setSuccess('');
        try {
          const res = await api.cancelAppointment(apptId);
          if (res.success) {
            setSuccess('Appointment cancelled successfully.');
            fetchAppointments();
          }
        } catch (err) {
          setError(err.message || 'Cancellation failed.');
        }
      }
    });
  };

  const handleUploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setError('');
    setSuccess('');
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.uploadAvatar(formData);
      if (res.success) {
        setProfilePhoto(res.photo_url);
        
        const updatedUser = { ...patientUser, photo_url: res.photo_url };
        setPatientUser(updatedUser);
        localStorage.setItem('patient_user', JSON.stringify(updatedUser));
        setSuccess('Avatar photo uploaded successfully!');
      }
    } catch (err) {
      setError(err.message || 'Avatar upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!profileName) {
      setError('Full name is required.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const updateData = {
        full_name: profileName,
        phone_no: profilePhone || null,
        age: profileAge ? parseInt(profileAge) : null,
        blood_group: profileBloodGroup || null,
        city: profileCity || null,
        pin_code: profilePinCode || null
      };

      const res = await api.updatePatientProfile(patientUser.id, updateData);
      if (res.success) {
        setSuccess('Profile updated successfully!');
        setPatientUser(res.patient);
        localStorage.setItem('patient_user', JSON.stringify(res.patient));
        initProfileFields(res.patient);
      }
    } catch (err) {
      setError(err.message || 'Profile update failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = () => {
    api.logout('patient');
    onLogout();
  };

  const handleConnectSupport = () => {
    setCustomDialog({
      show: true,
      type: 'alert',
      title: 'Customer Support',
      message: 'For assistance or inquiries, please contact our hospital support team at: 048225717'
    });
  };

  if (pendingAppointment) {
    return (
      <div className="patient-portal-phone-layout-wrapper">
        <div className="patient-portal-phone-layout-content">
          <header style={{ 
            background: '#164e63', 
            padding: '16px 20px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem' }}>🏥</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'sans-serif' }}>
                Patient Portal
              </span>
            </div>
          </header>
          <ConsultationOverview 
            appointment={pendingAppointment}
            onConfirm={handleConfirmAppointment}
            onCancel={() => setPendingAppointment(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="patient-dashboard-wrapper">
      <div className="patient-dashboard-container">
        
        {/* Top Navbar */}
        <header className="patient-dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🏥</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'sans-serif' }}>
              Patient Portal
            </span>
          </div>

          {/* Desktop Navigation Tabs */}
          {patientUser && (
            <div className="patient-desktop-nav-tabs">
              <button 
                className={activeTab === 'home' ? 'active' : ''} 
                onClick={() => { setActiveTab('home'); fetchAppointments(); setError(''); setSuccess(''); }}
              >
                Home
              </button>
              <button 
                className={activeTab === 'prescriptions' ? 'active' : ''} 
                onClick={() => { setActiveTab('prescriptions'); fetchPrescriptions(); setError(''); setSuccess(''); }}
              >
                Prescriptions
              </button>
              <button 
                className={activeTab === 'profile' ? 'active' : ''} 
                onClick={() => { setActiveTab('profile'); setError(''); setSuccess(''); }}
              >
                Profile
              </button>
            </div>
          )}
          
          {patientUser && (
            <button className="btn-logout-header" onClick={handleLogoutClick} title="Logout">
              <LogOut size={18} />
              <span className="logout-text">Logout</span>
            </button>
          )}
        </header>

        {/* Content Area */}
        <main className="dashboard-view-container">
          
          {error && (
            <div className="alert-toast alert-toast-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert-toast alert-toast-success">
              <CheckCircle size={18} />
              <span>{success}</span>
            </div>
          )}

          {activeAppointment && activeAppointment.status === 'called' && (() => {
            const activeDoc = doctors.find(d => d.id === activeAppointment.doctor_id);
            const roomText = activeDoc ? activeDoc.room_number : null;
            return (
              <div className="live-callout-glow-banner">
                <span className="live-callout-icon">📢</span>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>It is your turn!</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', opacity: 0.95 }}>
                    Please proceed to <strong>{activeAppointment.doctor_name}</strong>'s chamber {roomText ? <strong>(at {roomText})</strong> : ''} now.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* TAB: Visit Details */}
          {activeTab === 'visit_details' && selectedVisitDetails && (
            <div className="booking-wizard-card" style={{ padding: '24px', position: 'relative', minHeight: '400px' }}>
              <button 
                className="btn" 
                style={{ 
                  position: 'absolute', 
                  top: '20px', 
                  left: '20px', 
                  background: '#f1f5f9', 
                  border: '1px solid #cbd5e1', 
                  color: '#1e293b', 
                  padding: '6px 12px', 
                  borderRadius: '6px', 
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }} 
                onClick={() => { setActiveTab('home'); setSelectedVisitDetails(null); }}
              >
                ← Back
              </button>
              <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>Consultation Details</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Appointment: AP-{selectedVisitDetails.appointment_id}</p>
              </div>

              {/* Visit Details Section */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', marginBottom: '16px', textAlign: 'left' }}>
                <h3 style={{ fontSize: '0.95rem', color: '#164e63', fontWeight: 700, margin: '0 0 12px 0', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }}>Visit Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Practitioner</span>
                    <strong>{selectedVisitDetails.doctor_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Department</span>
                    <strong>{selectedVisitDetails.department}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Consultation Date</span>
                    <strong>{selectedVisitDetails.appointment_date}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Status</span>
                    <span className={`badge badge-${selectedVisitDetails.status}`} style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: '50px',
                      background: selectedVisitDetails.status === 'done' ? '#E6F4EA' : '#FCE8E6',
                      color: selectedVisitDetails.status === 'done' ? '#137333' : '#C5221F'
                    }}>{selectedVisitDetails.status}</span>
                  </div>
                </div>
              </div>

              {/* Prescription Section */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', textAlign: 'left' }}>
                <h3 style={{ fontSize: '0.95rem', color: '#8b5cf6', fontWeight: 700, margin: '0 0 12px 0', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }}>Digital Prescription (Rx)</h3>
                {(() => {
                  const matchingRx = prescriptions.find(rx => rx.visit_id === selectedVisitDetails.visit_id);
                  if (matchingRx) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <span style={{ color: '#7c3aed', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>DIAGNOSIS / SUMMARY</span>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#334155', whiteSpace: 'pre-line' }}>{matchingRx.diagnosis}</p>
                        </div>
                        <div>
                          <span style={{ color: '#06b6d4', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>PRESCRIBED MEDICINES & DOSAGE</span>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#334155', whiteSpace: 'pre-line' }}>{matchingRx.medicines_dosage}</p>
                        </div>
                        {matchingRx.instructions && (
                          <div>
                            <span style={{ color: '#d97706', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>DOCTOR ADVICE / INSTRUCTIONS</span>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', whiteSpace: 'pre-line' }}>{matchingRx.instructions}</p>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: '0.85rem' }}>
                        No prescription was compiled for this consultation session.
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}

          {/* TAB: Home (Dashboard Slot Booking or Active live position tracker + Visit History) */}
          {activeTab === 'home' && (
            <div className="patient-dashboard-home-layout">
              
              <div className="welcome-banner-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px 0', color: '#fff' }}>
                    Hello, {patientUser?.full_name || 'Patient'}!
                  </h2>
                  <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.9, color: '#ecfeff', lineHeight: '1.4' }}>
                    Manage your health records and request real-time clinical consultations below.
                  </p>
                </div>
                
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '50%', 
                  background: 'rgba(255,255,255,0.15)', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  overflow: 'hidden', 
                  border: '2px solid rgba(255,255,255,0.3)',
                  flexShrink: 0
                }}>
                  {profilePhoto ? (
                    <img src={getMediaUrl(profilePhoto)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={28} style={{ color: '#fff' }} />
                  )}
                </div>
              </div>

              <div className="patient-dashboard-home-grid">
                <div className="dashboard-grid-column">
                  {/* Check if there is an active appointment (pending or called) today */}
                  {activeAppointment ? (
                <div className="booking-wizard-card" style={{ padding: '24px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Active Ticket Details</span>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', height: 'auto', display: 'flex', gap: '4px' }} onClick={() => fetchQueueDetails(activeAppointment.appointment_id)}>
                      <RefreshCw size={10} />
                      <span>Refresh Position</span>
                    </button>
                  </div>

                  <span className={`badge badge-${activeAppointment.status}`} style={{ 
                    fontSize: '0.8rem', 
                    padding: '5px 10px', 
                    marginBottom: '12px',
                    borderRadius: '50px',
                    background: activeAppointment.status === 'called' ? '#CCFBF1' : '#FEF3C7',
                    color: activeAppointment.status === 'called' ? '#0F766E' : '#B45309'
                  }}>
                    {activeAppointment.status === 'called' ? '📢 Called (Proceed to Room)' : '🕒 Pending in Queue'}
                  </span>

                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 4px 0', textAlign: 'left' }}>Doctor: <strong>{activeAppointment.doctor_name}</strong> ({activeAppointment.department})</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 12px 0', textAlign: 'left' }}>Date: {activeAppointment.appointment_date}</p>

                  <h1 style={{ fontSize: '3.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', lineHeight: 1 }}>
                    #{activeAppointment.queue_position}
                  </h1>

                  {queueTracker && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0 0 2px 0', textTransform: 'uppercase', fontWeight: 600 }}>Patients Ahead</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#b45309', margin: 0 }}>{queueTracker.patients_ahead}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0 0 2px 0', textTransform: 'uppercase', fontWeight: 600 }}>Live Position</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f766e', margin: 0 }}>{queueTracker.live_position || 'N/A'}</p>
                      </div>
                    </div>
                  )}

                  {activeAppointment.status === 'called' && (
                    <div style={{ padding: '10px', background: '#ecfeff', border: '1px solid #ccfbf1', color: '#0891b2', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 'bold' }}>
                      Please enter Doctor's chamber now!
                    </div>
                  )}

                  <button className="btn" style={{ background: '#f43f5e', color: '#fff', width: '100%', height: '40px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleCancel(activeAppointment.appointment_id)}>
                    Cancel Appointment
                  </button>
                </div>
              ) : (
                /* No active appointment: Show scheduling wizard */
                <form className="booking-wizard-card" onSubmit={handleRequestOverview}>
                  <h3>Schedule an Appointment</h3>
                  <p className="wizard-sub">Select your medical department and practitioner.</p>

                  {/* Department select */}
                  <div className="form-field dynamic-dropdown-group">
                    <select 
                      value={selectedDept} 
                      onChange={handleDeptChange} 
                      className="custom-portal-select-input"
                      required
                    >
                      <option value="" disabled hidden></option>
                      {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                    <label className="floating-select-label">Medical Department</label>
                    <div className="select-arrow-indicator">▼</div>
                  </div>

                  {/* Doctor select */}
                  <div className={`form-field dynamic-dropdown-group ${!selectedDept ? 'field-disabled' : ''}`}>
                    <select 
                      value={selectedDoctor ? selectedDoctor.id : ''} 
                      onChange={handleDoctorChange} 
                      className="custom-portal-select-input" 
                      disabled={!selectedDept} 
                      required
                    >
                      <option value="" disabled hidden></option>
                      {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.full_name} ({doc.department})</option>)}
                    </select>
                    <label className="floating-select-label">
                      {selectedDept ? 'Available Specialist' : 'Select a department first'}
                    </label>
                    <div className="select-arrow-indicator">▼</div>
                  </div>

                  {/* Doctor summary */}
                  {selectedDoctor && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '12px', fontSize: '0.85rem' }}>
                      <p style={{ margin: '0 0 4px 0', textAlign: 'left' }}>Department: <strong>{selectedDoctor.department}</strong></p>
                      <p style={{ margin: '0 0 4px 0', textAlign: 'left' }}>Consultation Room: <strong>{selectedDoctor.room_number}</strong></p>
                      <p style={{ margin: 0, textAlign: 'left' }}>
                        Status: <span style={{ color: selectedDoctor.is_available ? '#0f766e' : '#b91c1c', fontWeight: 600 }}>
                          {selectedDoctor.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Date picker */}
                  <div className="form-field floating-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input 
                        type="date" 
                        value={bookingDate} 
                        onChange={(e) => { setBookingDate(e.target.value); setCapacityInfo(null); }}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        style={{ height: '42px', padding: '10px 14px' }}
                      />
                    </div>
                    <button type="button" className="btn" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px 14px', color: '#1e293b', fontSize: '0.85rem', height: '42px', borderRadius: '8px', cursor: 'pointer' }} onClick={checkSlotCapacity} disabled={!selectedDoctor || !bookingDate}>
                      Check Slots
                    </button>
                  </div>

                  {/* Capacity snapshot info */}
                  {capacityInfo && (
                    <div style={{ 
                      padding: '12px', 
                      background: capacityInfo.is_full ? '#fef2f2' : '#f0fdf4', 
                      borderLeft: `4px solid ${capacityInfo.is_full ? '#f43f5e' : '#10b981'}`,
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      marginBottom: '16px',
                      textAlign: 'left'
                    }}>
                      <h4 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Capacity Check Results</h4>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div>Max: <strong>{capacityInfo.max_sessions}</strong></div>
                        <div>Booked: <strong>{capacityInfo.booked}</strong></div>
                        <div>Available: <strong style={{ color: capacityInfo.available > 0 ? '#10b981' : '#f43f5e' }}>{capacityInfo.available}</strong></div>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn-primary" disabled={!selectedDoctor || (capacityInfo && capacityInfo.is_full)}>
                    Slot Allocation
                  </button>
                </form>
              )}
                </div>

                <div className="dashboard-grid-column">
                  {/* Stacked Visit History (Matches the second image layout) */}
                  <div className="visit-history-section-card" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff' }}>
                <h3>Medical Visit History</h3>
                <div className="history-list-wrapper">
                  {myAppointments.filter(a => a.status === 'done' || a.status === 'skipped' || a.status === 'cancelled').length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748b', fontSize: '0.85rem' }}>
                      No past consultation logs could be resolved.
                    </div>
                  ) : (
                    myAppointments.filter(a => a.status === 'done' || a.status === 'skipped' || a.status === 'cancelled').slice(0, 5).map((visit) => (
                      <div 
                        key={visit.appointment_id} 
                        className="minimal-history-item-block"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedVisitDetails(visit);
                          setActiveTab('visit_details');
                        }}
                      >
                        <div className="minimal-history-row-header" style={{ padding: '12px 16px' }}>
                          <div className="history-meta-cell">
                            <span className="table-txt-bold">AP-{visit.appointment_id}</span>
                            <span className="history-date-sub">{visit.appointment_date}</span>
                          </div>
                          <div className="table-doctor-meta">
                            <strong>{visit.doctor_name}</strong>
                            <span className="table-dept-sub">{visit.department}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={`badge badge-${visit.status}`} style={{ 
                              fontSize: '0.65rem', 
                              padding: '3px 6px', 
                              borderRadius: '50px',
                              background: visit.status === 'done' ? '#E6F4EA' : '#FCE8E6',
                              color: visit.status === 'done' ? '#137333' : '#C5221F'
                            }}>{visit.status}</span>
                            
                            <button 
                              type="button" 
                              className="btn-view-details" 
                              style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* TAB: Prescriptions */}
          {activeTab === 'prescriptions' && (
            <div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', color: '#0f172a', fontWeight: 700 }}>My Prescription History</h2>

              {prescriptions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <FileText size={40} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No digital prescription records could be found for your account.</p>
                </div>
              ) : (
                <div className="prescriptions-list-grid">
                  {prescriptions.map(rx => (
                    <div key={rx.prescription_id} className="booking-wizard-card" style={{ padding: '20px', borderLeft: '4px solid #8b5cf6', boxShadow: 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', paddingBottom: '12px', marginBottom: '12px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', color: '#0f172a' }}>Rx: Medical Prescription</h3>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>ID: RX-{rx.prescription_id} | Visit: VH-{rx.visit_id}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="badge" style={{ background: '#F3E8FF', color: '#7c3aed', borderRadius: '50px', padding: '3px 6px', fontSize: '0.7rem' }}>Issued</span>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Date: {new Date(rx.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>Practitioner</p>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>{rx.doctor_name}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>Patient</p>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>{rx.patient_name} (Age: {rx.patient_age || 'N/A'})</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ fontSize: '0.75rem', color: '#7c3aed', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.02em' }}>Diagnosis</h4>
                          <p style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'pre-line', margin: 0, textAlign: 'left' }}>{rx.diagnosis}</p>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ fontSize: '0.75rem', color: '#06b6d4', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.02em' }}>Medicines & Dosages</h4>
                          <p style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'pre-line', margin: 0, textAlign: 'left' }}>{rx.medicines_dosage}</p>
                        </div>

                        {rx.instructions && (
                          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ fontSize: '0.75rem', color: '#d97706', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.02em' }}>Doctor Advice</h4>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'pre-line', margin: 0, textAlign: 'left' }}>{rx.instructions}</p>
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Demographics Editor */}
          {activeTab === 'profile' && (
            <div className="booking-wizard-card" style={{ boxShadow: 'none', padding: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: '#0f172a', fontWeight: 700 }}>Demographic Information</h2>

              <div className="profile-editor-layout">
                
                {/* Photo Upload Side */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '110px', 
                    height: '110px', 
                    borderRadius: '50%', 
                    background: '#f8fafc', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    overflow: 'hidden', 
                    border: '2px solid #cbd5e1', 
                    position: 'relative' 
                  }}>
                    {profilePhoto ? (
                      <img src={getMediaUrl(profilePhoto)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={40} style={{ color: '#94a3b8' }} />
                    )}
                  </div>
                  
                  <label className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b', cursor: 'pointer', textAlign: 'center', borderRadius: '6px' }}>
                    <Upload size={12} />
                    <span style={{ marginLeft: '4px' }}>{uploading ? 'Uploading...' : 'Choose File'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleUploadAvatar} 
                      style={{ display: 'none' }} 
                      disabled={uploading} 
                    />
                  </label>
                  <p style={{ fontSize: '0.65rem', color: '#94a3b8', textAlign: 'center', margin: 0 }}>JPEG, PNG, WEBP max 5MB</p>
                </div>

                {/* Form fields */}
                <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                  <div className="form-field floating-group">
                    <input 
                      type="text" 
                      placeholder=" "
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                    />
                    <label>Full Name *</label>
                  </div>

                  <div className="form-field floating-group">
                    <input 
                      type="text" 
                      placeholder=" "
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                    />
                    <label>Phone Number</label>
                  </div>

                  <div className="form-field floating-group">
                    <input 
                      type="number" 
                      placeholder=" "
                      value={profileAge}
                      onChange={(e) => setProfileAge(e.target.value)}
                    />
                    <label>Age (Years)</label>
                  </div>

                  <div className="form-field custom-dropdown-container">
                    <div 
                      className={`custom-dropdown-trigger ${profileBloodGroup ? 'has-value' : ''}`}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      style={{ height: '50px' }}
                    >
                      {profileBloodGroup ? `Blood Group: ${profileBloodGroup}` : 'Select Blood Group'}
                      <span className="dropdown-arrow-icon">▼</span>
                    </div>

                    {isDropdownOpen && (
                      <ul className="custom-dropdown-menu">
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                          <li 
                            key={type}
                            className={`custom-dropdown-option ${profileBloodGroup === type ? 'active' : ''}`}
                            onClick={() => {
                              setProfileBloodGroup(type);
                              setIsDropdownOpen(false);
                            }}
                          >
                            {type}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="form-field floating-group">
                    <input 
                      type="text" 
                      placeholder=" "
                      value={profileCity}
                      onChange={(e) => setProfileCity(e.target.value)}
                    />
                    <label>City</label>
                  </div>

                  <div className="form-field floating-group">
                    <input 
                      type="text" 
                      placeholder=" "
                      value={profilePinCode}
                      onChange={(e) => setProfilePinCode(e.target.value)}
                    />
                    <label>Pin Code (6 digits)</label>
                  </div>

                  <button type="submit" className="btn-primary" style={{ marginTop: '10px' }} disabled={loading}>
                    {loading ? 'Saving updates...' : 'Save Updates'}
                  </button>
                </form>

              </div>
            </div>
          )}

        </main>

        {/* Bottom Tab Navigation (Phone Format) */}
        <nav className="patient-portal-bottom-nav">
          <button 
            className={activeTab === 'home' ? 'active' : ''} 
            onClick={() => { setActiveTab('home'); fetchAppointments(); setError(''); setSuccess(''); }}
          >
            <Calendar size={18} />
            <span>Home</span>
          </button>
          <button 
            className={activeTab === 'prescriptions' ? 'active' : ''} 
            onClick={() => { setActiveTab('prescriptions'); fetchPrescriptions(); setError(''); setSuccess(''); }}
          >
            <FileText size={18} />
            <span>Prescriptions</span>
          </button>
          <button 
            className={activeTab === 'profile' ? 'active' : ''} 
            onClick={() => { setActiveTab('profile'); setError(''); setSuccess(''); }}
          >
            <User size={18} />
            <span>Profile</span>
          </button>
        </nav>

        {/* Custom Web App Dialog */}
        {customDialog.show && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
            <div className="booking-wizard-card animate-fade-in" style={{ width: '100%', maxWidth: '350px', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', color: '#0f172a' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>{customDialog.title}</h3>
              <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0 0 16px 0', lineHeight: 1.4 }}>{customDialog.message}</p>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {customDialog.type !== 'alert' && (
                  <button 
                    type="button"
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                    onClick={() => {
                      setCustomDialog({ ...customDialog, show: false });
                      if (customDialog.onCancel) customDialog.onCancel();
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="button"
                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#0f172a', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  onClick={() => {
                    setCustomDialog({ ...customDialog, show: false });
                    if (customDialog.onConfirm) customDialog.onConfirm();
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
