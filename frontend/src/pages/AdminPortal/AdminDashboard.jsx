import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getMediaUrl } from '../../services/api';
import { 
  LogOut, Shield, Users, Clipboard, CheckCircle, 
  RefreshCw, AlertCircle, Calendar, UserPlus, X, PlusCircle
} from 'lucide-react';
import '../PatientPortal/PatientPortal.css';

export default function AdminDashboard({ onLogout }) {
  const [adminUser, setAdminUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Admin Mode States
  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');
  const [doctorDept, setDoctorDept] = useState('');
  const [doctorRoom, setDoctorRoom] = useState('');
  const [doctorSessions, setDoctorSessions] = useState(20);
  const [systemAppointments, setSystemAppointments] = useState([]);
  const [adminTab, setAdminTab] = useState('onboard'); // 'onboard' | 'department' | 'control' | 'accounts'

  // New Department States
  const [newDeptName, setNewDeptName] = useState('');
  const [departments, setDepartments] = useState([]);

  // Queue Control states
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDocQueue, setSelectedDocQueue] = useState([]);
  const [queueDate, setQueueDate] = useState(new Date().toISOString().split('T')[0]);

  // Patient details modal states
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatientInfo, setSelectedPatientInfo] = useState(null);
  const [patientHistoryList, setPatientHistoryList] = useState([]);

  // Account management states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [accountsSubTab, setAccountsSubTab] = useState('patients'); // 'patients' | 'doctors'

  // Custom Dialog
  const [editingPatient, setEditingPatient] = useState(null);
  const [editPatientName, setEditPatientName] = useState('');
  const [editPatientEmail, setEditPatientEmail] = useState('');
  const [editPatientPhone, setEditPatientPhone] = useState('');
  const [editPatientBloodGroup, setEditPatientBloodGroup] = useState('');
  const [editPatientAge, setEditPatientAge] = useState('');
  const [editPatientCity, setEditPatientCity] = useState('');
  const [editPatientPinCode, setEditPatientPinCode] = useState('');

  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editDoctorName, setEditDoctorName] = useState('');
  const [editDoctorEmail, setEditDoctorEmail] = useState('');
  const [editDoctorDept, setEditDoctorDept] = useState('');
  const [editDoctorRoom, setEditDoctorRoom] = useState('');
  const [editDoctorSessions, setEditDoctorSessions] = useState(20);

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

  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setAdminUser(user);
      fetchAdminAppointments();
      fetchDoctorsList();
      fetchDepartments();
    } else {
      navigate('/admin/login');
    }
  }, []);

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

  const handleStartDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName || !newDeptName.trim()) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.addDepartment(newDeptName);
      if (res.success) {
        setSuccess(`Department "${newDeptName}" started successfully!`);
        setNewDeptName('');
        fetchDepartments();
      }
    } catch (err) {
      setError(err.message || 'Failed to start department.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorsList = async () => {
    try {
      const res = await api.getDoctors();
      if (res.success) {
        setDoctors(res.data);
      }
    } catch (err) {
      console.error('Error fetching doctors list:', err);
    }
  };

  const fetchSelectedDoctorQueue = async (docId, dateVal) => {
    const id = docId !== undefined ? docId : selectedDoctorId;
    const dateQuery = dateVal !== undefined ? dateVal : queueDate;
    if (!id) {
      setSelectedDocQueue([]);
      return;
    }
    try {
      const res = await api.getActiveQueue(id, dateQuery);
      if (res.success) {
        setSelectedDocQueue(res.data.queue);
      }
    } catch (err) {
      console.error('Error fetching doctor active queue:', err);
    }
  };

  const handleAdminCallout = async (apptId) => {
    setError('');
    setSuccess('');
    try {
      const res = await api.calloutPatient(apptId);
      if (res.success) {
        setSuccess('Patient called out successfully.');
        fetchSelectedDoctorQueue();
        fetchAdminAppointments();
      }
    } catch (err) {
      setError(err.message || 'Call out failed.');
    }
  };

  const handleAdminSkip = (apptId) => {
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
            setSuccess('Patient marked as skipped.');
            fetchSelectedDoctorQueue();
            fetchAdminAppointments();
          }
        } catch (err) {
          setError(err.message || 'Skip failed.');
        }
      }
    });
  };

  const handleAdminComplete = (apptId) => {
    setCustomDialog({
      show: true,
      type: 'prompt',
      title: 'Complete Session',
      message: 'Enter consultation reason/diagnosis to complete session:',
      inputValue: 'General Checkup',
      placeholder: 'Reason/Diagnosis',
      onConfirm: async (reason) => {
        if (!reason) return;
        setError('');
        setSuccess('');
        try {
          const res = await api.completeSession(apptId, reason);
          if (res.success) {
            setSuccess('Consultation session completed successfully by administrator.');
            fetchSelectedDoctorQueue();
            fetchAdminAppointments();
          }
        } catch (err) {
          setError(err.message || 'Complete failed.');
        }
      }
    });
  };

  const handlePatientNameClick = async (patientId) => {
    setError('');
    try {
      const res = await api.getPatientDetailsAndHistory(patientId);
      if (res.success) {
        setSelectedPatientInfo(res.data.patient);
        setPatientHistoryList(res.data.visits);
        setShowPatientModal(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch patient details.');
    }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setSearchError('');
    setSearchResult(null);
    setLoading(true);
    try {
      const res = await api.searchPatient(searchQuery);
      if (res.success) {
        setSearchResult(res.data);
      }
    } catch (err) {
      setSearchError(err.message || 'No registered patient matches this query.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = (patientId) => {
    setCustomDialog({
      show: true,
      type: 'confirm',
      title: 'Delete Patient Account',
      message: 'WARNING: Are you sure you want to permanently delete this patient account and all associated records? This action cannot be undone.',
      onConfirm: async () => {
        setError('');
        setSuccess('');
        try {
          const res = await api.deletePatient(patientId);
          if (res.success) {
            setSuccess('Patient account successfully deleted.');
            setSearchResult(null);
            setSearchQuery('');
            fetchAdminAppointments();
          }
        } catch (err) {
          setError(err.message || 'Failed to delete patient account.');
        }
      }
    });
  };

  const handleDeleteDoctor = (doctorId) => {
    setCustomDialog({
      show: true,
      type: 'confirm',
      title: 'Delete Doctor Account',
      message: 'WARNING: Are you sure you want to permanently delete this doctor account and all associated records? This action cannot be undone.',
      onConfirm: async () => {
        setError('');
        setSuccess('');
        try {
          const res = await api.deleteDoctor(doctorId);
          if (res.success) {
            setSuccess('Doctor account successfully deleted.');
            fetchDoctorsList();
            fetchAdminAppointments();
            if (selectedDoctorId === doctorId.toString()) {
              setSelectedDoctorId('');
              setSelectedDocQueue([]);
            }
          }
        } catch (err) {
          setError(err.message || 'Failed to delete doctor account.');
        }
      }
    });
  };

  const handleStartEditPatient = (patient) => {
    setEditingPatient(patient);
    setEditPatientName(patient.full_name || '');
    setEditPatientEmail(patient.email || '');
    setEditPatientPhone(patient.phone_no || '');
    setEditPatientBloodGroup(patient.blood_group || '');
    setEditPatientAge(patient.age !== null && patient.age !== undefined ? patient.age.toString() : '');
    setEditPatientCity(patient.city || '');
    setEditPatientPinCode(patient.pin_code || '');
  };

  const handleSavePatient = async (e) => {
    e.preventDefault();
    if (!editingPatient) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const updateData = {
        full_name: editPatientName,
        email: editPatientEmail,
        phone_no: editPatientPhone || null,
        blood_group: editPatientBloodGroup || null,
        age: editPatientAge ? parseInt(editPatientAge) : null,
        city: editPatientCity || null,
        pin_code: editPatientPinCode || null
      };
      const res = await api.adminUpdatePatientProfile(editingPatient.id, updateData);
      if (res.success) {
        setSuccess('Patient profile updated successfully!');
        setEditingPatient(null);
        // Refresh patient search details if currently queried
        if (searchQuery) {
          try {
            const searchRes = await api.searchPatient(searchQuery);
            if (searchRes.success) {
              setSearchResult(searchRes.data);
            }
          } catch (err) {
            setSearchResult(null);
          }
        }
        fetchAdminAppointments();
      }
    } catch (err) {
      setError(err.message || 'Failed to update patient profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditDoctor = (doctor) => {
    setEditingDoctor(doctor);
    setEditDoctorName(doctor.full_name || '');
    setEditDoctorEmail(doctor.email || '');
    setEditDoctorDept(doctor.department || '');
    setEditDoctorRoom(doctor.room_number || '');
    setEditDoctorSessions(doctor.no_of_sessions !== null && doctor.no_of_sessions !== undefined ? doctor.no_of_sessions.toString() : '20');
  };

  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    if (!editingDoctor) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const updateData = {
        full_name: editDoctorName,
        email: editDoctorEmail,
        department: editDoctorDept,
        specialty: editDoctorDept,
        room_number: editDoctorRoom,
        no_of_sessions: parseInt(editDoctorSessions) || 20
      };
      const res = await api.adminUpdateDoctorProfile(editingDoctor.id, updateData);
      if (res.success) {
        setSuccess('Doctor profile updated successfully!');
        setEditingDoctor(null);
        fetchDoctorsList();
        fetchAdminAppointments();
      }
    } catch (err) {
      setError(err.message || 'Failed to update doctor profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardDoctor = async (e) => {
    e.preventDefault();
    if (!doctorEmail || !doctorName || !doctorPassword || !doctorDept || !doctorRoom) {
      setError('Please fill in all mandatory fields.');
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
        specialty: doctorDept,
        department: doctorDept,
        room_number: doctorRoom,
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
        setDoctorDept('');
        setDoctorRoom('');
        setDoctorSessions(20);
        fetchAdminAppointments();
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
      console.error('Error fetching system appointments:', err);
    }
  };

  const handleLogoutClick = () => {
    api.logout('admin');
    onLogout();
    navigate('/admin/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc' }}>
      
      {/* Sidebar Navigation */}
      <aside style={{ 
        width: '260px', 
        background: '#1e293b', 
        color: '#fff', 
        display: 'flex', 
        flexDirection: 'column', 
        flexShrink: 0,
        boxShadow: '4px 0 10px rgba(0,0,0,0.1)'
      }}>
        {/* Sidebar Brand / Console */}
        <div style={{ 
          padding: '24px 20px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          borderBottom: '1px solid rgba(255,255,255,0.1)' 
        }}>
          <Shield size={24} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'sans-serif' }}>
            Admin Console
          </span>
        </div>

        {/* Sidebar Menu Items */}
        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            type="button"
            className={`admin-sidebar-nav-btn ${adminTab === 'onboard' ? 'active' : ''}`}
            onClick={() => { setAdminTab('onboard'); setError(''); setSuccess(''); }}
          >
            <UserPlus size={18} />
            <span>Onboard New Doctor</span>
          </button>

          <button 
            type="button"
            className={`admin-sidebar-nav-btn ${adminTab === 'department' ? 'active' : ''}`}
            onClick={() => { setAdminTab('department'); setError(''); setSuccess(''); }}
          >
            <PlusCircle size={18} />
            <span>Start New Department</span>
          </button>

          <button 
            type="button"
            className={`admin-sidebar-nav-btn ${adminTab === 'control' ? 'active' : ''}`}
            onClick={() => { setAdminTab('control'); fetchDoctorsList(); setError(''); setSuccess(''); }}
          >
            <Calendar size={18} />
            <span>Queue Control Center</span>
          </button>

          <button 
            type="button"
            className={`admin-sidebar-nav-btn ${adminTab === 'accounts' ? 'active' : ''}`}
            onClick={() => { setAdminTab('accounts'); fetchDoctorsList(); setSearchResult(null); setSearchQuery(''); setError(''); setSuccess(''); setSearchError(''); }}
          >
            <Users size={18} />
            <span>Manage Portal Accounts</span>
          </button>
        </nav>

        {/* Sidebar Footer / Admin User Profile Info & Logout */}
        {adminUser && (
          <div className="admin-sidebar-footer" style={{ 
            padding: '16px 20px', 
            borderTop: '1px solid rgba(255,255,255,0.1)', 
            display: 'flex', 
            flexDirection: 'column',
            gap: '12px' 
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="logged-in-label" style={{ fontSize: '0.8rem' }}>Logged in as</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {adminUser.name}
              </span>
            </div>
            <button 
              className="btn" 
              onClick={handleLogoutClick}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                width: '100%', 
                padding: '8px', 
                fontSize: '0.8rem', 
                background: '#dc2626', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Header Bar */}
        <header 
          className="admin-dashboard-header"
          style={{ 
            padding: '16px 30px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            {adminTab === 'onboard' && 'Onboard New Doctor'}
            {adminTab === 'department' && 'Start New Department'}
            {adminTab === 'control' && 'Queue Control Center'}
            {adminTab === 'accounts' && 'Manage Portal Accounts'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="status-label" style={{ fontSize: '0.85rem' }}>Workspace Status:</span>
            <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#ecfdf5', color: '#065f46', borderRadius: '50px', fontWeight: 600 }}>Active</span>
          </div>
        </header>

        {/* Main Panel Content Container */}
        <main style={{ flex: 1, padding: '30px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
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

          {/* Render Tab Contents */}
          {adminTab === 'onboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-form-fade">
              
              {/* Onboard Doctor Card */}
              <div className="booking-wizard-card" style={{ padding: '28px' }}>
                <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: '0 0 8px 0' }}>Register & Onboard Doctor Profile</h3>
                <p className="wizard-sub" style={{ marginBottom: '24px' }}>Fill in professional credentials below to generate a new practitioner account.</p>

                <form onSubmit={handleOnboardDoctor} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className="input-row">
                    <div className="form-field floating-group">
                      <input 
                        type="text" 
                        placeholder=" " 
                        value={doctorName} 
                        onChange={(e) => setDoctorName(e.target.value)} 
                        required
                      />
                      <label>Doctor Full Name</label>
                    </div>

                    <div className="form-field floating-group">
                      <input 
                        type="email" 
                        placeholder=" " 
                        value={doctorEmail} 
                        onChange={(e) => setDoctorEmail(e.target.value)} 
                        required
                      />
                      <label>Professional Email</label>
                    </div>
                  </div>

                  <div className="form-field floating-group">
                    <input 
                      type="password" 
                      placeholder=" " 
                      value={doctorPassword} 
                      onChange={(e) => setDoctorPassword(e.target.value)} 
                      required
                    />
                    <label>Chamber Login Password</label>
                  </div>

                  <div className="input-row">
                    <div className="form-field dynamic-dropdown-group" style={{ flex: 1 }}>
                      <select 
                        value={doctorDept} 
                        onChange={(e) => setDoctorDept(e.target.value)} 
                        className="custom-portal-select-input"
                        required
                      >
                        <option value="" disabled hidden></option>
                        {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                      <label className="floating-select-label">Medical Department</label>
                      <div className="select-arrow-indicator" style={{ top: '14px' }}>▼</div>
                    </div>

                    <div className="form-field floating-group" style={{ flex: 1 }}>
                      <input 
                        type="text" 
                        placeholder=" " 
                        value={doctorRoom} 
                        onChange={(e) => setDoctorRoom(e.target.value)} 
                        required
                      />
                      <label>Room Allocation (e.g. Room 405)</label>
                    </div>
                  </div>

                  <div className="form-field floating-group" style={{ maxWidth: '300px' }}>
                    <input 
                      type="number" 
                      value={doctorSessions} 
                      onChange={(e) => setDoctorSessions(e.target.value)} 
                      min="1"
                      required
                    />
                    <label>Maximum Daily Consulting Capacity</label>
                  </div>

                  <button type="submit" className="btn-primary" disabled={loading} style={{ background: '#0f172a', maxWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <UserPlus size={18} />
                    <span>{loading ? 'Creating Doctor Account...' : 'Onboard Doctor Account'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {adminTab === 'department' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-form-fade">
              {/* Start New Department Card */}
              <div className="booking-wizard-card" style={{ padding: '28px' }}>
                <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: '0 0 8px 0' }}>Start New Department</h3>
                <p className="wizard-sub" style={{ marginBottom: '24px' }}>Add a new clinical department division to the hospital database.</p>
                
                <form onSubmit={handleStartDepartment} className="admin-dept-form-row">
                  <div className="form-field floating-group">
                    <input 
                      type="text" 
                      placeholder=" " 
                      value={newDeptName} 
                      onChange={(e) => setNewDeptName(e.target.value)} 
                      required
                    />
                    <label>Department Name (e.g. Neurology)</label>
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    Start Department
                  </button>
                </form>

                {/* List of current departments */}
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 700, marginBottom: '10px' }}>Active Departments</h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {departments.map((dept) => (
                      <span 
                        key={dept} 
                        style={{ 
                          fontSize: '0.75rem', 
                          padding: '6px 12px', 
                          background: '#f1f5f9', 
                          border: '1px solid #cbd5e1', 
                          borderRadius: '50px', 
                          color: '#334155',
                          fontWeight: 600
                        }}
                      >
                        {dept}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Tab 3: Queue Control Center */}
        {adminTab === 'control' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Control Header & Date Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>Select Target Date:</span>
                <input 
                  type="date" 
                  value={queueDate} 
                  onChange={(e) => {
                    setQueueDate(e.target.value);
                    if (selectedDoctorId) {
                      fetchSelectedDoctorQueue(selectedDoctorId, e.target.value);
                    }
                  }}
                  style={{ 
                    padding: '8px 12px', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '6px', 
                    fontSize: '0.9rem', 
                    color: '#0f172a',
                    background: '#fff' 
                  }}
                />
              </div>
              <button 
                className="btn"
                style={{ 
                  padding: '8px 12px', 
                  fontSize: '0.85rem', 
                  background: '#f1f5f9', 
                  border: '1px solid #cbd5e1', 
                  color: '#1e293b', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px' 
                }} 
                onClick={() => {
                  fetchAdminAppointments();
                  if (selectedDoctorId) {
                    fetchSelectedDoctorQueue(selectedDoctorId, queueDate);
                  }
                }}
              >
                <RefreshCw size={14} />
                <span>Refresh Live Data</span>
              </button>
            </div>

            {/* Department Summary Aggregates */}
            <div>
              <h4 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700, marginBottom: '12px' }}>Department Queue Summaries ({queueDate})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                {departments.map(dept => {
                  const appointmentsForDate = systemAppointments.filter(appt => appt.appointment_date === queueDate);
                  const appts = appointmentsForDate.filter(appt => appt.department === dept);
                  const pending = appts.filter(appt => appt.status === 'pending').length;
                  const called = appts.filter(appt => appt.status === 'called').length;
                  const done = appts.filter(appt => appt.status === 'done').length;
                  
                  return (
                    <div key={dept} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h5 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{dept}</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#475569' }}>Pending:</span>
                          <span style={{ fontWeight: 700, color: pending > 0 ? '#b45309' : '#475569' }}>{pending}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#475569' }}>Called:</span>
                          <span style={{ fontWeight: 700, color: called > 0 ? '#0f766e' : '#475569' }}>{called}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#475569' }}>Completed:</span>
                          <span style={{ fontWeight: 700, color: done > 0 ? '#166534' : '#475569' }}>{done}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid #f1f5f9', paddingTop: '4px', marginTop: '4px', fontWeight: 'bold' }}>
                          <span style={{ color: '#0f172a' }}>Total:</span>
                          <span style={{ color: '#0f172a' }}>{appts.length}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Doctor Queue Inspector & Live Control */}
            <div className="booking-wizard-card" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700, margin: '0 0 16px 0' }}>Doctor Live Queue Inspector</h4>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Select Practitioner:</label>
                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                  <select 
                    value={selectedDoctorId} 
                    onChange={(e) => {
                      const docId = e.target.value;
                      setSelectedDoctorId(docId);
                      fetchSelectedDoctorQueue(docId, queueDate);
                    }}
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: '8px', 
                      border: '1px solid #cbd5e1', 
                      fontSize: '0.9rem', 
                      color: '#0f172a',
                      background: '#fff',
                      cursor: 'pointer',
                      appearance: 'none'
                    }}
                  >
                    <option value="" disabled>-- Select Doctor --</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.full_name} ({doc.department} - {doc.specialty})</option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '14px', top: '12px', pointerEvents: 'none', color: '#64748b' }}>▼</div>
                </div>
              </div>

              {!selectedDoctorId ? (
                <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '0.9rem' }}>
                  Please select a doctor to inspect and manage their active queue list.
                </div>
              ) : selectedDocQueue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '0.9rem' }}>
                  No pending or called appointments for this doctor on the selected date.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px' }}>Ticket</th>
                        <th style={{ padding: '12px' }}>Patient Name</th>
                        <th style={{ padding: '12px' }}>Queue Pos</th>
                        <th style={{ padding: '12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDocQueue.map((appt) => (
                        <tr key={appt.appointment_id} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#334155' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>#{appt.appointment_id}</td>
                          <td 
                            style={{ padding: '12px', color: '#0f766e', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => handlePatientNameClick(appt.patient_id)}
                            title="Click to view patient details & history"
                          >
                            {appt.patient_name}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>#{appt.queue_position}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              borderRadius: '50px',
                              fontWeight: 'bold',
                              background: appt.status === 'called' ? '#CCFBF1' : '#FEF3C7',
                              color: appt.status === 'called' ? '#0F766E' : '#B45309'
                            }}>{appt.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 4: Manage Portal Accounts */}
        {adminTab === 'accounts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-form-fade">
            
            {/* Accounts sub-tabs */}
            <div style={{ 
              display: 'flex', 
              background: '#e2e8f0', 
              borderRadius: '10px', 
              padding: '4px', 
              marginBottom: '4px', 
              border: '1px solid #cbd5e1',
              position: 'relative',
              maxWidth: '320px'
            }}>
              <div 
                style={{
                  position: 'absolute',
                  top: '4px',
                  bottom: '4px',
                  left: accountsSubTab === 'patients' ? '4px' : '50%',
                  width: 'calc(50% - 8px)',
                  background: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
                  transition: 'left 0.25s ease',
                  zIndex: 1
                }}
              />
              <button 
                type="button"
                className="btn"
                style={{ 
                  flex: 1,
                  borderRadius: '8px', 
                  padding: '8px 12px', 
                  background: 'transparent', 
                  border: 'none',
                  color: accountsSubTab === 'patients' ? '#0f172a' : '#64748b',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  zIndex: 2,
                  position: 'relative',
                  boxShadow: 'none'
                }}
                onClick={() => setAccountsSubTab('patients')}
              >
                Patient Accounts
              </button>
              <button 
                type="button"
                className="btn"
                style={{ 
                  flex: 1,
                  borderRadius: '8px', 
                  padding: '8px 12px', 
                  background: 'transparent', 
                  border: 'none',
                  color: accountsSubTab === 'doctors' ? '#0f172a' : '#64748b',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  zIndex: 2,
                  position: 'relative',
                  boxShadow: 'none'
                }}
                onClick={() => setAccountsSubTab('doctors')}
              >
                Doctor Accounts
              </button>
            </div>

            {accountsSubTab === 'patients' ? (
              /* Search Patient Section */
              <div key="patients" className="booking-wizard-card animate-form-fade" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: '0 0 8px 0' }}>Search & Manage Patients</h3>
                <p className="wizard-sub" style={{ marginBottom: '16px' }}>Query patient profiles by Patient ID (e.g., PA-1 or 1), Name, or Email.</p>
                
                <form onSubmit={handlePatientSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. PA-1 or John Doe"
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      height: '42px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      color: '#0f172a',
                      background: '#fff'
                    }}
                    required
                  />
                  <button type="submit" className="btn-primary" style={{ background: '#0f172a', width: 'auto', padding: '0 24px', height: '42px' }}>
                    Search Patient
                  </button>
                </form>

                {searchError && (
                  <div style={{ padding: '12px', background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', borderRadius: '6px', fontSize: '0.85rem' }}>
                    {searchError}
                  </div>
                )}

                {searchResult && (
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '20px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #cbd5e1', paddingBottom: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ 
                          width: '60px', 
                          height: '60px', 
                          borderRadius: '50%', 
                          background: '#fff', 
                          border: '1px solid #cbd5e1', 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          overflow: 'hidden' 
                        }}>
                          {searchResult.patient.photo_url ? (
                            <img src={getMediaUrl(searchResult.patient.photo_url)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '1.5rem' }}>👤</span>
                          )}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>{searchResult.patient.full_name}</h4>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Patient ID: PA-{searchResult.patient.id} | Email: {searchResult.patient.email}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignSelf: 'center' }}>
                        <button 
                          onClick={() => handleStartEditPatient(searchResult.patient)}
                          style={{ 
                            background: '#06b6d4', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '6px', 
                            padding: '8px 16px', 
                            fontSize: '0.85rem', 
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          Edit Profile
                        </button>
                        <button 
                          onClick={() => handleDeletePatient(searchResult.patient.id)}
                          style={{ 
                            background: '#e11d48', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '6px', 
                            padding: '8px 16px', 
                            fontSize: '0.85rem', 
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          Delete Patient Account
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Age</span>
                        <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{searchResult.patient.age ? `${searchResult.patient.age} Yrs` : 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Blood Group</span>
                        <strong style={{ fontSize: '0.85rem', color: '#ef4444' }}>{searchResult.patient.blood_group || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Phone</span>
                        <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{searchResult.patient.phone_no || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>City / Pincode</span>
                        <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{searchResult.patient.city || 'N/A'}{searchResult.patient.pin_code ? `, ${searchResult.patient.pin_code}` : ''}</strong>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
                      <h5 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>Last 2 Clinical Visits</h5>
                      {searchResult.visits.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>No past consultation logs could be resolved.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {searchResult.visits.map(visit => (
                            <div key={visit.visit_id} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px', marginBottom: '6px' }}>
                                <strong>{visit.doctor_name} ({visit.department})</strong>
                                <span style={{ color: '#64748b' }}>{new Date(visit.visit_date).toLocaleDateString()}</span>
                              </div>
                              <p style={{ margin: '4px 0 8px 0', color: '#334155', textAlign: 'left' }}><strong>Reason:</strong> {visit.reason}</p>
                              {visit.prescription ? (
                                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '6px', padding: '8px', fontSize: '0.75rem' }}>
                                  <span style={{ color: '#6d28d9', fontWeight: 'bold', display: 'block' }}>PRESCRIPTION</span>
                                  <p style={{ margin: '2px 0 0 0', textAlign: 'left' }}><strong>Diagnosis:</strong> {visit.prescription.diagnosis}</p>
                                  <p style={{ margin: '2px 0 0 0', textAlign: 'left' }}><strong>Medicines:</strong> {visit.prescription.medicines_dosage}</p>
                                  {visit.prescription.instructions && (
                                    <p style={{ margin: '2px 0 0 0', textAlign: 'left' }}><strong>Advice:</strong> {visit.prescription.instructions}</p>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>No digital prescription issued.</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Manage Doctors Section */
              <div key="doctors" className="booking-wizard-card animate-form-fade" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: '0 0 8px 0' }}>Onboarded Medical Practitioners</h3>
                <p className="wizard-sub" style={{ marginBottom: '20px' }}>Remove practitioner records from the directory list and cancel schedules.</p>

                {doctors.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.9rem' }}>
                    No medical professionals are onboarded in the system.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '12px' }}>Name</th>
                          <th style={{ padding: '12px' }}>Email</th>
                          <th style={{ padding: '12px' }}>Department</th>
                          <th style={{ padding: '12px' }}>Room</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctors.map(doc => (
                          <tr key={doc.id} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#334155' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{doc.full_name}</td>
                            <td style={{ padding: '12px' }}>{doc.email}</td>
                            <td style={{ padding: '12px' }}>{doc.department}</td>
                            <td style={{ padding: '12px' }}>{doc.room_number}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={() => handleStartEditDoctor(doc)}
                                  style={{ 
                                    background: '#06b6d4', 
                                    color: '#fff', 
                                    border: 'none', 
                                    borderRadius: '6px', 
                                    padding: '6px 12px', 
                                    fontSize: '0.8rem', 
                                    cursor: 'pointer',
                                    fontWeight: 600
                                  }}
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDeleteDoctor(doc.id)}
                                  style={{ 
                                    background: '#e11d48', 
                                    color: '#fff', 
                                    border: 'none', 
                                    borderRadius: '6px', 
                                    padding: '6px 12px', 
                                    fontSize: '0.8rem', 
                                    cursor: 'pointer',
                                    fontWeight: 600
                                  }}
                                >
                                  Delete Account
                                </button>
                              </div>
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

      </main>
      </div>

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
                  <span style={{ fontSize: '2rem' }}>👤</span>
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
                        <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>Date: {new Date(visit.visit_date).toLocaleDateString()}</span>
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
                style={{ padding: '8px 16px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => { setShowPatientModal(false); setSelectedPatientInfo(null); setPatientHistoryList([]); }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {editingPatient && (
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
          alignItems: 'flex-start',
          zIndex: 999,
          padding: '40px 20px',
          overflowY: 'auto'
        }} className="animate-fade-in">
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '550px',
            padding: '30px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            position: 'relative'
          }} className="animate-form-fade">
            <button 
              onClick={() => setEditingPatient(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={24} />
            </button>
            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: '0 0 8px 0' }}>Edit Patient Profile</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '24px' }}>Modify personal details for Patient ID: PA-{editingPatient.id}</p>

            <form onSubmit={handleSavePatient} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-field floating-group">
                <input 
                  type="text" 
                  placeholder=" " 
                  value={editPatientName} 
                  onChange={(e) => setEditPatientName(e.target.value)} 
                  required
                />
                <label>Full Name</label>
              </div>

              <div className="form-field floating-group">
                <input 
                  type="email" 
                  placeholder=" " 
                  value={editPatientEmail} 
                  onChange={(e) => setEditPatientEmail(e.target.value)} 
                  required
                />
                <label>Email Address</label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-field floating-group">
                  <input 
                    type="text" 
                    placeholder=" " 
                    value={editPatientPhone} 
                    onChange={(e) => setEditPatientPhone(e.target.value)}
                  />
                  <label>Phone Number</label>
                </div>
                <div className="form-field floating-group">
                  <input 
                    type="number" 
                    placeholder=" " 
                    value={editPatientAge} 
                    onChange={(e) => setEditPatientAge(e.target.value)}
                  />
                  <label>Age</label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-field floating-group">
                  <select
                    value={editPatientBloodGroup}
                    onChange={(e) => setEditPatientBloodGroup(e.target.value)}
                    style={{
                      width: '100%',
                      height: '52px',
                      padding: '14px 16px',
                      fontSize: '14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select Blood Group</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field floating-group">
                  <input 
                    type="text" 
                    placeholder=" " 
                    value={editPatientCity} 
                    onChange={(e) => setEditPatientCity(e.target.value)}
                  />
                  <label>City</label>
                </div>
              </div>

              <div className="form-field floating-group">
                <input 
                  type="text" 
                  placeholder=" " 
                  value={editPatientPinCode} 
                  onChange={(e) => setEditPatientPinCode(e.target.value)}
                />
                <label>Pin Code</label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => setEditingPatient(null)}
                  style={{ flex: 1, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading}
                  style={{ flex: 1, background: '#06b6d4', marginTop: 0 }}
                >
                  {loading ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {editingDoctor && (
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
          alignItems: 'flex-start',
          zIndex: 999,
          padding: '40px 20px',
          overflowY: 'auto'
        }} className="animate-fade-in">
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            padding: '30px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            position: 'relative'
          }} className="animate-form-fade">
            <button 
              onClick={() => setEditingDoctor(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={24} />
            </button>
            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: '0 0 8px 0' }}>Edit Doctor Profile</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '24px' }}>Modify parameters for {editingDoctor.full_name}</p>

            <form onSubmit={handleSaveDoctor} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-field floating-group">
                <input 
                  type="text" 
                  placeholder=" " 
                  value={editDoctorName} 
                  onChange={(e) => setEditDoctorName(e.target.value)} 
                  required
                />
                <label>Full Name</label>
              </div>

              <div className="form-field floating-group">
                <input 
                  type="email" 
                  placeholder=" " 
                  value={editDoctorEmail} 
                  onChange={(e) => setEditDoctorEmail(e.target.value)} 
                  required
                />
                <label>Email Address</label>
              </div>

              <div className="form-field floating-group">
                <select
                  value={editDoctorDept}
                  onChange={(e) => setEditDoctorDept(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '52px',
                    padding: '14px 16px',
                    fontSize: '14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    outline: 'none'
                  }}
                >
                  <option value="" disabled hidden>Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-field floating-group">
                  <input 
                    type="text" 
                    placeholder=" " 
                    value={editDoctorRoom} 
                    onChange={(e) => setEditDoctorRoom(e.target.value)} 
                    required
                  />
                  <label>Room Number</label>
                </div>
                <div className="form-field floating-group">
                  <input 
                    type="number" 
                    placeholder=" " 
                    value={editDoctorSessions} 
                    onChange={(e) => setEditDoctorSessions(e.target.value)} 
                    required
                  />
                  <label>Sessions Limit</label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => setEditingDoctor(null)}
                  style={{ flex: 1, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading}
                  style={{ flex: 1, background: '#06b6d4', marginTop: 0 }}
                >
                  {loading ? 'Saving Changes...' : 'Save Changes'}
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
                  background: '#0f172a',
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
