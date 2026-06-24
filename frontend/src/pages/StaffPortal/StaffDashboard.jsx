import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  LogOut, Shield, User, Users, Clipboard, CheckCircle, 
  RefreshCw, X, AlertCircle, Calendar, UserPlus, Play
} from 'lucide-react';
import '../PatientPortal/PatientPortal.css';

export default function StaffDashboard({ onLogout }) {
  const [staffUser, setStaffUser] = useState(null);
  const [staffRole, setStaffRole] = useState(''); // 'doctor' | 'admin'
  const [activeMode, setActiveMode] = useState('doctor'); // 'doctor' | 'admin'
  
  // States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // ADMIN Mode States
  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [doctorDept, setDoctorDept] = useState('');
  const [doctorRoom, setDoctorRoom] = useState('');
  const [doctorSessions, setDoctorSessions] = useState(20);
  const [systemAppointments, setSystemAppointments] = useState([]);
  const [adminTab, setAdminTab] = useState('onboard'); // 'onboard' | 'appointments'

  // DOCTOR Mode States
  const [doctorStatus, setDoctorStatus] = useState('OUT'); // 'IN' | 'OUT'
  const [activeQueue, setActiveQueue] = useState([]);
  const [queueSnapshot, setQueueSnapshot] = useState(null);
  const [doctorTab, setDoctorTab] = useState('queue'); // 'queue' | 'schedule'
  
  // Custom Dialog
  const [customDialog, setCustomDialog] = useState({
    show: false,
    type: 'confirm',
    title: '',
    message: '',
    inputValue: '',
    placeholder: '',
    onConfirm: null,
    onCancel: null
  });
  
  // Doctor Schedule Form
  const [schedDate, setSchedDate] = useState('');
  const [schedAvailable, setSchedAvailable] = useState(true);
  const [schedMaxSessions, setSchedMaxSessions] = useState(20);

  // Complete Session & Prescription Modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [currentAppt, setCurrentAppt] = useState(null);
  const [consultReason, setConsultReason] = useState('');
  const [rxDiagnosis, setRxDiagnosis] = useState('');
  const [rxMedicines, setRxMedicines] = useState('');
  const [rxInstructions, setRxInstructions] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('staff_user');
    const roleStr = localStorage.getItem('staff_user_role');
    if (userStr && roleStr) {
      const user = JSON.parse(userStr);
      setStaffUser(user);
      setStaffRole(roleStr);
      
      // Default dashboard mode
      if (roleStr === 'admin') {
        setActiveMode('admin');
        fetchAdminAppointments();
      } else {
        setActiveMode('doctor');
        setDoctorStatus(user.status || 'OUT');
        fetchDoctorQueue(user.id);
      }
    }
  }, []);

  const handleModeChange = (mode) => {
    setActiveMode(mode);
    setError('');
    setSuccess('');
    if (mode === 'admin') {
      fetchAdminAppointments();
    } else if (mode === 'doctor' && staffUser) {
      fetchDoctorQueue(staffUser.id);
    }
  };

  // ================= ADMIN OPERATIONS =================

  const handleOnboardDoctor = async (e) => {
    e.preventDefault();
    if (!doctorEmail || !doctorName || !doctorPassword) {
      setError('Name, email, and password are required.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const docData = {
        email: doctorEmail,
        name: doctorName,
        password: doctorPassword,
        specialty: doctorSpecialty || 'General',
        department: doctorDept || 'General Medicine',
        room_number: doctorRoom || 'Room 101',
        status: 'OUT',
        no_of_sessions: parseInt(doctorSessions) || 20
      };
      
      const res = await api.addDoctor(docData);
      if (res.success || !res.error) {
        setSuccess('Doctor onboarded successfully!');
        // Clear Form
        setDoctorEmail('');
        setDoctorName('');
        setDoctorPassword('');
        setDoctorSpecialty('');
        setDoctorDept('');
        setDoctorRoom('');
        setDoctorSessions(20);
      }
    } catch (err) {
      setError(err.message || 'Failed to add doctor profile.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminAppointments = async () => {
    try {
      const res = await api.viewAllAppointments();
      if (res.success) {
        setSystemAppointments(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ================= DOCTOR OPERATIONS =================

  const fetchDoctorQueue = async (docId) => {
    if (!docId) return;
    try {
      const activeRes = await api.getActiveQueue(docId);
      if (activeRes.success) {
        setActiveQueue(activeRes.data.queue);
      }
      
      const snapshotRes = await api.getQueueSnapshot(docId);
      if (snapshotRes.success) {
        setQueueSnapshot(snapshotRes.data.queue);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAttendance = async () => {
    if (!staffUser) return;
    const newStatus = doctorStatus === 'IN' ? 'OUT' : 'IN';
    setError('');
    setSuccess('');
    try {
      const res = await api.toggleAttendance(staffUser.id, newStatus);
      if (res.success) {
        setDoctorStatus(newStatus);
        
        const updatedUser = { ...staffUser, status: newStatus };
        setStaffUser(updatedUser);
        localStorage.setItem('staff_user', JSON.stringify(updatedUser));
        
        setSuccess(`Attendance status updated to ${newStatus} successfully.`);
        fetchDoctorQueue(staffUser.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to update attendance status.');
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!staffUser || !schedDate) {
      setError('Date is required.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const schedData = {
        doctor_id: staffUser.id,
        date: schedDate,
        is_available: schedAvailable,
        max_sessions: parseInt(schedMaxSessions)
      };

      const res = await api.configureSchedule(schedData);
      if (res.success || !res.error) {
        setSuccess('Calendar schedule configured successfully!');
        setSchedDate('');
        setSchedAvailable(true);
        setSchedMaxSessions(20);
      }
    } catch (err) {
      setError(err.message || 'Failed to configure doctor calendar.');
    } finally {
      setLoading(false);
    }
  };

  const handleCallout = async (apptId) => {
    setError('');
    setSuccess('');
    try {
      const res = await api.calloutPatient(apptId);
      if (res.success) {
        setSuccess('Patient called out successfully.');
        fetchDoctorQueue(staffUser.id);
      }
    } catch (err) {
      setError(err.message || 'Callout action failed.');
    }
  };

  const handleSkip = (apptId) => {
    setCustomDialog({
      show: true,
      type: 'confirm',
      title: 'Skip Patient',
      message: 'Mark this patient as skipped/no-show?',
      onConfirm: async () => {
        setError('');
        setSuccess('');
        try {
          const res = await api.skipPatient(apptId);
          if (res.success) {
            setSuccess('Patient marked as skipped.');
            fetchDoctorQueue(staffUser.id);
          }
        } catch (err) {
          setError(err.message || 'Skip action failed.');
        }
      }
    });
  };

  const openCompleteModal = (appt) => {
    setCurrentAppt(appt);
    setConsultReason('Routine Consultation');
    setRxDiagnosis('');
    setRxMedicines('');
    setRxInstructions('');
    setError('');
    setSuccess('');
    setShowCompleteModal(true);
  };

  const handleCompleteAndPrescribe = async (e) => {
    e.preventDefault();
    if (!currentAppt) return;
    if (!rxDiagnosis || !rxMedicines) {
      setError('Diagnosis and medicines dosage details are required.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const compRes = await api.completeSession(currentAppt.appointment_id, consultReason);
      if (compRes.success) {
        const visitId = compRes.data?.visit_id;
        if (!visitId) {
          throw new Error('Associated visit record ID could not be resolved.');
        }

        const rxData = {
          visit_id: visitId,
          diagnosis: rxDiagnosis,
          medicines_dosage: rxMedicines,
          instructions: rxInstructions || ''
        };
        const rxRes = await api.writePrescription(rxData);
        if (rxRes.success) {
          setSuccess(`Session completed and prescription RX-${rxRes.data.prescription_id} written successfully!`);
          setShowCompleteModal(false);
          fetchDoctorQueue(staffUser.id);
        }
      }
    } catch (err) {
      setError(err.message || 'Session completion & prescription writing workflow failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = () => {
    api.logout('staff');
    onLogout();
  };

  return (
    <div className="patient-dashboard-light-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header style={{ 
        background: '#164e63', 
        padding: '16px 30px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(22, 78, 99, 0.12)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', padding: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}>
            <Shield size={20} fill="#fff" />
          </div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', fontFamily: 'sans-serif' }}>
            🏥 STAFF<span style={{ color: '#06b6d4' }}>CONSOLE</span>
          </span>
        </div>
        
        {staffUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            
            {/* Mode Switcher Toggle for Admins */}
            {staffRole === 'admin' && (
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '4px' }}>
                <button 
                  className="btn" 
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '0.8rem', 
                    background: activeMode === 'admin' ? '#06b6d4' : 'transparent', 
                    color: '#fff', 
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                  onClick={() => handleModeChange('admin')}
                >
                  Admin Mode
                </button>
                <button 
                  className="btn" 
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '0.8rem', 
                    background: activeMode === 'doctor' ? '#06b6d4' : 'transparent', 
                    color: '#fff', 
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                  onClick={() => handleModeChange('doctor')}
                >
                  Doctor Mode
                </button>
              </div>
            )}

            {/* Profile display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.1)', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff' 
              }}>
                <User size={18} />
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {staffUser.full_name || staffUser.username}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#ecfeff', margin: 0, opacity: 0.8 }}>
                  Role: {staffRole.toUpperCase()}
                </p>
              </div>
            </div>
            
            <button className="btn" style={{ padding: '8px 12px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={handleLogoutClick}>
              <LogOut size={16} />
              <span style={{ marginLeft: '6px' }}>Logout</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Grid Content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: activeMode === 'admin' ? '260px 1fr' : '1fr', gap: '30px', padding: '30px', maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* ================= ADMIN WORKSPACE SIDEBAR ================= */}
        {activeMode === 'admin' && (
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              className="light-tab-btn" 
              style={{ 
                justifyContent: 'flex-start', 
                display: 'flex', 
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                textAlign: 'left',
                width: '100%',
                background: adminTab === 'onboard' ? '#06b6d4' : 'transparent',
                color: adminTab === 'onboard' ? '#ffffff' : '#64748b',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600
              }}
              onClick={() => { setAdminTab('onboard'); setError(''); setSuccess(''); }}
            >
              <UserPlus size={18} />
              <span>Onboard Doctor</span>
            </button>

            <button 
              className="light-tab-btn" 
              style={{ 
                justifyContent: 'flex-start', 
                display: 'flex', 
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                textAlign: 'left',
                width: '100%',
                background: adminTab === 'appointments' ? '#06b6d4' : 'transparent',
                color: adminTab === 'appointments' ? '#ffffff' : '#64748b',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600
              }}
              onClick={() => { setAdminTab('appointments'); fetchAdminAppointments(); setError(''); setSuccess(''); }}
            >
              <Clipboard size={18} />
              <span>All Appointments</span>
            </button>
          </aside>
        )}

        {/* ================= PRIMARY WORKSPACE ================= */}
        <main style={{ minWidth: 0 }}>
          
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

          {/* ================= ADMIN VIEW CONTENT ================= */}
          {activeMode === 'admin' && (
            <div className="booking-wizard-card" style={{ boxShadow: 'none' }}>
              {adminTab === 'onboard' && (
                <div>
                  <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 700 }}>
                    <UserPlus size={22} style={{ color: '#06b6d4' }} />
                    <span>Onboard Medical Practitioner Profile</span>
                  </h2>

                  <form onSubmit={handleOnboardDoctor} style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-field floating-group">
                      <input 
                        type="text" 
                        placeholder=" "
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        required
                      />
                      <label>Practitioner Name *</label>
                    </div>

                    <div className="form-field floating-group">
                      <input 
                        type="email" 
                        placeholder=" "
                        value={doctorEmail}
                        onChange={(e) => setDoctorEmail(e.target.value)}
                        required
                      />
                      <label>Professional Email *</label>
                    </div>

                    <div className="form-field floating-group">
                      <input 
                        type="password" 
                        placeholder=" "
                        value={doctorPassword}
                        onChange={(e) => setDoctorPassword(e.target.value)}
                        required
                      />
                      <label>Temporary Password *</label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-field floating-group">
                        <input 
                          type="text" 
                          placeholder=" "
                          value={doctorSpecialty}
                          onChange={(e) => setDoctorSpecialty(e.target.value)}
                        />
                        <label>Medical Specialty</label>
                      </div>

                      <div className="form-field dynamic-dropdown-group">
                        <select 
                          className="custom-portal-select-input" 
                          value={doctorDept} 
                          onChange={(e) => setDoctorDept(e.target.value)}
                          required
                        >
                          <option value="General Medicine">General Medicine</option>
                          <option value="Cardiology">Cardiology</option>
                          <option value="Psychiatry">Psychiatry</option>
                          <option value="Diagnostics">Diagnostics</option>
                          <option value="Pediatrics">Pediatrics</option>
                        </select>
                        <label className="floating-select-label">Department Option</label>
                        <div className="select-arrow-indicator">▼</div>
                      </div>

                      <div className="form-field floating-group">
                        <input 
                          type="text" 
                          placeholder=" "
                          value={doctorRoom}
                          onChange={(e) => setDoctorRoom(e.target.value)}
                        />
                        <label>Room Number</label>
                      </div>

                      <div className="form-field floating-group">
                        <input 
                          type="number" 
                          placeholder=" "
                          value={doctorSessions}
                          onChange={(e) => setDoctorSessions(e.target.value)}
                        />
                        <label>Daily Max Capacity</label>
                      </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: '10px' }} disabled={loading}>
                      {loading ? 'Creating Doctor Profile...' : 'Save & Onboard Practitioner'}
                    </button>
                  </form>
                </div>
              )}

              {adminTab === 'appointments' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.4rem', color: '#0f172a', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 700 }}>
                      <Clipboard size={22} style={{ color: '#06b6d4' }} />
                      <span>Global Appointments System Ledger</span>
                    </h2>
                    <button className="btn" style={{ padding: '8px 12px', fontSize: '0.85rem', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b', cursor: 'pointer' }} onClick={fetchAdminAppointments}>
                      <RefreshCw size={14} />
                      <span style={{ marginLeft: '6px' }}>Refresh</span>
                    </button>
                  </div>

                  {systemAppointments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <p style={{ color: '#64748b', margin: 0 }}>No global appointments scheduled in the ledger database yet.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                            <th style={{ padding: '12px' }}>Appt ID</th>
                            <th style={{ padding: '12px' }}>Date</th>
                            <th style={{ padding: '12px' }}>Patient</th>
                            <th style={{ padding: '12px' }}>Doctor Name</th>
                            <th style={{ padding: '12px' }}>Department</th>
                            <th style={{ padding: '12px' }}>Queue Pos</th>
                            <th style={{ padding: '12px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {systemAppointments.map(appt => (
                            <tr key={appt.appointment_id} style={{ borderBottom: '1px solid #e2e8f0', color: '#0f172a' }}>
                              <td style={{ padding: '12px', fontWeight: 600 }}>AP-{appt.appointment_id}</td>
                              <td style={{ padding: '12px' }}>{appt.appointment_date}</td>
                              <td style={{ padding: '12px' }}>{appt.patient_name} (PA-{appt.patient_id})</td>
                              <td style={{ padding: '12px' }}>{appt.doctor_name}</td>
                              <td style={{ padding: '12px' }}>{appt.department}</td>
                              <td style={{ padding: '12px', fontWeight: 600 }}>#{appt.queue_position}</td>
                              <td style={{ padding: '12px' }}>
                                <span className={`badge badge-${appt.status}`} style={{
                                  fontSize: '0.75rem',
                                  padding: '4px 8px',
                                  borderRadius: '50px',
                                  background: appt.status === 'done' ? '#E6F4EA' : appt.status === 'called' ? '#E8F0FE' : '#FEF3C7',
                                  color: appt.status === 'done' ? '#137333' : appt.status === 'called' ? '#1a73e8' : '#b45309'
                                }}>{appt.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= DOCTOR VIEW CONTENT ================= */}
          {activeMode === 'doctor' && staffUser && (
            <div className="booking-wizard-card" style={{ boxShadow: 'none' }}>
              {/* Doctor Control Banner */}
              <div style={{ 
                background: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: '20px', 
                marginBottom: '24px', 
                padding: '20px',
                borderRadius: '8px'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>{staffUser.full_name}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>Specialty: {staffUser.specialty} | Room: {staffUser.room_number}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Attendance Status:</span>
                    <button 
                      className="btn" 
                      style={{ 
                        padding: '8px 16px', 
                        fontSize: '0.85rem',
                        background: doctorStatus === 'IN' ? '#E6F4EA' : '#f1f5f9',
                        color: doctorStatus === 'IN' ? '#137333' : '#64748b',
                        border: `1px solid ${doctorStatus === 'IN' ? '#a3e635' : '#cbd5e1'}`,
                        cursor: 'pointer',
                        fontWeight: 600,
                        borderRadius: '6px'
                      }}
                      onClick={handleToggleAttendance}
                    >
                      {doctorStatus === 'IN' ? '🟢 Checked IN' : '🔴 Checked OUT'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Subtab Selection */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '16px', marginBottom: '24px' }}>
                <button 
                  className="btn"
                  style={{ 
                    borderRadius: '0', 
                    padding: '8px 4px', 
                    background: 'transparent', 
                    border: 'none',
                    color: doctorTab === 'queue' ? '#06b6d4' : '#64748b',
                    borderBottom: doctorTab === 'queue' ? '2px solid #06b6d4' : 'none',
                    fontWeight: doctorTab === 'queue' ? 700 : 500,
                    cursor: 'pointer'
                  }}
                  onClick={() => { setDoctorTab('queue'); fetchDoctorQueue(staffUser.id); }}
                >
                  Live Queue Workspace
                </button>
                <button 
                  className="btn"
                  style={{ 
                    borderRadius: '0', 
                    padding: '8px 4px', 
                    background: 'transparent', 
                    border: 'none',
                    color: doctorTab === 'schedule' ? '#06b6d4' : '#64748b',
                    borderBottom: doctorTab === 'schedule' ? '2px solid #06b6d4' : 'none',
                    fontWeight: doctorTab === 'schedule' ? 700 : 500,
                    cursor: 'pointer'
                  }}
                  onClick={() => { setDoctorTab('schedule'); setError(''); setSuccess(''); }}
                >
                  Configure Availability Calendar
                </button>
              </div>

              {/* Doctor TAB 1: Live Queue Workspace */}
              {doctorTab === 'queue' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>Attending Consultations Queue</h3>
                    <button className="btn" style={{ padding: '8px 12px', fontSize: '0.85rem', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => fetchDoctorQueue(staffUser.id)}>
                      <RefreshCw size={14} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {activeQueue.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                      <Users size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                      <p style={{ color: '#64748b', margin: 0 }}>You have no active pending or called patients in your queue list today.</p>
                      {doctorStatus === 'OUT' && (
                        <p style={{ fontSize: '0.8rem', color: '#b45309', marginTop: '8px', fontWeight: 600 }}>⚠️ Remember to check IN to receive patients!</p>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {activeQueue.map((appt, idx) => (
                        <div 
                          key={appt.appointment_id} 
                          style={{ 
                            padding: '20px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            flexWrap: 'wrap', 
                            gap: '16px',
                            background: appt.status === 'called' ? '#ecfeff' : '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            borderLeft: `4px solid ${appt.status === 'called' ? '#06b6d4' : '#6366f1'}`
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                              <span className={`badge badge-${appt.status}`} style={{
                                fontSize: '0.7rem',
                                padding: '3px 6px',
                                borderRadius: '50px',
                                background: appt.status === 'called' ? '#CCFBF1' : '#E8F0FE',
                                color: appt.status === 'called' ? '#0F766E' : '#1a73e8'
                              }}>{appt.status}</span>
                              <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>Ticket #{appt.queue_position}</span>
                              {idx === 0 && (
                                <span className="badge" style={{ background: '#E6F4EA', color: '#137333', fontSize: '0.7rem', padding: '3px 6px', borderRadius: '50px' }}>Next in line</span>
                              )}
                            </div>
                            <h4 style={{ color: '#0f172a', fontSize: '1.1rem', margin: '4px 0 0 0', fontWeight: 700 }}>{appt.patient_name}</h4>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>Patient ID: PA-{appt.patient_id} | Date: {appt.appointment_date}</p>
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            {appt.status === 'pending' && (
                              <button 
                                className="btn" 
                                style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#06b6d4', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }} 
                                onClick={() => handleCallout(appt.appointment_id)}
                                disabled={doctorStatus === 'OUT'}
                                title={doctorStatus === 'OUT' ? 'Must check IN first' : ''}
                              >
                                <Play size={14} />
                                <span>Call Out</span>
                              </button>
                            )}

                            {appt.status === 'called' && (
                              <button 
                                className="btn" 
                                style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }} 
                                onClick={() => openCompleteModal(appt)}
                              >
                                <CheckCircle size={14} />
                                <span>Complete</span>
                              </button>
                            )}

                            <button 
                              className="btn" 
                              style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#fff', border: '1px solid #fca5a5', color: '#f43f5e', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }} 
                              onClick={() => handleSkip(appt.appointment_id)}
                            >
                              <X size={14} />
                              <span>Skip</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary Breakdown Snapshot cards */}
                  {queueSnapshot && (
                    <div style={{ marginTop: '30px' }}>
                      <h4 style={{ color: '#0f172a', fontSize: '1rem', marginBottom: '12px', fontWeight: 700 }}>Today's General Queue Summary</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                        {Object.entries(queueSnapshot).map(([status, items]) => (
                          <div key={status} style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{status}</p>
                            <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginTop: '4px', margin: 0 }}>{items.length}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Doctor TAB 2: Availability Calendar Configure */}
              {doctorTab === 'schedule' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '20px', fontWeight: 700 }}>Configure Booking Calendar Allocation</h3>

                  <form onSubmit={handleCreateSchedule} style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-field floating-group">
                      <input 
                        type="date" 
                        value={schedDate} 
                        onChange={(e) => setSchedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        style={{ height: '42px', padding: '10px 14px' }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: '#64748b', fontWeight: 600 }}>Availability Mode</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="checkbox" 
                          checked={schedAvailable} 
                          onChange={(e) => setSchedAvailable(e.target.checked)}
                          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: '#334155' }}>Doctor is open for bookings on this day</span>
                      </div>
                    </div>

                    <div className="form-field floating-group">
                      <input 
                        type="number" 
                        value={schedMaxSessions} 
                        onChange={(e) => setSchedMaxSessions(e.target.value)}
                        min="1"
                        required
                      />
                      <label>Maximum Daily Capacity</label>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Configuring availability calendar...' : 'Confirm Availability Configuration'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ================= MODAL: Complete Consultation & Prescription ================= */}
      {showCompleteModal && currentAppt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 100, padding: '40px 20px', overflowY: 'auto' }}>
          <div className="booking-wizard-card animate-fade-in" style={{ width: '100%', maxWidth: '600px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>Rx: Finish Session & Issue Digital Prescription</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', margin: 0 }}>Completing Consultation for: <strong>{currentAppt.patient_name}</strong> (Ticket #{currentAppt.queue_position})</p>
              </div>
              <button 
                className="btn" 
                style={{ padding: '6px', borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowCompleteModal(false)}
              >
                <X size={18} style={{ color: '#64748b' }} />
              </button>
            </div>

            <form onSubmit={handleCompleteAndPrescribe} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-field floating-group">
                <input 
                  type="text" 
                  value={consultReason} 
                  onChange={(e) => setConsultReason(e.target.value)}
                  placeholder=" "
                  required
                />
                <label>Consultation Reason / Treatment Objective</label>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#64748b', fontWeight: 600 }}>Diagnosis / Summary *</label>
                <textarea 
                  className="form-textarea" 
                  rows="3"
                  value={rxDiagnosis} 
                  onChange={(e) => setRxDiagnosis(e.target.value)}
                  placeholder="Describe your medical diagnostic summary here..."
                  style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontSize: '0.95rem' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#64748b', fontWeight: 600 }}>Prescribed Medicines & Dosages *</label>
                <textarea 
                  className="form-textarea" 
                  rows="3"
                  value={rxMedicines} 
                  onChange={(e) => setRxMedicines(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg - 1 Tab twice daily after food"
                  style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontSize: '0.95rem' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#64748b', fontWeight: 600 }}>Doctor Instructions / Recovery Advice (Optional)</label>
                <textarea 
                  className="form-textarea" 
                  rows="2"
                  value={rxInstructions} 
                  onChange={(e) => setRxInstructions(e.target.value)}
                  placeholder="Add additional advice, dietary changes, etc..."
                  style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontSize: '0.95rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ padding: '10px 20px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setShowCompleteModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn"
                  style={{ padding: '10px 20px', borderRadius: '8px', background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  disabled={loading}
                >
                  {loading ? 'Logging & writing Rx...' : 'Submit Rx & Conclude Session'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Custom Dialog Modal */}
      {customDialog.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="booking-wizard-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '450px',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            textAlign: 'left'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              color: '#0f172a',
              fontWeight: 700,
              margin: '0 0 12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {customDialog.title || 'Notification'}
            </h3>
            
            <p style={{
              fontSize: '0.95rem',
              color: '#475569',
              lineHeight: '1.5',
              margin: '0 0 20px 0'
            }}>
              {customDialog.message}
            </p>

            {customDialog.type === 'prompt' && (
              <input 
                type="text"
                value={customDialog.inputValue}
                onChange={(e) => setCustomDialog(prev => ({ ...prev, inputValue: e.target.value }))}
                placeholder={customDialog.placeholder}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  background: '#ffffff',
                  marginBottom: '20px',
                  boxSizing: 'border-box'
                }}
              />
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              {customDialog.type !== 'alert' && (
                <button
                  type="button"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => {
                    if (customDialog.onCancel) customDialog.onCancel();
                    setCustomDialog(prev => ({ ...prev, show: false }));
                  }}
                >
                  Cancel
                </button>
              )}
              
              <button
                type="button"
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: '#164e63',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'opacity 0.2s'
                }}
                onClick={() => {
                  if (customDialog.onConfirm) {
                    if (customDialog.type === 'prompt') {
                      customDialog.onConfirm(customDialog.inputValue);
                    } else {
                      customDialog.onConfirm();
                    }
                  }
                  setCustomDialog(prev => ({ ...prev, show: false }));
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
