import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getMediaUrl } from '../../services/api';
import { 
  LogOut, Shield, User, Users, Clipboard, CheckCircle, 
  RefreshCw, X, AlertCircle, Calendar, Play, ChevronLeft, ChevronRight
} from 'lucide-react';
import '../PatientPortal/PatientPortal.css';

const getDaysInMonth = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(Date.UTC(year, month, d)));
  }
  return days;
};

export default function DoctorDashboard({ onLogout }) {
  const [doctorUser, setDoctorUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Doctor States
  const [doctorStatus, setDoctorStatus] = useState('OUT'); // 'IN' | 'OUT'
  const [activeQueue, setActiveQueue] = useState([]);
  const [queueSnapshot, setQueueSnapshot] = useState(null);
  const [doctorTab, setDoctorTab] = useState('queue'); // 'queue' | 'schedule'
  const [queueDate, setQueueDate] = useState(new Date().toISOString().split('T')[0]);

  // Patient details modal states
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatientInfo, setSelectedPatientInfo] = useState(null);
  const [patientHistoryList, setPatientHistoryList] = useState([]);
  
  // Doctor Schedule Form
  const [schedDate, setSchedDate] = useState('');
  const [schedAvailable, setSchedAvailable] = useState(true);
  const [schedMaxSessions, setSchedMaxSessions] = useState(20);

  // Calendar states
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [allocatedDates, setAllocatedDates] = useState([]);

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

  // Complete Session & Prescription Modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [currentAppt, setCurrentAppt] = useState(null);
  const [consultReason, setConsultReason] = useState('');
  const [rxDiagnosis, setRxDiagnosis] = useState('');
  const [rxMedicines, setRxMedicines] = useState('');
  const [rxInstructions, setRxInstructions] = useState('');

  const navigate = useNavigate();

  const fetchDoctorSchedules = async (docId) => {
    try {
      const res = await api.getDoctorSchedules(docId);
      if (res.success) {
        // Map dates out
        setAllocatedDates(res.data.map(s => s.date));
      }
    } catch (err) {
      console.error('Failed to load doctor availability calendar dates:', err);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('doctor_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setDoctorUser(user);
      setDoctorStatus(user.status || 'OUT');
      fetchDoctorQueue(user.id, new Date().toISOString().split('T')[0]);
      fetchDoctorSchedules(user.id);
    } else {
      navigate('/doctor/login');
    }
  }, []);

  const fetchDoctorQueue = async (docId, dateVal) => {
    if (!docId) return;
    const targetDate = dateVal !== undefined ? dateVal : queueDate;
    try {
      const activeRes = await api.getActiveQueue(docId, targetDate);
      if (activeRes.success) {
        setActiveQueue(activeRes.data.queue);
      }
      
      const snapshotRes = await api.getQueueSnapshot(docId, targetDate);
      if (snapshotRes.success) {
        setQueueSnapshot(snapshotRes.data.queue);
      }
    } catch (err) {
      console.error('Queue fetching error:', err);
    }
  };

  const handleToggleAttendance = async () => {
    if (!doctorUser) return;
    setError('');
    setSuccess('');
    const newStatus = doctorStatus === 'IN' ? 'OUT' : 'IN';
    try {
      const res = await api.toggleAttendance(doctorUser.id, newStatus);
      if (res.success) {
        setDoctorStatus(newStatus);
        setSuccess(`Status updated to Checked ${newStatus}`);
        
        // Update user storage
        const updatedUser = { ...doctorUser, status: newStatus };
        setDoctorUser(updatedUser);
        localStorage.setItem('doctor_user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      setError(err.message || 'Failed to update attendance status.');
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!schedDate) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const scheduleData = {
        doctor_id: doctorUser.id,
        date: schedDate,
        is_available: schedAvailable,
        max_sessions: parseInt(schedMaxSessions) || 20
      };
      
      const res = await api.configureSchedule(scheduleData);
      if (res.success) {
        setSuccess('Schedule configured successfully!');
        setSchedDate('');
        setSchedAvailable(true);
        setSchedMaxSessions(20);
        fetchDoctorSchedules(doctorUser.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to configure availability calendar.');
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
        fetchDoctorQueue(doctorUser.id);
      }
    } catch (err) {
      setError(err.message || 'Call out failed.');
    }
  };

  const handleSkip = (apptId) => {
    setCustomDialog({
      show: true,
      type: 'confirm',
      title: 'Skip Patient',
      message: 'Are you sure you want to skip this patient?',
      onConfirm: async () => {
        setError('');
        setSuccess('');
        try {
          const res = await api.skipPatient(apptId);
          if (res.success) {
            setSuccess('Patient skipped.');
            fetchDoctorQueue(doctorUser.id);
          }
        } catch (err) {
          setError(err.message || 'Skip failed.');
        }
      }
    });
  };

  const handleCompleteSession = (appt) => {
    setCustomDialog({
      show: true,
      type: 'prompt',
      title: 'Complete Session',
      message: `Confirm completion of session for ${appt.patient_name}.\nEnter Consultation Reason (optional):`,
      inputValue: 'Routine Consultation',
      placeholder: 'Consultation Reason',
      onConfirm: async (reason) => {
        setError('');
        setSuccess('');
        setLoading(true);
        try {
          const res = await api.completeSession(appt.appointment_id, reason);
          if (res.success) {
            setSuccess(`Consultation for ${appt.patient_name} completed.`);
            fetchDoctorQueue(doctorUser.id);
          }
        } catch (err) {
          setError(err.message || 'Failed to complete session.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const openPrescriptionModal = (appt) => {
    setCurrentAppt(appt);
    setRxDiagnosis('');
    setRxMedicines('');
    setRxInstructions('');
    setShowCompleteModal(true);
  };

  const handleWritePrescription = async (e) => {
    e.preventDefault();
    if (!currentAppt || !rxDiagnosis || !rxMedicines) {
      setCustomDialog({
        show: true,
        type: 'alert',
        title: 'Validation Error',
        message: 'Diagnosis and Medicines are mandatory fields.',
        onConfirm: null
      });
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const rxData = {
        appointment_id: currentAppt.appointment_id,
        diagnosis: rxDiagnosis,
        medicines_dosage: rxMedicines,
        instructions: rxInstructions || null
      };

      const rxRes = await api.writePrescription(rxData);
      if (rxRes.success) {
        setSuccess(`Prescription for ${currentAppt.patient_name} issued successfully.`);
        setShowCompleteModal(false);
        fetchDoctorQueue(doctorUser.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to write prescription.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientNameClick = async (patientId) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.getPatientDetailsAndHistory(patientId);
      if (res.success) {
        setSelectedPatientInfo(res.data.patient);
        setPatientHistoryList(res.data.visits);
        setShowPatientModal(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch patient details.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = () => {
    api.logout('doctor');
    onLogout();
    navigate('/doctor/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      
      {/* Header Bar */}
      <header style={{ 
        background: '#0e7490', 
        padding: '16px 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={24} style={{ color: '#fff' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', fontFamily: 'sans-serif' }}>
            Doctor Portal Console
          </span>
        </div>
        
        {doctorUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#ecfeff', fontSize: '0.9rem', fontWeight: 500 }}>
              {doctorUser.full_name} ({doctorUser.specialty})
            </span>
            <button className="btn-logout-header" onClick={handleLogoutClick} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px' }}>
        
        {error && (
          <div className="alert-toast alert-toast-error" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert-toast alert-toast-success" style={{ marginBottom: '20px' }}>
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* Doctor Action Cards */}
        <div className="booking-wizard-card" style={{ marginBottom: '24px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
                Welcome, {doctorUser?.full_name}
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', margin: 0 }}>
                Chamber: <strong>{doctorUser?.room_number}</strong> | Department: <strong>{doctorUser?.department}</strong>
              </p>
            </div>
            
            <button 
              className="btn"
              style={{
                background: doctorStatus === 'IN' ? '#10b981' : '#f43f5e',
                color: '#fff',
                fontWeight: 700,
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={handleToggleAttendance}
            >
              {doctorStatus === 'IN' ? '🟢 Checked IN' : '🔴 Checked OUT'}
            </button>
          </div>
        </div>

        {/* Tabs */}
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
            onClick={() => { setDoctorTab('queue'); fetchDoctorQueue(doctorUser?.id, queueDate); }}
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

        {/* Live Queue Tab */}
        {doctorTab === 'queue' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>Attending Consultations Queue</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Queue Date:</label>
                  <input 
                    type="date" 
                    value={queueDate} 
                    onChange={(e) => { setQueueDate(e.target.value); fetchDoctorQueue(doctorUser?.id, e.target.value); }}
                    style={{ height: '36px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', color: '#1e293b' }}
                  />
                </div>
                <button className="btn" style={{ padding: '8px 12px', fontSize: '0.85rem', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => fetchDoctorQueue(doctorUser?.id)}>
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </button>
              </div>
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
                        {idx === 0 && appt.status === 'pending' && (
                          <span className="badge" style={{ background: '#E6F4EA', color: '#137333', fontSize: '0.7rem', padding: '3px 6px', borderRadius: '50px' }}>Next in line</span>
                        )}
                      </div>
                      <h4 
                        style={{ color: '#0e7490', fontSize: '1.1rem', margin: '4px 0 0 0', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => handlePatientNameClick(appt.patient_id)}
                        title="Click to view patient details & history"
                      >
                        {appt.patient_name}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>Patient ID: PA-{appt.patient_id} | Date: {appt.appointment_date}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      {(appt.status === 'pending' || appt.status === 'called') && (
                        <button 
                          className="btn" 
                          style={{ 
                            padding: '8px 16px', 
                            fontSize: '0.85rem', 
                            background: appt.status === 'called' ? '#ef4444' : '#06b6d4', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            fontWeight: 600 
                          }} 
                          onClick={() => handleCallout(appt.appointment_id)}
                          disabled={doctorStatus === 'OUT'}
                          title={doctorStatus === 'OUT' ? 'Must check IN first' : appt.status === 'called' ? 'Click again to cancel appointment' : ''}
                        >
                          <Play size={14} />
                          <span>{appt.status === 'called' ? 'Call Out Again (Cancel)' : 'Call Out'}</span>
                        </button>
                      )}

                      {appt.status === 'called' && !appt.prescription_issued && (
                        <button 
                          className="btn" 
                          style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#0e7490', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }} 
                          onClick={() => openPrescriptionModal(appt)}
                        >
                          <Clipboard size={14} />
                          <span>Write Prescription</span>
                        </button>
                      )}

                      {appt.status === 'called' && appt.prescription_issued && (
                        <button 
                          className="btn" 
                          style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }} 
                          onClick={() => handleCompleteSession(appt)}
                        >
                          <CheckCircle size={14} />
                          <span>End Session</span>
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

            {/* Completed Consultations Today */}
            {queueSnapshot?.done && queueSnapshot.done.length > 0 && (
              <div style={{ marginTop: '30px', marginBottom: '30px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '1rem', marginBottom: '12px', fontWeight: 700 }}>Completed Consultations Today</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {queueSnapshot.done.map((appt) => (
                    <div 
                      key={appt.appointment_id} 
                      style={{ 
                        padding: '16px 20px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: '#f8fafc', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        borderLeft: '4px solid #10b981'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '3px 6px',
                            borderRadius: '50px',
                            background: '#E6F4EA',
                            color: '#137333',
                            fontWeight: 600
                          }}>Completed</span>
                          <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>Ticket #{appt.queue_position}</span>
                        </div>
                        <h5 
                          style={{ color: '#0e7490', fontSize: '1.05rem', margin: '4px 0 0 0', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => handlePatientNameClick(appt.patient_id)}
                          title="Click to view patient details & history"
                        >
                          {appt.patient_name}
                        </h5>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>Patient ID: PA-{appt.patient_id} | Date: {appt.appointment_date}</p>
                      </div>
                      <div>
                        {appt.prescription_issued ? (
                          <span style={{ fontSize: '0.85rem', color: '#137333', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Rx Issued
                          </span>
                        ) : (
                          <button 
                            className="btn" 
                            style={{ 
                              padding: '8px 16px', 
                              fontSize: '0.85rem', 
                              background: '#0e7490', 
                              color: '#fff', 
                              border: 'none', 
                              borderRadius: '6px', 
                              cursor: 'pointer', 
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onClick={() => openPrescriptionModal(appt)}
                          >
                            <Clipboard size={14} />
                            <span>Write Prescription</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Queue Summary Breakdown */}
            {queueSnapshot && (
              <div style={{ marginTop: '30px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '1rem', marginBottom: '12px', fontWeight: 700 }}>Today's Queue Summary</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px 16px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: '#0369a1', textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>Total Patients</p>
                    <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0369a1', marginTop: '4px', margin: 0 }}>
                      {Object.values(queueSnapshot).reduce((acc, curr) => acc + (curr?.length || 0), 0)}
                    </p>
                  </div>
                  {Object.entries(queueSnapshot).map(([status, items]) => (
                    <div key={status} style={{ padding: '12px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{status}</p>
                      <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginTop: '4px', margin: 0 }}>{items?.length || 0}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Configure Schedule Tab */}
        {doctorTab === 'schedule' && (() => {
          const days = getDaysInMonth(calendarYear, calendarMonth);
          const monthNames = [
            "January", "February", "March", "April", "May", "June", 
            "July", "August", "September", "October", "November", "December"
          ];
          
          const handlePrevMonth = () => {
            if (calendarMonth === 0) {
              setCalendarMonth(11);
              setCalendarYear(prev => prev - 1);
            } else {
              setCalendarMonth(prev => prev - 1);
            }
          };

          const handleNextMonth = () => {
            if (calendarMonth === 11) {
              setCalendarMonth(0);
              setCalendarYear(prev => prev + 1);
            } else {
              setCalendarMonth(prev => prev + 1);
            }
          };

          return (
            <div className="animate-fade-in">
              <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '24px', fontWeight: 700 }}>
                Configure Booking Calendar Allocation
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '24px',
                alignItems: 'start'
              }}>
                {/* Left side: Calendar Selector Widget */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
                }}>
                  {/* Calendar Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <button 
                      type="button" 
                      onClick={handlePrevMonth}
                      style={{
                        padding: '6px',
                        borderRadius: '50%',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569'
                      }}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                      {monthNames[calendarMonth]} {calendarYear}
                    </span>
                    <button 
                      type="button" 
                      onClick={handleNextMonth}
                      style={{
                        padding: '6px',
                        borderRadius: '50%',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569'
                      }}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  {/* Weekday Titles */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    color: '#64748b',
                    marginBottom: '8px'
                  }}>
                    <span>Su</span>
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                  </div>

                  {/* Calendar Days Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '4px'
                  }}>
                    {days.map((dayDate, idx) => {
                      if (!dayDate) {
                        return <div key={`empty-${idx}`} />;
                      }

                      const dateStr = dayDate.toISOString().split('T')[0];
                      const todayStr = new Date().toISOString().split('T')[0];
                      const isPast = dateStr < todayStr;
                      const isSelected = dateStr === schedDate;
                      const isAllocated = allocatedDates.includes(dateStr);

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          disabled={isPast}
                          onClick={() => setSchedDate(dateStr)}
                          style={{
                            height: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: isSelected || isAllocated ? 700 : 500,
                            cursor: isPast ? 'default' : 'pointer',
                            background: isSelected 
                              ? '#06b6d4' 
                              : isAllocated
                                ? '#fee2e2'
                                : isPast 
                                  ? 'transparent' 
                                  : '#f8fafc',
                            color: isSelected 
                              ? '#ffffff' 
                              : isAllocated
                                ? '#b91c1c'
                                : isPast 
                                  ? '#cbd5e1' 
                                  : '#1e293b',
                            transition: 'all 0.15s ease',
                            border: isSelected 
                              ? '1px solid #06b6d4' 
                              : isAllocated
                                ? '1.5px solid #fca5a5'
                                : '1px solid transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (!isPast && !isSelected) {
                              e.currentTarget.style.background = isAllocated ? '#fca5a5' : '#e2e8f0';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isPast && !isSelected) {
                              e.currentTarget.style.background = isAllocated ? '#fee2e2' : '#f8fafc';
                            }
                          }}
                        >
                          {dayDate.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right side: Configuration Form */}
                <form onSubmit={handleCreateSchedule} style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}>
                  {/* Selected Date Indicator */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    textAlign: 'left'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Selected Date</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                      {schedDate ? new Date(schedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Please select a date from the calendar'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Target Date Input</label>
                    <input 
                      type="date" 
                      value={schedDate} 
                      onChange={(e) => setSchedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      style={{ 
                        height: '42px', 
                        padding: '10px 14px', 
                        borderRadius: '8px', 
                        border: '1px solid #cbd5e1', 
                        fontSize: '0.9rem', 
                        color: '#1e293b',
                        background: '#ffffff'
                      }}
                    />
                  </div>

                  {/* Availability Mode Custom Toggle Card */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Availability Settings</label>
                    <div 
                      onClick={() => setSchedAvailable(!schedAvailable)}
                      style={{
                        padding: '16px',
                        borderRadius: '10px',
                        border: `2px solid ${schedAvailable ? '#06b6d4' : '#cbd5e1'}`,
                        background: schedAvailable ? '#f8fafc' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <strong style={{ display: 'block', color: '#1e293b', fontSize: '0.95rem' }}>
                          {schedAvailable ? 'Open for Bookings' : 'Closed / Unavailable'}
                        </strong>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {schedAvailable ? 'Patients can book slots on this date' : 'No patient bookings allowed'}
                        </span>
                      </div>
                      
                      {/* Switch layout */}
                      <div style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '50px',
                        background: schedAvailable ? '#06b6d4' : '#cbd5e1',
                        position: 'relative',
                        transition: 'background-color 0.2s ease',
                        padding: '2px',
                        flexShrink: 0
                      }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          position: 'absolute',
                          left: schedAvailable ? '22px' : '2px',
                          transition: 'left 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Maximum Consulting Capacity (Sessions)</label>
                    <input 
                      type="number" 
                      value={schedMaxSessions} 
                      onChange={(e) => setSchedMaxSessions(e.target.value)}
                      min="1"
                      required
                      style={{ 
                        height: '42px', 
                        padding: '10px 14px', 
                        borderRadius: '8px', 
                        border: '1px solid #cbd5e1', 
                        fontSize: '0.9rem', 
                        color: '#1e293b',
                        background: '#ffffff'
                      }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={loading} 
                    style={{ 
                      background: '#06b6d4',
                      height: '46px',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'opacity 0.2s ease',
                      marginTop: '8px'
                    }}
                  >
                    {loading ? 'Configuring availability calendar...' : 'Confirm Availability Configuration'}
                  </button>
                </form>
              </div>
            </div>
          );
        })()}

      </main>

      {/* ================= MODAL: Complete Consultation & Prescription ================= */}
      {showCompleteModal && currentAppt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000, padding: '40px 20px', overflowY: 'auto' }}>
          <div className="booking-wizard-card animate-fade-in" style={{ width: '100%', maxWidth: '600px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>Rx: Issue Digital Prescription</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', margin: 0 }}>Writing Prescription for: <strong>{currentAppt.patient_name}</strong> (Ticket #{currentAppt.queue_position})</p>
              </div>
              <button 
                className="btn" 
                style={{ padding: '6px', borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowCompleteModal(false)}
              >
                <X size={18} style={{ color: '#64748b' }} />
              </button>
            </div>

            <form onSubmit={handleWritePrescription} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label className="form-label" style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Diagnosis / Summary *</label>
                <textarea 
                  className="form-textarea" 
                  rows="3"
                  value={rxDiagnosis} 
                  onChange={(e) => setRxDiagnosis(e.target.value)}
                  placeholder="Describe your medical diagnostic summary here..."
                  style={{ background: '#f8fafc', width: '100%', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Prescribed Medicines & Dosages *</label>
                <textarea 
                  className="form-textarea" 
                  rows="3"
                  value={rxMedicines} 
                  onChange={(e) => setRxMedicines(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg - 1 Tab twice daily after food"
                  style={{ background: '#f8fafc', width: '100%', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Doctor Instructions / Recovery Advice (Optional)</label>
                <textarea 
                  className="form-textarea" 
                  rows="2"
                  value={rxInstructions} 
                  onChange={(e) => setRxInstructions(e.target.value)}
                  placeholder="Add additional advice, dietary changes, etc..."
                  style={{ background: '#f8fafc', width: '100%', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontSize: '0.95rem', boxSizing: 'border-box' }}
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
                  {loading ? 'Logging & writing Rx...' : 'Submit Digital Prescription'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Patient Details & History Modal */}
      {showPatientModal && selectedPatientInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1001, padding: '40px 20px', overflowY: 'auto' }}>
          <div className="booking-wizard-card animate-fade-in" style={{ width: '100%', maxWidth: '600px', padding: '24px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>Patient Demographics & Medical History</h3>
              <button 
                className="btn" 
                style={{ padding: '6px', borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}
                onClick={() => { setShowPatientModal(false); setSelectedPatientInfo(null); setPatientHistoryList([]); }}
              >
                <X size={18} style={{ color: '#64748b' }} />
              </button>
            </div>

            {/* Profile demographics */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: '#f1f5f9', 
                border: '2px solid #cbd5e1', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {selectedPatientInfo.photo_url ? (
                  <img src={getMediaUrl(selectedPatientInfo.photo_url)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={36} style={{ color: '#94a3b8' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>{selectedPatientInfo.full_name}</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Patient ID: PA-{selectedPatientInfo.id}</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Email: {selectedPatientInfo.email}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Age</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{selectedPatientInfo.age ? `${selectedPatientInfo.age} Yrs` : 'N/A'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Blood Group</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ef4444' }}>{selectedPatientInfo.blood_group || 'N/A'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Phone</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{selectedPatientInfo.phone_no || 'N/A'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>City / Pincode</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{selectedPatientInfo.city || 'N/A'}{selectedPatientInfo.pin_code ? `, ${selectedPatientInfo.pin_code}` : ''}</span>
              </div>
            </div>

            {/* Visit History (last 2) */}
            <div>
              <h4 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700, marginBottom: '12px' }}>Last 2 Clinical Visits</h4>
              {patientHistoryList.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '10px 0', border: '1px dashed #cbd5e1', borderRadius: '6px' }}>No previous visit records found for this patient.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {patientHistoryList.map(visit => (
                    <div key={visit.visit_id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px', marginBottom: '8px' }}>
                        <div>
                          <strong>{visit.doctor_name}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>({visit.department})</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Date: {new Date(visit.visit_date).toLocaleDateString()}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', margin: '4px 0 8px 0', color: '#334155', textAlign: 'left' }}>
                        <strong>Reason for Visit:</strong> {visit.reason}
                      </p>
                      {visit.prescription ? (
                        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '6px', padding: '10px', fontSize: '0.8rem' }}>
                          <span style={{ color: '#6d28d9', fontWeight: 'bold', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Prescription Details</span>
                          <p style={{ margin: '4px 0 0 0', color: '#4c1d95', textAlign: 'left' }}><strong>Diagnosis:</strong> {visit.prescription.diagnosis}</p>
                          <p style={{ margin: '2px 0 0 0', color: '#4c1d95', textAlign: 'left' }}><strong>Medicines:</strong> {visit.prescription.medicines_dosage}</p>
                          {visit.prescription.instructions && (
                            <p style={{ margin: '2px 0 0 0', color: '#6b21a8', textAlign: 'left' }}><strong>Advice:</strong> {visit.prescription.instructions}</p>
                          )}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, textAlign: 'left' }}>No prescription issued for this visit.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <button 
                type="button" 
                className="btn" 
                style={{ padding: '8px 16px', borderRadius: '6px', background: '#0e7490', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => { setShowPatientModal(false); setSelectedPatientInfo(null); setPatientHistoryList([]); }}
              >
                Close View
              </button>
            </div>
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
                  background: '#0e7490',
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
