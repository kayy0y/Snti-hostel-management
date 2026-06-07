import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import WelcomePage      from './pages/auth/WelcomePage';
import LoginPage        from './pages/auth/LoginPage';
import RegisterPage     from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

import StudentDashboard from './pages/student/StudentDashboard';
import MessRegistration from './pages/student/MessRegistration';
import MenuSelection    from './pages/student/MenuSelection';
import MyMenu           from './pages/student/MyMenu';
import FeedbackPage     from './pages/student/FeedbackPage';
import StudentProfile   from './pages/student/StudentProfile';

import AdminDashboard    from './pages/admin/AdminDashboard';
import StudentsPage      from './pages/admin/StudentsPage';
import RegistrationsPage from './pages/admin/RegistrationsPage';
import MenuManagement    from './pages/admin/MenuManagement';
import FeedbackAdmin     from './pages/admin/FeedbackAdmin';
import AnalyticsPage     from './pages/admin/AnalyticsPage';
import SettingsPage      from './pages/admin/SettingsPage';
import ArchivePage       from './pages/admin/ArchivePage';

const STUDENT_ROLES = ['student', 'external'];
const home = u => !u ? '/' : u.role === 'admin' ? '/admin/dashboard' : '/dashboard';

// Admin secret path — read from env baked into the build
// Default fallback only for development. In production set REACT_APP_ADMIN_PATH in .env
const ADMIN_PATH = process.env.REACT_APP_ADMIN_PATH || 'staff-portal-9x4k';

const Guard = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  if (role === 'student' && !STUDENT_ROLES.includes(user.role)) return <Navigate to="/admin/dashboard" replace />;
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <Routes>
      {/* Welcome splash */}
      <Route path="/" element={user ? <Navigate to={home(user)} replace /> : <WelcomePage />} />

      {/* Public auth */}
      <Route path="/login"           element={user ? <Navigate to={home(user)} replace /> : <LoginPage />} />
      <Route path="/register"        element={user ? <Navigate to={home(user)} replace /> : <RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Student + External */}
      <Route path="/dashboard"     element={<Guard role="student"><StudentDashboard /></Guard>} />
      <Route path="/register-mess" element={<Guard role="student"><MessRegistration /></Guard>} />
      <Route path="/menu/select"   element={<Guard role="student"><MenuSelection /></Guard>} />
      <Route path="/menu/my"       element={<Guard role="student"><MyMenu /></Guard>} />
      <Route path="/feedback"      element={<Guard role="student"><FeedbackPage /></Guard>} />
      <Route path="/profile"       element={<Guard role="student"><StudentProfile /></Guard>} />

      {/* Admin — secret URL, not linked anywhere in the student-facing app */}
      <Route path={`/${ADMIN_PATH}`}           element={user?.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <LoginPage adminPortal />} />
      <Route path="/admin/dashboard"   element={<Guard role="admin"><AdminDashboard /></Guard>} />
      <Route path="/admin/students"    element={<Guard role="admin"><StudentsPage /></Guard>} />
      <Route path="/admin/registrations" element={<Guard role="admin"><RegistrationsPage /></Guard>} />
      <Route path="/admin/menus"       element={<Guard role="admin"><MenuManagement /></Guard>} />
      <Route path="/admin/feedback"    element={<Guard role="admin"><FeedbackAdmin /></Guard>} />
      <Route path="/admin/analytics"   element={<Guard role="admin"><AnalyticsPage /></Guard>} />
      <Route path="/admin/settings"    element={<Guard role="admin"><SettingsPage /></Guard>} />
      <Route path="/admin/archive"     element={<Guard role="admin"><ArchivePage /></Guard>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={home(user)} replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}