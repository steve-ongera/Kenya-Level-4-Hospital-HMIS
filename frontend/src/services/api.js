/**
 * services/api.js
 * ===============
 * Central Axios instance + service modules for every HMIS resource.
 * Base URL: http://localhost:8000/api/v1
 */

import axios from 'axios';

// ─── Axios instance ──────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post(
          `${api.defaults.baseURL.replace('/v1', '')}/v1/auth/refresh/`,
          { refresh }
        );
        localStorage.setItem('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authService = {
  login:   (username, password) =>
    api.post('/auth/login/', { username, password }),
  refresh: (refresh) =>
    api.post('/auth/refresh/', { refresh }),
  me:      () =>
    api.get('/users/me/'),
  logout:  () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const userService = {
  list:         (params) => api.get('/users/',          { params }),
  create:       (data)   => api.post('/users/',          data),
  update:       (id, data)=> api.patch(`/users/${id}/`, data),
  delete:       (id)     => api.delete(`/users/${id}/`),
  getDoctors:   ()       => api.get('/users/doctors/'),
  me:           ()       => api.get('/users/me/'),
};

// ─── Patients ────────────────────────────────────────────────────────────────

export const patientService = {
  search:   (q)        => api.get('/patients/search/', { params: { q } }),
  list:     (params)   => api.get('/patients/',         { params }),
  get:      (id)       => api.get(`/patients/${id}/`),
  create:   (data)     => api.post('/patients/',         data),
  update:   (id, data) => api.patch(`/patients/${id}/`, data),
  getVisits:(id)       => api.get(`/patients/${id}/visits/`),
  getInvoices:(id)     => api.get(`/patients/${id}/invoices/`),
};

// ─── Specialists & Tariffs ───────────────────────────────────────────────────

export const specialistService = {
  list:   () => api.get('/specialists/'),
  create: (data) => api.post('/specialists/', data),
  update: (id, data) => api.patch(`/specialists/${id}/`, data),
};

export const tariffService = {
  list:     (params) => api.get('/tariffs/', { params }),
  create:   (data)   => api.post('/tariffs/', data),
  update:   (id, data)=> api.patch(`/tariffs/${id}/`, data),
  byCategory:(cat)   => api.get('/tariffs/', { params: { category: cat } }),
};

// ─── Visits ──────────────────────────────────────────────────────────────────

export const visitService = {
  list:          (params) => api.get('/visits/',                  { params }),
  today:         ()       => api.get('/visits/today/'),
  queue:         (status) => api.get('/visits/queue/',             { params: status ? { status } : {} }),
  get:           (id)     => api.get(`/visits/${id}/`),
  create:        (data)   => api.post('/visits/',                  data),
  updateStatus:  (id, status) => api.patch(`/visits/${id}/update_status/`, { status }),
  assignDoctor:  (id, doctor_id) => api.patch(`/visits/${id}/assign_doctor/`, { doctor_id }),
};

// ─── Triage ──────────────────────────────────────────────────────────────────

export const triageService = {
  pending: ()      => api.get('/triage/pending/'),
  create:  (data)  => api.post('/triage/', data),
  get:     (id)    => api.get(`/triage/${id}/`),
  update:  (id, data) => api.patch(`/triage/${id}/`, data),
};

// ─── Consultations ────────────────────────────────────────────────────────────

export const consultationService = {
  list:           (params) => api.get('/consultations/',             { params }),
  get:            (id)     => api.get(`/consultations/${id}/`),
  create:         (data)   => api.post('/consultations/',             data),
  update:         (id, data)=> api.patch(`/consultations/${id}/`,    data),
  pause:          (id, reason) => api.post(`/consultations/${id}/pause/`,  { reason }),
  resume:         (id)     => api.post(`/consultations/${id}/resume/`),
  complete:       (id, disposition) => api.post(`/consultations/${id}/complete/`, { disposition }),
  getLabResults:  (id)     => api.get(`/consultations/${id}/lab_results/`),
  getRadResults:  (id)     => api.get(`/consultations/${id}/radiology_results/`),
};

// ─── Lab ─────────────────────────────────────────────────────────────────────

export const labService = {
  orders: {
    list:    (params) => api.get('/lab-orders/',         { params }),
    pending: ()       => api.get('/lab-orders/pending/'),
    get:     (id)     => api.get(`/lab-orders/${id}/`),
    create:  (data)   => api.post('/lab-orders/',         data),
    update:  (id, data)=> api.patch(`/lab-orders/${id}/`, data),
  },
  results: {
    create:  (data)   => api.post('/lab-results/', data),
    update:  (id, data)=> api.patch(`/lab-results/${id}/`, data),
  },
};

// ─── Radiology ───────────────────────────────────────────────────────────────

export const radiologyService = {
  orders: {
    list:    (params) => api.get('/radiology-orders/',          { params }),
    pending: ()       => api.get('/radiology-orders/pending/'),
    get:     (id)     => api.get(`/radiology-orders/${id}/`),
    create:  (data)   => api.post('/radiology-orders/',          data),
    update:  (id, data)=> api.patch(`/radiology-orders/${id}/`, data),
  },
  results: {
    create:  (data)   => api.post('/radiology-results/', data),
    update:  (id, data)=> api.patch(`/radiology-results/${id}/`, data),
  },
};

// ─── Prescriptions ────────────────────────────────────────────────────────────

export const prescriptionService = {
  list:     (params) => api.get('/prescriptions/',          { params }),
  pending:  ()       => api.get('/prescriptions/pending/'),
  get:      (id)     => api.get(`/prescriptions/${id}/`),
  create:   (data)   => api.post('/prescriptions/',          data),
  update:   (id, data)=> api.patch(`/prescriptions/${id}/`, data),
  dispense: (id)     => api.post(`/prescriptions/${id}/dispense/`),
};

// ─── Drug Inventory ───────────────────────────────────────────────────────────

export const drugService = {
  list:        (params) => api.get('/drugs/',              { params }),
  get:         (id)     => api.get(`/drugs/${id}/`),
  create:      (data)   => api.post('/drugs/',              data),
  update:      (id, data)=> api.patch(`/drugs/${id}/`,     data),
  lowStock:    ()       => api.get('/drugs/low_stock/'),
  expiringSoon:()       => api.get('/drugs/expiring_soon/'),
  search:      (q)      => api.get('/drugs/', { params: { search: q } }),
};

// ─── Invoices / Payments ──────────────────────────────────────────────────────

export const billingService = {
  invoices: {
    list:       (params) => api.get('/invoices/',              { params }),
    get:        (id)     => api.get(`/invoices/${id}/`),
    create:     (data)   => api.post('/invoices/',              data),
    update:     (id, data)=> api.patch(`/invoices/${id}/`,    data),
    addPayment: (id, data)=> api.post(`/invoices/${id}/add_payment/`, data),
    dailySummary:()      => api.get('/invoices/daily_summary/'),
  },
  payments: {
    list:  (params) => api.get('/payments/', { params }),
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardService = {
  stats: () => api.get('/dashboard/stats/'),
};