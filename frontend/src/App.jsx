import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import PatientLogin from './pages/PatientPortal/PatientLogin';
import PatientDashboard from './pages/PatientPortal/PatientDashboard';
import DoctorLogin from './pages/DoctorPortal/DoctorLogin';
import DoctorRegister from './pages/DoctorPortal/DoctorRegister';
import DoctorDashboard from './pages/DoctorPortal/DoctorDashboard';
import AdminLogin from './pages/AdminPortal/AdminLogin';
import AdminRegister from './pages/AdminPortal/AdminRegister';
import AdminDashboard from './pages/AdminPortal/AdminDashboard';
import { Heart, Shield, Activity } from 'lucide-react';
import './App.css';

function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const SLIDES = [
    {
      portal: 'patient',
      headerTitle: 'PATIENT PORTAL',
      signupLabel: 'Patient Signup',
      signupPath: '/patient/login',
      tagline: 'Patient Portal Technology in Healthcare',
      title: 'Patient Portal',
      subtitle: 'Sample Healthcare Application',
      description: 'Providing simple and secure access to our clinic web application with the facilities:',
      bullets: [
        'Book appointment with Doctors.',
        'Check your confidential medical records.',
        'Provide chat support with our specialists.'
      ],
      loginPath: '/patient/login',
      illustration: (
        <svg width="100%" height="100%" viewBox="0 0 400 350" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="175" r="140" fill="#dbeafe" opacity="0.6" />
          <path d="M120 280 C120 230, 160 210, 160 210 M160 210 C145 210, 130 195, 130 170 C130 145, 145 130, 160 130 C175 130, 190 145, 190 170 C190 195, 175 210, 160 210" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="#fee2e2" />
          <path d="M280 280 C280 230, 240 210, 240 210 M240 210 C255 210, 270 195, 270 170 C270 145, 255 130, 240 130 C225 130, 210 145, 210 170 C210 195, 225 210, 240 210" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="#fee2e2" />
          <path d="M150 290 C150 230, 250 230, 250 290" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" fill="#38bdf8" />
          <circle cx="200" cy="180" r="45" stroke="#1e293b" strokeWidth="12" fill="#fff" />
          <circle cx="270" cy="110" r="45" fill="#ffedd5" stroke="#ea580c" strokeWidth="8" />
          <path d="M270 95 V125 M255 110 H285" stroke="#ea580c" strokeWidth="10" strokeLinecap="round" />
        </svg>
      )
    },
    {
      portal: 'doctor',
      headerTitle: 'DOCTOR PORTAL',
      signupLabel: 'Doctor Signup',
      signupPath: '/doctor/register',
      tagline: 'Doctor Portal Technology in Healthcare',
      title: 'Doctor Portal',
      subtitle: 'Sample Healthcare Application',
      description: 'Providing simple and secure access to our clinic web application with the facilities:',
      bullets: [
        'Manage patient queues in real-time.',
        'Write digital prescriptions (Rx) securely.',
        'Configure scheduling and availability.'
      ],
      loginPath: '/doctor/login',
      illustration: (
        <svg width="100%" height="100%" viewBox="0 0 400 350" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="175" r="140" fill="#ccfbf1" opacity="0.6" />
          <path d="M130 120 C130 220, 270 220, 270 120" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
          <path d="M200 205 V250" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
          <circle cx="200" cy="265" r="20" stroke="#1e293b" strokeWidth="10" fill="#0d9488" />
          <path d="M130 120 V90 H145" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
          <path d="M270 120 V90 H255" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
          <circle cx="145" cy="90" r="6" fill="#1e293b" />
          <circle cx="255" cy="90" r="6" fill="#1e293b" />
          <path d="M200 130 C200 130, 215 110, 230 110 C245 110, 255 122, 255 137 C255 160, 200 190, 200 190 C200 190, 145 160, 145 137 C145 122, 155 110, 170 110 C185 110, 200 130, 200 130 Z" fill="#0f766e" stroke="#1e293b" strokeWidth="6" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      portal: 'admin',
      headerTitle: 'ADMIN PORTAL',
      signupLabel: 'Admin Signup',
      signupPath: '/admin/register',
      tagline: 'Admin Portal Technology in Healthcare',
      title: 'Admin Portal',
      subtitle: 'Sample Healthcare Application',
      description: 'Providing simple and secure access to our clinic web application with the facilities:',
      bullets: [
        'Manage patient and doctor accounts.',
        'Add new departments and clinics.',
        'Monitor all appointments and schedules.'
      ],
      loginPath: '/admin/login',
      illustration: (
        <svg width="100%" height="100%" viewBox="0 0 400 350" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="175" r="140" fill="#e0f2fe" opacity="0.6" />
          <path d="M200 70 C240 70, 290 85, 290 130 C290 200, 200 270, 200 270 C200 270, 110 200, 110 130 C110 85, 160 70, 200 70 Z" fill="#0f2c59" stroke="#1e293b" strokeWidth="12" strokeLinejoin="round" />
          <circle cx="200" cy="145" r="25" stroke="#ffffff" strokeWidth="8" fill="none" />
          <path d="M190 170 H210 V210 H190 Z" fill="#ffffff" />
          <circle cx="200" cy="190" r="5" fill="#0f2c59" />
        </svg>
      )
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [currentSlide]);

  const slide = SLIDES[currentSlide];

  return (
    <div className="landing-theme-wrapper">
      {/* Slides Container */}
      <div className="landing-slides-container">
        {SLIDES.map((slideItem, idx) => {
          let slideClass = '';
          if (idx === currentSlide) {
            slideClass = 'slide-active';
          } else if (idx === (currentSlide - 1 + SLIDES.length) % SLIDES.length) {
            slideClass = 'slide-previous';
          } else {
            slideClass = 'slide-next';
          }

          return (
            <div key={idx} className={`landing-slide ${slideClass}`}>
              {/* Slide Content Header */}
              <header className="landing-header">
                <h1 className="landing-header-title">{slideItem.headerTitle}</h1>
                <Link to={slideItem.signupPath} className="landing-signup-btn">
                  {slideItem.signupLabel}
                </Link>
              </header>

              {/* Main Grid Section */}
              <div className="landing-grid-container">
                
                {/* Left Text details column */}
                <div className="landing-text-column">
                  <div className="landing-tagline-container">
                    <span className="landing-tagline-line"></span>
                    <span className="landing-tagline-text">{slideItem.tagline}</span>
                  </div>

                  <h2 className="landing-title">{slideItem.title}</h2>
                  <h3 className="landing-subtitle">{slideItem.subtitle}</h3>

                  <p className="landing-description">{slideItem.description}</p>

                  <ul className="landing-bullets">
                    {slideItem.bullets.map((bullet, idy) => (
                      <li key={idy} className="landing-bullet-item">
                        <span className="bullet-prefix">-</span> {bullet}
                      </li>
                    ))}
                  </ul>

                  <Link to={slideItem.loginPath} className="landing-login-action-btn">
                    LOGIN
                  </Link>
                </div>

                {/* Right Illustration column */}
                <div className="landing-illustration-column">
                  <div className="landing-vector-box">
                    {slideItem.illustration}
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Dot indicators at bottom center */}
      <div className="landing-dot-navigation">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            className={`landing-dot-btn ${currentSlide === idx ? 'active' : ''}`}
            onClick={() => setCurrentSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function App() {
  const [patientAuthed, setPatientAuthed] = useState(false);
  const [doctorAuthed, setDoctorAuthed] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);

  useEffect(() => {
    // Check initial authentication states from localStorage partitions
    setPatientAuthed(!!localStorage.getItem('patient_token'));
    setDoctorAuthed(!!localStorage.getItem('doctor_token'));
    setAdminAuthed(!!localStorage.getItem('admin_token'));
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Portal Switcher Selector */}
        <Route path="/" element={<LandingPage />} />

        {/* Patient Portal Routing */}
        <Route 
          path="/patient/login" 
          element={patientAuthed ? <Navigate to="/patient/dashboard" replace /> : <PatientLogin onLoginSuccess={() => setPatientAuthed(true)} />} 
        />
        <Route 
          path="/patient/dashboard" 
          element={patientAuthed ? <PatientDashboard onLogout={() => setPatientAuthed(false)} /> : <Navigate to="/patient/login" replace />} 
        />

        {/* Doctor Portal Routing */}
        <Route 
          path="/doctor/login" 
          element={doctorAuthed ? <Navigate to="/doctor/dashboard" replace /> : <DoctorLogin onLoginSuccess={() => setDoctorAuthed(true)} />} 
        />
        <Route 
          path="/doctor/register" 
          element={<DoctorRegister />} 
        />
        <Route 
          path="/doctor/dashboard" 
          element={doctorAuthed ? <DoctorDashboard onLogout={() => setDoctorAuthed(false)} /> : <Navigate to="/doctor/login" replace />} 
        />

        {/* Admin Portal Routing */}
        <Route 
          path="/admin/login" 
          element={adminAuthed ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin onLoginSuccess={() => setAdminAuthed(true)} />} 
        />
        <Route 
          path="/admin/register" 
          element={<AdminRegister />} 
        />
        <Route 
          path="/admin/dashboard" 
          element={adminAuthed ? <AdminDashboard onLogout={() => setAdminAuthed(false)} /> : <Navigate to="/admin/login" replace />} 
        />

        {/* Fallback Catch */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
