const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const backendHost = BASE_URL.replace(/\/api$/, '').replace(/\/$/, '');
  if (!backendHost) {
    return `/${cleanPath}`;
  }
  return `${backendHost}/${cleanPath}`;
};

const getHeaders = (portal) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  let resolvedPortal = portal;
  if (!resolvedPortal) {
    const path = window.location.pathname;
    if (path.includes('/admin')) {
      resolvedPortal = 'admin';
    } else if (path.includes('/doctor')) {
      resolvedPortal = 'doctor';
    } else {
      resolvedPortal = 'patient';
    }
  }

  let tokenKey = 'patient_token';
  if (resolvedPortal === 'doctor') {
    tokenKey = 'doctor_token';
  } else if (resolvedPortal === 'admin') {
    tokenKey = 'admin_token';
  } else {
    tokenKey = 'patient_token';
  }
  
  const token = localStorage.getItem(tokenKey);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || 'Request failed';
    const details = data?.details ? `: ${data.details}` : '';
    throw new Error(`${errorMsg}${details}`);
  }
  return data;
};

export const api = {
  // Global Auth Login
  login: async (email, password, portal) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    
    if (data.success && data.data?.access_token) {
      let tokenKey = 'patient_token';
      let userKey = 'patient_user';
      if (portal === 'doctor') {
        tokenKey = 'doctor_token';
        userKey = 'doctor_user';
      } else if (portal === 'admin') {
        tokenKey = 'admin_token';
        userKey = 'admin_user';
      }
      localStorage.setItem(tokenKey, data.data.access_token);
      localStorage.setItem(userKey, JSON.stringify(data.data.user));
      localStorage.setItem(`${userKey}_role`, data.data.role); // 'patient' | 'doctor' | 'admin'
    }
    return data;
  },

  logout: (portal) => {
    let tokenKey = 'patient_token';
    let userKey = 'patient_user';
    if (portal === 'doctor') {
      tokenKey = 'doctor_token';
      userKey = 'doctor_user';
    } else if (portal === 'admin') {
      tokenKey = 'admin_token';
      userKey = 'admin_user';
    }
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    localStorage.removeItem(`${userKey}_role`);
  },

  // Patient Portal Actions
  patientSignup: async (signupData) => {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData),
    });
    return handleResponse(res);
  },

  updatePatientProfile: async (patientId, updateData) => {
    const res = await fetch(`${BASE_URL}/patient/profile/update/${patientId}`, {
      method: 'PUT',
      headers: getHeaders('patient'),
      body: JSON.stringify(updateData),
    });
    return handleResponse(res);
  },

  getDoctors: async (department = '') => {
    const url = department ? `${BASE_URL}/patient/doctors?department=${encodeURIComponent(department)}` : `${BASE_URL}/patient/doctors`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  bookAppointment: async (doctorId, date) => {
    const res = await fetch(`${BASE_URL}/patient/appointment/book`, {
      method: 'POST',
      headers: getHeaders('patient'),
      body: JSON.stringify({ doctor_id: doctorId, date }),
    });
    return handleResponse(res);
  },

  cancelAppointment: async (appointmentId) => {
    const res = await fetch(`${BASE_URL}/patient/appointment/${appointmentId}/cancel`, {
      method: 'DELETE',
      headers: getHeaders('patient'),
    });
    return handleResponse(res);
  },

  getMyAppointments: async () => {
    const res = await fetch(`${BASE_URL}/patient/appointments`, {
      method: 'GET',
      headers: getHeaders('patient'),
    });
    return handleResponse(res);
  },

  getQueuePosition: async (appointmentId) => {
    const res = await fetch(`${BASE_URL}/patient/appointment/${appointmentId}/position`, {
      method: 'GET',
      headers: getHeaders('patient'),
    });
    return handleResponse(res);
  },

  getPatientPrescriptions: async (patientId) => {
    const res = await fetch(`${BASE_URL}/prescription/patient/${patientId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  uploadAvatar: async (formData) => {
    const headers = {};
    const token = localStorage.getItem('patient_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE_URL}/upload/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },

  // Doctor Sign Up
  doctorSignup: async (signupData) => {
    const res = await fetch(`${BASE_URL}/auth/signup/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData),
    });
    return handleResponse(res);
  },

  // Admin Sign Up
  adminSignup: async (signupData) => {
    const res = await fetch(`${BASE_URL}/auth/signup/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData),
    });
    return handleResponse(res);
  },

  // Admin Actions
  addDoctor: async (doctorData) => {
    const res = await fetch(`${BASE_URL}/admin/add-doctor`, {
      method: 'POST',
      headers: getHeaders('admin'),
      body: JSON.stringify(doctorData),
    });
    return handleResponse(res);
  },

  viewAllAppointments: async () => {
    const res = await fetch(`${BASE_URL}/admin/appointments`, {
      method: 'GET',
      headers: getHeaders('admin'),
    });
    return handleResponse(res);
  },

  // Doctor Actions
  toggleAttendance: async (doctorId, status) => {
    const res = await fetch(`${BASE_URL}/doctor/attendance`, {
      method: 'POST',
      headers: getHeaders('doctor'),
      body: JSON.stringify({ doctor_id: doctorId, status }),
    });
    return handleResponse(res);
  },

  configureSchedule: async (scheduleData) => {
    const res = await fetch(`${BASE_URL}/doctor/schedule`, {
      method: 'POST',
      headers: getHeaders('doctor'),
      body: JSON.stringify(scheduleData),
    });
    return handleResponse(res);
  },

  getDoctorSchedules: async (doctorId) => {
    const res = await fetch(`${BASE_URL}/doctor/${doctorId}/schedules`, {
      method: 'GET',
      headers: getHeaders('doctor'),
    });
    return handleResponse(res);
  },

  // Doctor Queue Management
  getQueueSnapshot: async (doctorId, dateStr = '') => {
    const url = dateStr ? `${BASE_URL}/queue/${doctorId}/today?date=${dateStr}` : `${BASE_URL}/queue/${doctorId}/today`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders('doctor'),
    });
    return handleResponse(res);
  },

  getQueueCapacity: async (doctorId, dateStr) => {
    const res = await fetch(`${BASE_URL}/queue/${doctorId}/capacity?date=${dateStr}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getActiveQueue: async (doctorId, dateStr = '') => {
    const url = dateStr ? `${BASE_URL}/queue/${doctorId}/active?date=${dateStr}` : `${BASE_URL}/queue/${doctorId}/active`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  calloutPatient: async (appointmentId) => {
    const res = await fetch(`${BASE_URL}/queue/${appointmentId}/callout`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  completeSession: async (appointmentId, reason = '') => {
    const res = await fetch(`${BASE_URL}/queue/${appointmentId}/complete`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },

  skipPatient: async (appointmentId) => {
    const res = await fetch(`${BASE_URL}/queue/${appointmentId}/skip`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Prescription Writing
  writePrescription: async (prescriptionData) => {
    const res = await fetch(`${BASE_URL}/prescription/write`, {
      method: 'POST',
      headers: getHeaders('doctor'),
      body: JSON.stringify(prescriptionData),
    });
    return handleResponse(res);
  },

  // Patient Details & History
  getPatientDetailsAndHistory: async (patientId) => {
    const res = await fetch(`${BASE_URL}/patient/${patientId}/details`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Admin Search Patients
  searchPatient: async (query) => {
    const res = await fetch(`${BASE_URL}/admin/patient/search?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: getHeaders('admin'),
    });
    return handleResponse(res);
  },

  // Admin Account Deletion
  deletePatient: async (patientId) => {
    const res = await fetch(`${BASE_URL}/admin/patient/${patientId}`, {
      method: 'DELETE',
      headers: getHeaders('admin'),
    });
    return handleResponse(res);
  },

  deleteDoctor: async (doctorId) => {
    const res = await fetch(`${BASE_URL}/admin/doctor/${doctorId}`, {
      method: 'DELETE',
      headers: getHeaders('admin'),
    });
    return handleResponse(res);
  },

  getDepartments: async () => {
    const res = await fetch(`${BASE_URL}/patient/departments`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  addDepartment: async (name) => {
    const res = await fetch(`${BASE_URL}/admin/department`, {
      method: 'POST',
      headers: getHeaders('admin'),
      body: JSON.stringify({ name }),
    });
    return handleResponse(res);
  },

  adminUpdatePatientProfile: async (patientId, updateData) => {
    const res = await fetch(`${BASE_URL}/patient/profile/update/${patientId}`, {
      method: 'PUT',
      headers: getHeaders('admin'),
      body: JSON.stringify(updateData),
    });
    return handleResponse(res);
  },

  adminUpdateDoctorProfile: async (doctorId, updateData) => {
    const res = await fetch(`${BASE_URL}/admin/doctor/update/${doctorId}`, {
      method: 'PUT',
      headers: getHeaders('admin'),
      body: JSON.stringify(updateData),
    });
    return handleResponse(res);
  },
};
