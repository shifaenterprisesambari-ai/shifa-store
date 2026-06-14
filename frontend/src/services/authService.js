import api from './api';

export const authService = {
  // Customer signup with email
  signup: (data) => api.post('/customer/signup', data),

  // Customer login with email
  loginEmail: (data) => api.post('/customer/login/email', data),

  // Customer login with phone
  loginPhone: (data) => api.post('/customer/login', data),

  // Customer Google OAuth login
  loginGoogle: (data) => api.post('/customer/login/google', data),

  // Shop owner login
  loginShopOwner: (data) => api.post('/shopowner/login', data),

  // Delivery partner login
  loginDeliveryPartner: (data) => api.post('/delivery/login', data),

  // Refresh tokens
  refreshToken: (refreshToken) => api.post('/refresh-token', { refreshToken }),

  // Get current user profile
  fetchUser: () => api.get('/user'),

  // Update user profile
  updateUser: (data) => api.patch('/user', data),

  // Forgot Password & Reset Password
  forgotPassword: (email) => api.post('/customer/forgot-password', { email }),
  resetPassword: (email, otp, newPassword) => api.post('/customer/reset-password', { email, otp, newPassword }),
};
