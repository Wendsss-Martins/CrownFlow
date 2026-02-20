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
  // Exchange session_id for user data
  exchangeSession: async (sessionId) => {
    const response = await api.post('/auth/session', { session_id: sessionId });
    return response.data;
  },

  // Get current user
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Business API
export const businessApi = {
  // Create business
  create: async (data) => {
    const response = await api.post('/business', data);
    return response.data;
  },

  // Get my business
  getMyBusiness: async () => {
    const response = await api.get('/business/me');
    return response.data;
  },

  // Get business by slug
  getBySlug: async (slug) => {
    const response = await api.get(`/business/${slug}`);
    return response.data;
  },
};

export default api;
