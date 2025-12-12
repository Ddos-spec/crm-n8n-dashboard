import axios from 'axios';

// Vite uses import.meta.env for environment variables
// For same-VPS deployment: use relative path /api (works in production)
// For development: use localhost:4444
// For separate deployment: set REACT_APP_API_BASE_URL in .env
const isDevelopment = import.meta.env.DEV;
const BASE_URL = import.meta.env.REACT_APP_API_BASE_URL ||
  (isDevelopment ? 'http://localhost:4444/api' : '/api');

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
