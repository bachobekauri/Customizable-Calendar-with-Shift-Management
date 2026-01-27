import axios from 'axios';

// Create axios instance with base URL
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to attach token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: (userData) => API.post('/auth/register', userData),
  login: (email, password) => API.post('/auth/login', { email, password }),
  getMe: () => API.get('/auth/me')
};

export const userService = {
  getUsers: () => API.get('/users'),
  getUser: (id) => API.get(`/users/${id}`),
  updateUser: (id, userData) => API.put(`/users/${id}`, userData),
  deleteUser: (id) => API.delete(`/users/${id}`)
};

export const shiftService = {
  getShifts: (params) => API.get('/shifts', { params }),
  getShift: (id) => API.get(`/shifts/${id}`),
  createShift: (shiftData) => API.post('/shifts', shiftData),
  updateShift: (id, shiftData) => API.put(`/shifts/${id}`, shiftData),
  deleteShift: (id) => API.delete(`/shifts/${id}`),
  getShiftsByWeek: (date) => API.get(`/shifts/week/${date}`),
  confirmShift: (id) => API.post(`/shifts/${id}/confirm`),
  getAvailableUsers: () => API.get('/shifts/users/available')
};

export const requestService = {
  getRequests: (params) => API.get('/requests', { params }),
  createRequest: (requestData) => API.post('/requests', requestData),
  approveRequest: (id, data) => API.post(`/requests/${id}/approve`, data),
  rejectRequest: (id, data) => API.post(`/requests/${id}/reject`, data),
  cancelRequest: (id) => API.post(`/requests/${id}/cancel`),
  getAvailableReplacements: (shiftId) => API.get(`/requests/shift/${shiftId}/available`)
};

export const notificationService = {
  getNotifications: () => API.get('/notifications'),
  markAsRead: (id) => API.put(`/notifications/${id}/read`),
  markAllAsRead: () => API.put('/notifications/read-all'),
  deleteNotification: (id) => API.delete(`/notifications/${id}`)
};

export const auditService = {
  getAuditLogs: (params) => API.get('/audit-logs', { params })
};

export default API;