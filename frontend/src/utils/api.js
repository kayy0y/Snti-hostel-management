import axios from 'axios';

const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL ||
    'https://snti-hostel-backend.onrender.com/api'
});

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');

  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }

  return cfg;
});

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

// Auth
export const loginUser = data => API.post('/auth/login', data);
export const registerUser = data => API.post('/auth/register', data);
export const getMe = () => API.get('/auth/me');
export const forgotPassword = data => API.post('/auth/forgot-password', data);
export const verifyOTP = data => API.post('/auth/verify-otp', data);
export const resetPassword = data => API.post('/auth/reset-password', data);

export default API;
