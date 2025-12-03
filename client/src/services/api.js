import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Clear storage and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
          break;
          
        case 403:
          console.error('Forbidden:', data.message || 'Access denied');
          break;
          
        case 404:
          console.error('Not found:', data.message || 'Resource not found');
          break;
          
        case 400:
          console.error('Bad request:', data.message || 'Invalid request');
          break;
          
        case 500:
          console.error('Server error:', data.message || 'Internal server error');
          break;
          
        default:
          console.error('Error:', data.message || 'An error occurred');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// Shift services
export const shiftService = {
  getShifts: async (params) => {
    try {
      const response = await api.get('/shifts', { params });
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  getShift: async (id) => {
    try {
      const response = await api.get(`/shifts/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  createShift: async (shiftData) => {
    try {
      const response = await api.post('/shifts', shiftData);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  updateShift: async (id, shiftData) => {
    try {
      const response = await api.put(`/shifts/${id}`, shiftData);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  deleteShift: async (id) => {
    try {
      const response = await api.delete(`/shifts/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  getShiftsByWeek: async (date) => {
    try {
      const response = await api.get(`/shifts/week/${date}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  confirmShift: async (id) => {
    try {
      const response = await api.post(`/shifts/${id}/confirm`);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  getAvailableUsers: async () => {
    try {
      const response = await api.get('/shifts/users/available');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// User services
export const userService = {
  getUsers: async () => {
    try {
      const response = await api.get('/users');
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  getUser: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  updateUser: async (id, userData) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  deleteUser: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  getEmployees: async () => {
    try {
      const response = await api.get('/employees');
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  getEmployee: async (id) => {
    try {
      const response = await api.get(`/employees/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  getEmployeeShifts: async (id, params) => {
    try {
      const response = await api.get(`/employees/${id}/shifts`, { params });
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  updateEmployee: async (id, employeeData) => {
    try {
      const response = await api.put(`/employees/${id}`, employeeData);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  deleteEmployee: async (id) => {
    try {
      const response = await api.delete(`/employees/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default api;