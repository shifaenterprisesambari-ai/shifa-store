import api from './api';

export const orderService = {
  createOrder: (data) => api.post('/order', data),
  verifyPayment: (data) => api.post('/order/verify-payment', data),
  getOrders: (params) => api.get('/order', { params }),
  getOrderById: (orderId) => api.get(`/order/${orderId}`),
  updateOrderStatus: (orderId, data) => api.patch(`/order/${orderId}/status`, data),
  confirmOrder: (orderId, data) => api.post(`/order/${orderId}/confirm`, data),
  verifyOtp: (orderId, data) => api.post(`/order/${orderId}/verify-otp`, data),
};
