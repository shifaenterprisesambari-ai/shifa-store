import api from './api';

export const getAdminStats = (params) => api.get('/admin/stats', { params });
export const getConfig = () => api.get('/admin/config');
export const updateConfig = (data) => api.put('/admin/config', data);
export const updateBranchCommission = (data) => api.put('/admin/branch-commission', data);
export const getPendingRequests = () => api.get('/admin/pending-requests');
export const approveRequest = (userId, role) => api.post('/admin/approve-request', { userId, role });
export const rejectRequest = (userId, role) => api.post('/admin/reject-request', { userId, role });
export const calculateProfit = (days, shopOwnerId) => api.get(`/admin/calculate-profit?days=${days}&shopOwnerId=${shopOwnerId}`);
export const calculateRiderPayout = (days, deliveryPartnerId) => api.get(`/admin/calculate-rider-payout?days=${days}&deliveryPartnerId=${deliveryPartnerId}`);


