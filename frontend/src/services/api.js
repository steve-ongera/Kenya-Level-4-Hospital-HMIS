/**
 * services/api.js
 * ===============
 * Axios instance + all API service calls for every HMIS resource.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({ baseURL: BASE_URL });

// ── Attach JWT to every request ──────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auto-refresh on 401 ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(err);
  }
);

// ════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════
export const authAPI = {
  login:   (creds) => api.post('/auth/login/', creds),
  refresh: (token) => api.post('/auth/refresh/', { refresh: token }),
  verify:  (token) => api.post('/auth/verify/', { token }),
};

// ════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats/'),
};

// ════════════════════════════════════════════════════════════
//  USERS
// ════════════════════════════════════════════════════════════
export const usersAPI = {
  list:       (params) => api.get('/users/', { params }),
  get:        (id)     => api.get(`/users/${id}/`),
  create:     (data)   => api.post('/users/', data),
  update:     (id, d)  => api.patch(`/users/${id}/`, d),
  delete:     (id)     => api.delete(`/users/${id}/`),
  me:         ()       => api.get('/users/me/'),
  doctors:    ()       => api.get('/users/doctors/'),
};

// ════════════════════════════════════════════════════════════
//  PATIENTS
// ════════════════════════════════════════════════════════════
export const patientsAPI = {
  list:         (params) => api.get('/patients/', { params }),
  get:          (id)     => api.get(`/patients/${id}/`),
  create:       (data)   => api.post('/patients/', data),
  update:       (id, d)  => api.patch(`/patients/${id}/`, d),
  delete:       (id)     => api.delete(`/patients/${id}/`),
  search:       (q)      => api.get('/patients/search/', { params: { q } }),
  getVisits:    (id)     => api.get(`/patients/${id}/visits/`),
  getInvoices:  (id)     => api.get(`/patients/${id}/invoices/`),
};

// ════════════════════════════════════════════════════════════
//  SPECIALISTS
// ════════════════════════════════════════════════════════════
export const specialistsAPI = {
  list:   (params) => api.get('/specialists/', { params }),
  get:    (id)     => api.get(`/specialists/${id}/`),
  create: (data)   => api.post('/specialists/', data),
  update: (id, d)  => api.patch(`/specialists/${id}/`, d),
  delete: (id)     => api.delete(`/specialists/${id}/`),
};

// ════════════════════════════════════════════════════════════
//  TARIFFS
// ════════════════════════════════════════════════════════════
export const tariffsAPI = {
  list:   (params) => api.get('/tariffs/', { params }),
  get:    (id)     => api.get(`/tariffs/${id}/`),
  create: (data)   => api.post('/tariffs/', data),
  update: (id, d)  => api.patch(`/tariffs/${id}/`, d),
  delete: (id)     => api.delete(`/tariffs/${id}/`),
};

// ════════════════════════════════════════════════════════════
//  VISITS
// ════════════════════════════════════════════════════════════
export const visitsAPI = {
  list:         (params) => api.get('/visits/', { params }),
  get:          (id)     => api.get(`/visits/${id}/`),
  create:       (data)   => api.post('/visits/', data),
  update:       (id, d)  => api.patch(`/visits/${id}/`, d),
  delete:       (id)     => api.delete(`/visits/${id}/`),
  today:        ()       => api.get('/visits/today/'),
  queue:        (params) => api.get('/visits/queue/', { params }),
  updateStatus: (id, s)  => api.patch(`/visits/${id}/update_status/`, { status: s }),
  assignDoctor: (id, did)=> api.patch(`/visits/${id}/assign_doctor/`, { doctor_id: did }),
};

// ════════════════════════════════════════════════════════════
//  TRIAGE
// ════════════════════════════════════════════════════════════
export const triageAPI = {
  list:    (params) => api.get('/triage/', { params }),
  get:     (id)     => api.get(`/triage/${id}/`),
  create:  (data)   => api.post('/triage/', data),
  update:  (id, d)  => api.patch(`/triage/${id}/`, d),
  delete:  (id)     => api.delete(`/triage/${id}/`),
  pending: ()       => api.get('/triage/pending/'),
};

// ════════════════════════════════════════════════════════════
//  CONSULTATIONS
// ════════════════════════════════════════════════════════════
export const consultationsAPI = {
  list:             (params) => api.get('/consultations/', { params }),
  get:              (id)     => api.get(`/consultations/${id}/`),
  create:           (data)   => api.post('/consultations/', data),
  update:           (id, d)  => api.patch(`/consultations/${id}/`, d),
  delete:           (id)     => api.delete(`/consultations/${id}/`),
  pause:            (id, r)  => api.post(`/consultations/${id}/pause/`, { reason: r }),
  resume:           (id)     => api.post(`/consultations/${id}/resume/`),
  complete:         (id, d)  => api.post(`/consultations/${id}/complete/`, d),
  getLabResults:    (id)     => api.get(`/consultations/${id}/lab_results/`),
  getRadResults:    (id)     => api.get(`/consultations/${id}/radiology_results/`),
};

// ════════════════════════════════════════════════════════════
//  LAB
// ════════════════════════════════════════════════════════════
export const labOrdersAPI = {
  list:    (params) => api.get('/lab-orders/', { params }),
  get:     (id)     => api.get(`/lab-orders/${id}/`),
  create:  (data)   => api.post('/lab-orders/', data),
  update:  (id, d)  => api.patch(`/lab-orders/${id}/`, d),
  delete:  (id)     => api.delete(`/lab-orders/${id}/`),
  pending: ()       => api.get('/lab-orders/pending/'),
};

export const labResultsAPI = {
  list:   (params) => api.get('/lab-results/', { params }),
  get:    (id)     => api.get(`/lab-results/${id}/`),
  create: (data)   => api.post('/lab-results/', data),
  update: (id, d)  => api.patch(`/lab-results/${id}/`, d),
  delete: (id)     => api.delete(`/lab-results/${id}/`),
};

// ════════════════════════════════════════════════════════════
//  RADIOLOGY
// ════════════════════════════════════════════════════════════
export const radiologyOrdersAPI = {
  list:    (params) => api.get('/radiology-orders/', { params }),
  get:     (id)     => api.get(`/radiology-orders/${id}/`),
  create:  (data)   => api.post('/radiology-orders/', data),
  update:  (id, d)  => api.patch(`/radiology-orders/${id}/`, d),
  delete:  (id)     => api.delete(`/radiology-orders/${id}/`),
  pending: ()       => api.get('/radiology-orders/pending/'),
};

export const radiologyResultsAPI = {
  list:   (params) => api.get('/radiology-results/', { params }),
  get:    (id)     => api.get(`/radiology-results/${id}/`),
  create: (data)   => api.post('/radiology-results/', data),
  update: (id, d)  => api.patch(`/radiology-results/${id}/`, d),
  delete: (id)     => api.delete(`/radiology-results/${id}/`),
};

// ════════════════════════════════════════════════════════════
//  PRESCRIPTIONS
// ════════════════════════════════════════════════════════════
export const prescriptionsAPI = {
  list:    (params) => api.get('/prescriptions/', { params }),
  get:     (id)     => api.get(`/prescriptions/${id}/`),
  create:  (data)   => api.post('/prescriptions/', data),
  update:  (id, d)  => api.patch(`/prescriptions/${id}/`, d),
  delete:  (id)     => api.delete(`/prescriptions/${id}/`),
  pending: ()       => api.get('/prescriptions/pending/'),
  dispense:(id)     => api.post(`/prescriptions/${id}/dispense/`),
};

// ════════════════════════════════════════════════════════════
//  DRUGS
// ════════════════════════════════════════════════════════════
export const drugsAPI = {
  list:         (params) => api.get('/drugs/', { params }),
  get:          (id)     => api.get(`/drugs/${id}/`),
  create:       (data)   => api.post('/drugs/', data),
  update:       (id, d)  => api.patch(`/drugs/${id}/`, d),
  delete:       (id)     => api.delete(`/drugs/${id}/`),
  lowStock:     ()       => api.get('/drugs/low_stock/'),
  expiringSoon: ()       => api.get('/drugs/expiring_soon/'),
};

// ════════════════════════════════════════════════════════════
//  INVOICES
// ════════════════════════════════════════════════════════════
export const invoicesAPI = {
  list:         (params) => api.get('/invoices/', { params }),
  get:          (id)     => api.get(`/invoices/${id}/`),
  create:       (data)   => api.post('/invoices/', data),
  update:       (id, d)  => api.patch(`/invoices/${id}/`, d),
  delete:       (id)     => api.delete(`/invoices/${id}/`),
  addPayment:   (id, d)  => api.post(`/invoices/${id}/add_payment/`, d),
  dailySummary: ()       => api.get('/invoices/daily_summary/'),
};

// ════════════════════════════════════════════════════════════
//  PAYMENTS
// ════════════════════════════════════════════════════════════
export const paymentsAPI = {
  list:   (params) => api.get('/payments/', { params }),
  get:    (id)     => api.get(`/payments/${id}/`),
  create: (data)   => api.post('/payments/', data),
  update: (id, d)  => api.patch(`/payments/${id}/`, d),
  delete: (id)     => api.delete(`/payments/${id}/`),
};

export default api;