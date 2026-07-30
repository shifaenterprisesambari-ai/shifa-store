import api from './api';

export const authService = {
  // Send Signup Mobile OTP Verification
  sendSignupOtp: (data) => api.post('/customer/send-signup-otp', data),

  // Customer signup with email
  signup: (data) => api.post('/customer/signup', data),

  // Shop owner signup
  signupShopOwner: (data) => api.post('/shopowner/signup', data),

  // Delivery partner signup
  signupDeliveryPartner: (data) => api.post('/delivery/signup', data),

  // Customer login with email (now mapped to phone login)
  loginEmail: (data) => api.post('/customer/login', data),

  // Customer login with phone
  loginPhone: (data) => api.post('/customer/login', data),

  // Customer Google OAuth login
  loginGoogle: (data) => api.post('/customer/google-login', data),

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

  // Forgot Password & Reset Password (accepts phone or email params object)
  forgotPassword: (params) => api.post('/customer/forgot-password', params),
  resetPassword: (params) => api.post('/customer/reset-password', params),
};
