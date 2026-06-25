# Hospital Queue & Patient Portal System

A modern, full-stack healthcare web application featuring real-time patient queue management, digital prescriptions, and dedicated portals for Patients, Doctors, and Administrators.

This repository is split into:

- **`/backend`**: Python Flask REST API with SQLite/PostgreSQL database support, SQLAlchemy ORM, and JWT authentication.
- **`/frontend`**: React SPA built with Vite, React Router, and Lucide icons.

---

## 🚀 Features

### 👤 Patient Portal

- **QR-Enabled Registration**: Patients can scan a custom QR code or navigate to the portal to register and immediately join the daily queue.
- **Appointment Booking**: Book sessions with available doctors for today or tomorrow.
- **Live Queue Tracking**: Check the real-time queue status (current calling ticket, waiting count, etc.).
- **Prescription & Medical History**: Secure access to past prescriptions and diagnostic history.

### 🩺 Doctor Portal

- **Availability Toggle**: Doctors can set their status to `IN` or `OUT` of their chambers.
- **Real-time Queue Console**: See the list of pending, called, and completed appointments for the day.
- **Digital Rx Prescriber**: Compose and save secure digital prescriptions for patients during consultations.
- **Schedule Configuration**: View and manage daily session slot allocations.

### 🔑 Admin Portal

- **Clinical Setup**: Add and manage doctors, medical departments, and rooms.
- **Session Scheduling**: Configure doctor schedules (available days, max sessions).
- **Queue Monitoring**: Oversee clinic workflow and active queues.
- **Database Maintenance**: Clean up legacy/orphaned records or reset application data.

---

## 🛠️ Tech Stack

| Layer              | Technology                                                                        |
| ------------------ | --------------------------------------------------------------------------------- |
| **Frontend**       | React (v19), Vite, React Router (v7), Lucide Icons, Vanilla CSS                   |
| **Backend**        | Flask (v3.1), Flask-SQLAlchemy (ORM), Flask-Migrate (Alembic), Flask-JWT-Extended |
| **Database**       | SQLite (local development) / PostgreSQL (production-ready)                        |
| **Authentication** | JSON Web Tokens (JWT) secure cookie/header authentication                         |

---

## 📂 Project Structure

```text
hospital/
├── backend/
│   ├── models/            # SQLAlchemy schemas (Patient, Doctor, Admin, Appointment, etc.)
│   ├── routes/            # Flask blueprints (auth, queue, prescription, patient, doctor, admin)
│   ├── static/            # Static assets and profile picture uploads
│   ├── migrations/        # Database migrations (Alembic)
│   ├── app.py             # Flask application factory and lifecycle entry point
│   ├── config.py          # Environment settings configuration
│   ├── seed.py            # Database seeder script
│   └── requirements.txt   # Python dependency manifest
├── frontend/
│   ├── src/
│   │   ├── pages/         # View modules (AdminPortal, DoctorPortal, PatientPortal, StaffPortal)
│   │   ├── services/      # REST API client services
│   │   ├── App.jsx        # Routing configuration
│   │   └── main.jsx       # React DOM entry point
│   ├── index.html
│   ├── vite.config.js     # Vite dev-server config
│   └── package.json       # Frontend dependencies and scripts
└── patient_portal_qr.png  # Patient login/registration quick-access QR code
```

## ⚙️ Installation & Setup

### 1. Prerequisite Environments

Make sure you have **Python 3.10+** and **Node.js 18+** installed.

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # On Windows:
   .venv\Scripts\activate
   # On macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure the environment variables in a `.env` file (a default configuration is already provided):
   ```ini
   DATABASE_URL=sqlite:///hospital.db
   SECRET_KEY=flask_internal_session_secret_key_123456
   JWT_SECRET_KEY=jwt_token_signing_secret_key_789012
   UPLOAD_FOLDER=static/uploads/photos
   FLASK_ENV=development
   ```
5. Seed the database with default departments, admin accounts, and doctor profiles:
   ```bash
   python seed.py
   ```
6. Start the Flask server:
   ```bash
   python app.py
   ```

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```

---

## 🧹 Automatic Database Housekeeping

The Flask server triggers automatic database cleanup routines on incoming requests (`@app.before_request` hook):

- **Daily Expirations**: Active/pending queue appointments from previous days are auto-deleted.
- **Old Visit History**: Visit history records older than 30 days are automatically purged.
- **Orphan Cleanup**: Deletes prescriptions or schedules belonging to deleted doctors or patients to prevent database fragmentation.
