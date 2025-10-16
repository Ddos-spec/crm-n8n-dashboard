import axios from 'axios';
import { getToken, removeToken } from './auth.js';
import { getRestApiBaseUrl } from './env.js';

const api = axios.create({
  baseURL: getRestApiBaseUrl()
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  return data.data;
};

export const getProfile = async () => {
  const { data } = await api.get('/auth/me');
  return data.data;
};

export const getDashboardOverview = async () => {
  const [summaryRes, notificationsRes] = await Promise.all([
    api.get('/analytics/summary'),
    api.get('/notifications')
  ]);
  return {
    summary: summaryRes.data.data,
    notifications: notificationsRes.data.data
  };
};

export const getCustomers = async (params) => {
  const { data } = await api.get('/customers', { params });
  return data.data;
};

export const getBusinesses = async (params) => {
  const { data } = await api.get('/businesses', { params });
  return data.data;
};

export const getCampaigns = async () => {
  const { data } = await api.get('/campaigns');
  return data.data;
};

export const getPendingFollowUps = async () => {
  const { data } = await api.get('/follow-ups');
  return data.data;
};

export default api;
