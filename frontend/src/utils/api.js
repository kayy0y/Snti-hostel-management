import axios from 'axios';

const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL ||
    'https://snti-hostel-backend.onrender.com/api'
});

// =====================================
// REQUEST INTERCEPTOR
// =====================================
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// =====================================
// RESPONSE INTERCEPTOR
// =====================================
API.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// =====================================
// AUTH
// =====================================

export const loginUser = data =>
  API.post('/auth/login', data);

export const registerUser = data =>
  API.post('/auth/register', data);

export const getMe = () =>
  API.get('/auth/me');

export const forgotPassword = data =>
  API.post('/auth/forgot-password', data);

export const verifyOTP = data =>
  API.post('/auth/verify-otp', data);

export const resetPassword = data =>
  API.post('/auth/reset-password', data);

// =====================================
// SETTINGS
// =====================================

export const getPublicUPIQR = () =>
  API.get('/settings/upi-qr');

export const getSettings = () =>
  API.get('/settings');

export const updateSettings = data =>
  API.put('/settings', data);

// =====================================
// REGISTRATIONS
// =====================================

export const registerMess = data =>
  API.post('/registrations', data);

export const getMyRegistration = () =>
  API.get('/registrations/my');

export const getAllRegistrations = () =>
  API.get('/registrations');

export const approveRegistration = (id, action) =>
  API.put(`/registrations/${id}/approve`, {
    action
  });

// =====================================
// MENUS
// =====================================

export const getMenus = () =>
  API.get('/menus');

export const addMenuItem = data =>
  API.post('/menus', data);

export const deleteMenuItem = id =>
  API.delete(`/menus/${id}`);

export const selectMenu = data =>
  API.post('/menus/select', data);

export const getMyMenuSelection = () =>
  API.get('/menus/my-selection');

export const getAllMenuSelections = () =>
  API.get('/menus/all-selections');

// =====================================
// WEEKLY PLAN
// =====================================

export const getWeeklyPlan = weekStart =>
  API.get(
    `/weekly-plan${weekStart ? `?week_start=${weekStart}` : ''}`
  );

export const addItemToPlan = data =>
  API.post('/weekly-plan/add-item', data);

export const removeItemFromPlan = id =>
  API.delete(`/weekly-plan/remove-item/${id}`);

export const resetWeekPlan = data =>
  API.delete('/weekly-plan/reset', {
    data
  });

export const getAvailableWeeks = () =>
  API.get('/weekly-plan/available-weeks');

// =====================================
// FEEDBACK
// =====================================

export const submitFeedback = data =>
  API.post('/feedback', data);

export const getAllFeedback = () =>
  API.get('/feedback');

// =====================================
// ADMIN
// =====================================

export const getAllStudents = () =>
  API.get('/admin/students');

export const addStudent = data =>
  API.post('/admin/students', data);

export const deleteStudent = id =>
  API.delete(`/admin/students/${id}`);

export const deleteExpiredUsers = () =>
  API.delete('/admin/expired-users');

export const getDashboardStats = () =>
  API.get('/admin/dashboard-stats');

export const getQuickAnalytics = () =>
  API.get('/admin/quick-analytics');

export const getAnalytics = weekStart =>
  API.get(
    `/admin/analytics${weekStart ? `?week_start=${weekStart}` : ''}`
  );

export const exportExcel = () =>
  API.get('/admin/export-excel', {
    responseType: 'blob'
  });

export const exportPDF = () =>
  API.get('/admin/export-pdf', {
    responseType: 'blob'
  });

export const createAdmin = data =>
  API.post('/admin/create-admin', data);

export const getAdminList = () =>
  API.get('/admin/list-admins');

// =====================================
// ARCHIVE
// =====================================

export const runArchive = (month, year) =>
  API.post('/archive/run', {
    month,
    year
  });

export const getArchiveYears = () =>
  API.get('/archive/years');

export const getArchivedRegistrations = year =>
  API.get(`/archive/registrations?year=${year}`);

export const getArchivedFeedback = year =>
  API.get(`/archive/feedback?year=${year}`);

export const exportArchive = year =>
  API.get(`/archive/export?year=${year}`, {
    responseType: 'blob'
  });

export const deleteArchive = year =>
  API.delete(`/archive/${year}`);

// =====================================
// EXPORT AXIOS INSTANCE
// =====================================

export default API;