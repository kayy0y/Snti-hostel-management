import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

API.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) { localStorage.clear(); window.location.href = '/login'; }
    return Promise.reject(err);
  }
);

// Auth
export const loginUser      = d => API.post('/auth/login', d);
export const registerUser   = d => API.post('/auth/register', d);
export const getMe          = () => API.get('/auth/me');
export const forgotPassword = d => API.post('/auth/forgot-password', d);
export const verifyOTP      = d => API.post('/auth/verify-otp', d);
export const resetPassword  = d => API.post('/auth/reset-password', d);

// Settings
export const getPublicUPIQR = () => API.get('/settings/upi-qr');
export const getSettings    = () => API.get('/settings');
export const updateSettings = d  => API.put('/settings', d);

// Registrations
export const registerMess        = d  => API.post('/registrations', d);
export const getMyRegistration   = () => API.get('/registrations/my');
export const getAllRegistrations  = () => API.get('/registrations');
export const approveRegistration = (id, action) => API.put(`/registrations/${id}/approve`, { action });

// Menus
export const getMenus            = () => API.get('/menus');
export const addMenuItem         = d  => API.post('/menus', d);
export const deleteMenuItem      = id => API.delete(`/menus/${id}`);
export const selectMenu          = d  => API.post('/menus/select', d);
export const getMyMenuSelection  = () => API.get('/menus/my-selection');
export const getAllMenuSelections = () => API.get('/menus/all-selections');

// Weekly plan
export const getWeeklyPlan      = ws  => API.get(`/weekly-plan${ws ? `?week_start=${ws}` : ''}`);
export const addItemToPlan      = d   => API.post('/weekly-plan/add-item', d);
export const removeItemFromPlan = pid => API.delete(`/weekly-plan/remove-item/${pid}`);
export const resetWeekPlan      = d   => API.delete('/weekly-plan/reset', { data: d });
export const getAvailableWeeks  = ()  => API.get('/weekly-plan/available-weeks');

// Feedback
export const submitFeedback = d => API.post('/feedback', d);
export const getAllFeedback  = () => API.get('/feedback');

// Admin
export const getAllStudents     = ()  => API.get('/admin/students');
export const addStudent        = d   => API.post('/admin/students', d);
export const deleteStudent     = id  => API.delete(`/admin/students/${id}`);
export const deleteExpiredUsers = () => API.delete('/admin/expired-users');
export const getDashboardStats  = () => API.get('/admin/dashboard-stats');
export const getQuickAnalytics  = () => API.get('/admin/quick-analytics');
export const getAnalytics       = ws => API.get(`/admin/analytics${ws ? `?week_start=${ws}` : ''}`);
export const exportExcel        = () => API.get('/admin/export-excel', { responseType: 'blob' });
export const exportPDF          = () => API.get('/admin/export-pdf',   { responseType: 'blob' });
export const createAdmin        = d  => API.post('/admin/create-admin', d);
export const getAdminList       = () => API.get('/admin/list-admins');
