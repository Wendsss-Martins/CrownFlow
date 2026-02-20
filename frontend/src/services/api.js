// API Service for CrownFlow
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authApi = {
  exchangeSession: async (sessionId) => {
    const response = await api.post('/auth/session', { session_id: sessionId });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Business API
export const businessApi = {
  create: async (data) => {
    const response = await api.post('/business', data);
    return response.data;
  },
  getMyBusiness: async () => {
    const response = await api.get('/business/me');
    return response.data;
  },
  update: async (data) => {
    const response = await api.patch('/business/me', data);
    return response.data;
  },
  getBySlug: async (slug) => {
    const response = await api.get(`/business/${slug}`);
    return response.data;
  },
};

// Services API
export const servicesApi = {
  list: async () => {
    const response = await api.get('/services');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/services', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/services/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/services/${id}`);
    return response.data;
  },
};

// Barbers API
export const barbersApi = {
  list: async () => {
    const response = await api.get('/barbers');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/barbers', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/barbers/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/barbers/${id}`);
    return response.data;
  },
};

// Appointments API (Admin)
export const appointmentsApi = {
  list: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.date) queryParams.append('date', params.date);
    if (params.status) queryParams.append('status', params.status);
    const response = await api.get(`/appointments?${queryParams.toString()}`);
    return response.data;
  },
  listToday: async () => {
    const response = await api.get('/appointments/today');
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/appointments/stats');
    return response.data;
  },
  cancel: async (id) => {
    const response = await api.patch(`/appointments/${id}/cancel`);
    return response.data;
  },
  complete: async (id) => {
    const response = await api.patch(`/appointments/${id}/complete`);
    return response.data;
  },
};

// Public API (for booking page)
export const publicApi = {
  getBusiness: async (slug) => {
    const response = await api.get(`/business/${slug}`);
    return response.data;
  },
  getServices: async (slug) => {
    const response = await api.get(`/public/${slug}/services`);
    return response.data;
  },
  getBarbers: async (slug) => {
    const response = await api.get(`/public/${slug}/barbers`);
    return response.data;
  },
  getAvailableSlots: async (slug, barberId, serviceId, date) => {
    const response = await api.get(`/public/${slug}/slots?barber_id=${barberId}&service_id=${serviceId}&date=${date}`);
    return response.data;
  },
  book: async (slug, data) => {
    const response = await api.post(`/public/${slug}/book`, data);
    return response.data;
  },
};

export default api;
