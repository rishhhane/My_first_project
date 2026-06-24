import React, { useState, useEffect } from 'react';
import './ConsultationOverview.css';

export default function ConsultationOverview({ appointment, onConfirm, onCancel }) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (isConfirmed) {
      window.scrollTo(0, 0);
    }
  }, [isConfirmed]);

  if (!appointment) return null;

  if (isConfirmed) {
    return (
      <div className="confirm-page-viewport">
        <div className="confirm-card-animated">
          
          {/* SVG TICK ANIMATION */}
          <div className="success-checkmark-wrapper">
            <svg className="checkmark-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className="checkmark-circle-track" cx="26" cy="26" r="25" fill="none"/>
              <path className="checkmark-kick-and-stem" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>

          <h2 className="confirm-title">Allocation Confirmed!</h2>
          <p className="confirm-subtitle">
            Your slot has been securely booked and updated in the registration index.
          </p>

          <div className="confirm-receipt-box">
            <div className="receipt-row">
              <span className="receipt-label">Practitioner</span>
              <span className="receipt-value">{appointment.doctor_name}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Department</span>
              <span className="receipt-value">{appointment.department}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Room Number</span>
              <span className="receipt-value">{appointment.room_number || 'N/A'}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Scheduled Date</span>
              <span className="receipt-value">🕒 {appointment.date}</span>
            </div>
          </div>

          <button 
            type="button" 
            className="btn-confirm-done" 
            onClick={() => {
              if (onConfirm) onConfirm();
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overview-page-viewport">
      <div className="overview-container-card">
        <div className="overview-header-row">
          <h2>Consultation Overview</h2>
          <p>Please double-check your clinical allocation booking summary parameters before confirmation.</p>
        </div>

        <div className="summary-details-box">
          <div className="summary-item-line">
            <span className="summary-label">Medical Specialty Track</span>
            <span className="summary-value badge-pill-tag">{appointment.department}</span>
          </div>
          
          <div className="summary-item-line">
            <span className="summary-label">Assigned Medical Practitioner</span>
            <span className="summary-value-bold">{appointment.doctor_name}</span>
          </div>

          <div className="summary-item-line">
            <span className="summary-label">Selected Consultation Date</span>
            <span className="summary-value">🕒 {appointment.date}</span>
          </div>
        </div>

        <div className="overview-alert-banner">
          ⚠️ Note: Submitting this allocation updates your dynamic electronic health registration queue index instantly.
        </div>

        <div className="overview-action-footer-row">
          <button type="button" className="btn-cancel-return" onClick={onCancel}>
            ← Go Back & Edit
          </button>
          
          <button type="button" className="btn-confirm-slot" onClick={() => setIsConfirmed(true)}>
            Confirm Slot
          </button>
        </div>
      </div>
    </div>
  );
}
