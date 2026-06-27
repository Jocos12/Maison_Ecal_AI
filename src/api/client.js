import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || '';
    const isAuthAttempt =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/signup') ||
      url.includes('/api/auth/verify-otp');
    if (err.response?.status === 401 && !url.includes('/api/auth/me') && !isAuthAttempt) {
      window.dispatchEvent(new CustomEvent('mecal:unauthorized'));
    }
    return Promise.reject(err);
  }
);
