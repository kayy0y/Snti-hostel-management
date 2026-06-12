import axios from 'axios';

const API = axios.create({ baseURL: 'https://snti-hostel-backend.onrender.com/api' });

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
export const getAllMenuSelections = (ws) => API.get(`/menus/all-selections${ws ? `?week_start=${ws}` : ''}`);

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
export const getAllStudents      = ()           => API.get('/admin/students');
export const addStudent         = d            => API.post('/admin/students', d);
export const deleteStudent      = id           => API.delete(`/admin/students/${id}`);
export const deleteStudentNow   = (id, archive)=> API.delete(`/admin/students/${id}/now`, { data: { archive } });
export const resetBatch         = (archive)    => API.post('/admin/reset-batch', { archive });
export const deleteExpiredUsers = () => API.delete('/admin/expired-users');
export const getDashboardStats  = () => API.get('/admin/dashboard-stats');
export const getQuickAnalytics  = () => API.get('/admin/quick-analytics');
export const getAnalytics       = ws => API.get(`/admin/analytics${ws ? `?week_start=${ws}` : ''}`);
export const exportExcel        = () => API.get('/admin/export-excel', { responseType: 'blob' });
export const exportPDF          = () => API.get('/admin/export-pdf',   { responseType: 'blob' });
export const createAdmin        = d  => API.post('/admin/create-admin', d);
export const getAdminList       = () => API.get('/admin/list-admins');

// Student self-service
export const deactivateSelf     = () => API.post('/student/deactivate');
export const deleteSelf         = (email) => API.delete('/student/delete-account', { data: { email } });

// Archive
export const runArchive               = (month, year) => API.post('/archive/run', { month, year });
export const getArchiveYears          = ()      => API.get('/archive/years');
export const getArchivedRegistrations = (year)  => API.get(`/archive/registrations?year=${year}`);
export const getArchivedFeedback      = (year)  => API.get(`/archive/feedback?year=${year}`);
export const exportArchive            = (year)  => API.get(`/archive/export?year=${year}`, { responseType: 'blob' });
export const deleteArchive            = (year)  => API.delete(`/archive/${year}`);

// Payments
export const getPaymentHistory  = (userId) => API.get(`/payments/${userId}`);
export const recordPayment      = (d)      => API.post('/payments/record', d);
export const verifyPayment      = (id, action, notes) => API.put(`/payments/${id}/verify`, { action, notes });
export const getPendingPayments = ()       => API.get('/payments/pending');