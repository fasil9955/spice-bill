import axios from 'axios';

// Use relative URL when served from same host (e.g. JAR); dev uses Vite proxy
const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:8080/api';

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
  getCompanyDetails: () => api.get('/auth/company-details'),
  updateCompanyDetails: (data) => api.put('/auth/company-details', data),
};

export const productService = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  /** Parse barcode (e.g. "1000A250") and return { product, weight } — weight in grams. */
  parseBarcode: (fullBarcode) => api.get(`/products/barcode/parse/${encodeURIComponent(fullBarcode)}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  /** Add to on-hand quantity (positive). Returns updated product. */
  adjustStock: (id, addQty) => api.patch(`/products/${id}/stock-adjust`, { addQty }),
  delete: (id) => api.delete(`/products/${id}`),
};

export const categoryService = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const b2bCustomerService = {
  getAll: () => api.get('/b2b-customers'),
  search: (query) => api.get(`/b2b-customers/search?query=${encodeURIComponent(query || '')}`),
  getById: (id) => api.get(`/b2b-customers/${id}`),
  create: (data) => api.post('/b2b-customers', data),
  update: (id, data) => api.put(`/b2b-customers/${id}`, data),
};

export const invoiceService = {
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  getNextInvoiceNumber: (invoiceType = 'RETAIL') => api.get(`/invoices/next-invoice-number?invoiceType=${encodeURIComponent(invoiceType)}`),
  getNextB2BInvoiceNumber: () => api.get('/invoices/b2b/next-invoice-number'),
  getAll: () => api.get('/invoices'),
  /** @param {{ activeSalesOnly?: boolean }} [options] — exclude cancelled / pending-cancellation from totals */
  getByDate: (date, options = {}) => {
    const params = new URLSearchParams({ date });
    if (options.activeSalesOnly) params.set('activeSalesOnly', 'true');
    return api.get(`/invoices/date?${params.toString()}`);
  },
  getById: (id) => api.get(`/invoices/${id}`),
  getByNumber: (number) => api.get(`/invoices/number/${number}`),
  getB2B: () => api.get('/invoices/b2b'),
  deleteB2B: (id, reason) => api.delete(`/invoices/b2b/${id}${reason != null && reason !== '' ? `?reason=${encodeURIComponent(reason)}` : ''}`),
  getCancellationRequests: () => api.get('/invoices/cancellation-requests'),
  requestCancellation: (id, reason) => api.post(`/invoices/${id}/cancel`, { reason }),
  approveCancellation: (id) => api.post(`/invoices/${id}/approve-cancellation`),
};

export const attendanceService = {
  mark: (data) => api.post('/attendance', data),
  getByDate: (date) => api.get(`/attendance?date=${date}`),
  getByDateRange: (startDate, endDate) => api.get(`/attendance/range?startDate=${startDate}&endDate=${endDate}`),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  delete: (id) => api.delete(`/attendance/${id}`),
  getMonthly: (year, month) => api.get(`/attendance/report/monthly?year=${year}&month=${month}`),
  getStaffMonthly: (userId, year, month) => api.get(`/attendance/staff/${userId}?year=${year}&month=${month}`),
};

export const employeeService = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

export const employeeAccountService = {
  getAdvances: (employeeId) => api.get(`/employee-accounts/advances/${employeeId}`),
  createAdvance: (data) => api.post('/employee-accounts/advances', data),
  deleteAdvance: (advanceId) => api.delete(`/employee-accounts/advances/${advanceId}`),
  getPayments: (employeeId) => api.get(`/employee-accounts/payments/${employeeId}`),
  addPayment: (data) => api.post('/employee-accounts/payments', data),
  deletePayment: (paymentId) => api.delete(`/employee-accounts/payments/${paymentId}`),
  getSalaryClearances: (employeeId) => api.get(`/employee-accounts/salary-clearances/${employeeId}`),
  saveMonthDetails: (data) => api.post('/employee-accounts/month-details', data),
  clearSalary: (data) => api.post('/employee-accounts/clear-salary', data),
};

export const fileUploadService = {
  uploadEmployeePhoto: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/employee-photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadEmployeeAadhar: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/employee-aadhar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const accountingService = {
  getDaySummary: (date) => api.get(`/accounting/summary?date=${date}`),
  updateDaySummary: (date, data) => api.post(`/accounting/summary?date=${date}`, data),
};

export const expenseService = {
  getByDate: (date) => api.get(`/expenses?date=${date || ''}`),
  getByEmployee: (employeeId) => api.get(`/expenses/employee?employeeId=${employeeId}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

export const expenseCategoryService = {
  getAll: () => api.get('/expense-categories'),
  create: (data) => api.post('/expense-categories', data),
  delete: (id) => api.delete(`/expense-categories/${id}`),
};

export const courierService = {
  getAll: () => api.get('/couriers'),
  create: (data) => api.post('/couriers', data),
  update: (id, data) => api.put(`/couriers/${id}`, data),
  delete: (id) => api.delete(`/couriers/${id}`),
};

export const reportService = {
  getGSTR1Export: (year, month) =>
    api.get(`/reports/gstr1-export?year=${year}&month=${month}`, { responseType: 'blob' }),
  getGSTR1Summary: (year, month) =>
    api.get(`/reports/gstr1-summary?year=${year}&month=${month}`),
  getMonthlyByYear: (year) => api.get(`/reports/monthly-by-year?year=${year}`),
  getTopSellingItems: (year, month, limit = 15) =>
    api.get(`/reports/top-selling-items?year=${year}&month=${month}&limit=${limit}`),
};

export default api;
