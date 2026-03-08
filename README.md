# 🏥 Kenya Level 4 Hospital — HMIS v2.0

> Hospital Management Information System  
> eTIMS (KRA) · SHA (Social Health Authority) · MOH Kenya Compliant

---

## Architecture

```
hmis/
├── backend/                  # Django (single `core` app)
│   ├── hmis_project/
│   │   ├── settings.py       # All configuration
│   │   └── urls.py           # Main router (mounts core.urls)
│   ├── core/
│   │   ├── models.py         # ALL models in one file
│   │   ├── serializers.py    # ALL DRF serializers
│   │   ├── views.py          # ALL ViewSets + DashboardView
│   │   ├── urls.py           # DefaultRouter wiring
│   │   └── admin.py          # Django admin registration
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/                 # React + Vite
    └── src/
        ├── App.jsx                          # Root: auth + layout shell
        ├── main.jsx                         # Vite entry
        ├── styles/global.css                # Design system CSS variables
        ├── services/api.js                  # Axios + all API service calls
        ├── components/
        │   ├── layout/Sidebar.jsx           # Role-aware navigation
        │   ├── layout/Navbar.jsx            # Top bar + live clock
        │   └── ui/index.jsx                 # Badge, Button, Card, Table…
        └── pages/
            ├── auth/LoginPage.jsx
            ├── receptionist/ReceptionistDashboard.jsx
            ├── nurse/NurseDashboard.jsx
            ├── doctor/DoctorDashboard.jsx
            ├── pharmacy/PharmacyDashboard.jsx
            ├── lab/LabDashboard.jsx
            ├── radiology/RadiologyDashboard.jsx
            └── admin/AdminDashboard.jsx
```

---

## Patient Flow

```
Reception (search / register) →  Pay consultation fee
    → Triage (nurse records vitals) 
        → Doctor Queue 
            → Consultation (open)
                ├─ Order Labs    → Lab results → Resume
                ├─ Order Scans   → Radiology results → Resume
                └─ Prescribe  
                    → Pharmacy (dispense)
                        → Discharged ✅
```

---

## Backend Setup

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Configure DB (PostgreSQL)
createdb hmis_db
createuser hmis_user -P   # password: hmis_pass

# Run migrations
python manage.py makemigrations core
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load demo data (optional)
python manage.py loaddata fixtures/demo.json

# Start server
python manage.py runserver 0.0.0.0:8000
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

---

## API Endpoints

| Resource           | Endpoint                         |
|--------------------|----------------------------------|
| Auth Login         | POST /api/v1/auth/login/         |
| Auth Refresh       | POST /api/v1/auth/refresh/       |
| Dashboard Stats    | GET  /api/v1/dashboard/stats/    |
| Users              | /api/v1/users/                   |
| Patients           | /api/v1/patients/                |
| Patient Search     | GET  /api/v1/patients/search/?q= |
| Specialists        | /api/v1/specialists/             |
| Service Tariffs    | /api/v1/tariffs/                 |
| Visits             | /api/v1/visits/                  |
| Visit Queue        | GET  /api/v1/visits/queue/       |
| Triage             | /api/v1/triage/                  |
| Triage Pending     | GET  /api/v1/triage/pending/     |
| Consultations      | /api/v1/consultations/           |
| Lab Orders         | /api/v1/lab-orders/              |
| Lab Results        | /api/v1/lab-results/             |
| Radiology Orders   | /api/v1/radiology-orders/        |
| Radiology Results  | /api/v1/radiology-results/       |
| Prescriptions      | /api/v1/prescriptions/           |
| Drugs              | /api/v1/drugs/                   |
| Invoices           | /api/v1/invoices/                |
| Payments           | /api/v1/payments/                |

---

## User Roles → Modules

| Username    | Role         | Module Dashboard         |
|-------------|--------------|--------------------------|
| reception   | receptionist | Register patients/visits |
| nurse       | nurse        | Triage / vitals          |
| doctor      | doctor       | Consultation             |
| pharmacy    | pharmacist   | Dispensing               |
| lab         | lab          | Lab results              |
| radiology   | radiology    | Scan results             |
| admin       | admin        | System administration    |

Default demo password: **1234** (change in production!)

---

## Integrations

### eTIMS (KRA)
Configure in `settings.py`:
```python
ETIMS_BASE_URL      = "https://etims-api.kra.go.ke/etims-api"
ETIMS_PIN           = "YOUR_KRA_PIN"
ETIMS_DEVICE_SERIAL = "YOUR_DEVICE_SERIAL"
```

### SHA (Social Health Authority)
```python
SHA_BASE_URL      = "https://api.sha.go.ke"
SHA_FACILITY_CODE = "YOUR_FACILITY_CODE"
SHA_API_KEY       = "YOUR_API_KEY"
```

---

## Environment Variables (`.env`)

```env
SECRET_KEY=your-secret-key
DEBUG=False
DB_NAME=hmis_db
DB_USER=hmis_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
HOSPITAL_NAME=Your Hospital Name
HOSPITAL_MFL_CODE=12345
SHA_FACILITY_CODE=SHA123
SHA_API_KEY=xxxx
ETIMS_PIN=P051234567M
```