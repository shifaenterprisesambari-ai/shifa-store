import api from './api';

export const deliveryService = {
  getAssignedOrders: (params) => api.get('/delivery/orders', { params }),
  acceptDelivery: (orderId, data) => api.patch(`/delivery/orders/${orderId}/accept`, data),
  cancelDelivery: (orderId) => api.patch(`/delivery/orders/${orderId}/cancel`),
  pickupOrder: (orderId) => api.patch(`/delivery/orders/${orderId}/pickup`),
  startDelivery: (orderId) => api.patch(`/delivery/orders/${orderId}/start`),
  completeDelivery: (orderId, data) => api.patch(`/delivery/orders/${orderId}/complete`, data),
  updateLocation: (data) => api.patch('/delivery/location', data),
};

