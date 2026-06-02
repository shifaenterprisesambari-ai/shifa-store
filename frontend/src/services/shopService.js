import api from './api';

export const shopService = {
  getDashboard: () => api.get('/shop/dashboard'),
  getProducts: (params) => api.get('/shop/products', { params }),
  addProduct: (data) => api.post('/shop/products', data),
  updateProduct: (productId, data) => api.put(`/shop/products/${productId}`, data),
  deleteProduct: (productId) => api.delete(`/shop/products/${productId}`),
  toggleProduct: (productId) => api.patch(`/shop/products/${productId}/toggle`),
  getOrders: (params) => api.get('/shop/orders', { params }),
  acceptOrder: (orderId) => api.patch(`/shop/orders/${orderId}/accept`),
  rejectOrder: (orderId, data) => api.patch(`/shop/orders/${orderId}/reject`, data),
  updateSettings: (data) => api.put('/shop/settings', data),
};
