SNTI Hostel Mess Management System

A full-stack Hostel Mess Management System developed for SNTI Hostel to streamline student mess registration, menu selection, feedback collection, and administrative management.

- Features

1-Student Portal

* Student Registration & Login
* Forgot Password & OTP Verification
* Mess Registration
* Weekly Menu Selection
* View Selected Menu
* Submit Feedback
* Profile Management

 2- dmin / Warden Portal

* Secure Admin Login
* Dashboard Analytics
* Student Management
* Registration Approval System
* Menu Management
* Feedback Monitoring
* System Settings
* Reports & Analytics
* Archive Management

---

- Tech Stack

### Frontend

* React.js
* React Router DOM
* Axios
* React Hot Toast

### Backend

* Node.js
* Express.js
* JWT Authentication
* Express Validator

### Database

* MySQL

### Deployment

* Frontend: Vercel
* Backend: Render

---

- Project Structure

```bash
SNTI-Hostel-Management/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/
│   │   ├── utils/
│   │   └── App.js
│   └── package.json
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── config/
│   ├── utils/
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

- Installation

### Clone Repository

```bash
git clone https://github.com/your-username/Snti-hostel-management.git

cd Snti-hostel-management
```

---

## Backend Setup

Navigate to backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create `.env`

```env
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=snti_hostel

JWT_SECRET=your_jwt_secret

FRONTEND_URL=http://localhost:3000

UPI_ID=your-upi-id
UPI_NAME=SNTI Hostel Mess
UPI_AMOUNT=1500
```

Run backend:

```bash
npm start
```

---

## Frontend Setup

Navigate to frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create `.env`

```env
REACT_APP_API_URL=http://localhost:5000/api

REACT_APP_ADMIN_PATH=admin/login
```

Run frontend:

```bash
npm start
```

---

- Production Deployment

### Backend (Render)

Environment Variables:

```env
PORT=5000

DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=

JWT_SECRET=

FRONTEND_URL=https://your-vercel-domain.vercel.app
```

### Frontend (Vercel)

Environment Variables:

```env
REACT_APP_API_URL=https://your-render-backend.onrender.com/api

REACT_APP_ADMIN_PATH=admin/login
```

---

- Authentication & Authorization

### Roles

#### Student

Can:

* Register
* Login
* Register for Mess
* Select Menu
* Submit Feedback

#### Admin / Warden

Can:

* Approve Registrations
* Manage Menus
* Manage Students
* View Analytics
* Update Settings
* View Feedback

---

- Important Routes

### Student Portal

```text
/
```

```text
/login
```

```text
/register
```

```text
/dashboard
```

### Admin Portal

```text
/admin/login
```

```text
/admin/dashboard
```

---

## 📊 Modules

### Student Module

* Registration
* Authentication
* Menu Selection
* Feedback

### Admin Module

* Dashboard
* Registrations
* Students
* Menu Management
* Feedback
* Analytics
* Settings

---

- Health Check

Backend Health Endpoint:

```text
/health
```

Example Response:

```json
{
  "success": true,
  "status": "ok"
}
```

---

- Developed For

**SNTI Hostel Management**

A centralized digital platform for hostel mess administration and student meal management.

---


- Live Deployment

**Frontend**

```text
https://snti-hostel-management.vercel.app
```

**Backend**

```text
https://snti-hostel-backend.onrender.com
```

- Live Demo

https://snti-hostel-management.vercel.app
