import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const productService = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

export const categoryService = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const invoiceService = {
  create: (data) => api.post('/invoices', data),
  getAll: () => api.get('/invoices'),
  getById: (id) => api.get(`/invoices/${id}`),
  getByNumber: (number) => api.get(`/invoices/number/${number}`),
  getB2B: () => api.get('/invoices/b2b'),
  deleteB2B: (id) => api.delete(`/invoices/b2b/${id}`),
  requestCancellation: (id, reason) => api.post(`/invoices/${id}/cancel`, { reason }),
};

export const attendanceService = {
  mark: (data) => api.post('/attendance/mark', data),
  getMonthly: (year, month) => api.get(`/attendance/monthly?year=${year}&month=${month}`),
  getStaffMonthly: (userId, year, month) => api.get(`/attendance/staff/${userId}?year=${year}&month=${month}`),
};

export const employeeService = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

export const accountingService = {
  getDaySummary: (date) => api.get(`/accounting/day-summary?date=${date}`),
  closeDay: (data) => api.post('/accounting/close-day', data),
};

export default api;
