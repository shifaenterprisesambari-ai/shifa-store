import axios from 'axios';
import { API_BASE_URL } from '../constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Helper to determine the target role context of the request based on URL or current page route
const getRoleContext = (url = '') => {
  if (url.startsWith('/shop/')) return 'ShopOwner';
  if (url.startsWith('/delivery/')) return 'DeliveryPartner';
  if (url.startsWith('/admin/')) return 'Admin';
  
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path.startsWith('/shop')) return 'ShopOwner';
    if (path.startsWith('/delivery')) return 'DeliveryPartner';
    if (path.startsWith('/admin')) return 'Admin';
  }
  return 'Customer';
};

// Request interceptor — inject JWT token and active branch ID
api.interceptors.request.use(
  (config) => {
    const role = getRoleContext(config.url);
    const token = localStorage.getItem(`accessToken_${role}`) || localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Inject active branchId for Customer queries
    if (role === 'Customer') {
      try {
        const savedBranch = localStorage.getItem('activeBranch');
        if (savedBranch) {
          const branch = JSON.parse(savedBranch);
          if (branch && branch._id) {
            config.params = config.params || {};
            if (config.params.branchId === undefined) {
              config.params.branchId = branch._id;
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse active branch in interceptor:", e);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — auto refresh token on 401 (expired) only.
// 403 means wrong role/permissions — retrying with the same role will never succeed.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const role = getRoleContext(originalRequest.url);
        const refreshToken = localStorage.getItem(`refreshToken_${role}`) || localStorage.getItem('refreshToken');
        if (!refreshToken) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem(`accessToken_${role}`);
          localStorage.removeItem(`refreshToken_${role}`);
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const { data } = await axios.post(`${API_BASE_URL}/refresh-token`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem(`accessToken_${role}`, data.accessToken);
        localStorage.setItem(`refreshToken_${role}`, data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
