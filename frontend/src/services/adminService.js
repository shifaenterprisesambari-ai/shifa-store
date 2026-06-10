import api from './api';

export const getAdminStats = () => api.get('/admin/stats');
