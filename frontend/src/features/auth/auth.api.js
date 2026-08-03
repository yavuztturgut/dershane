import { apiClient } from '../../lib/api-client';

export const authApi = {
  login: async (data) => (await apiClient.post('/auth/login', data)).data.user,
  logout: () => apiClient.post('/auth/logout'),
  getProfile: async () => (await apiClient.get('/auth/profile')).data,
  updateProfile: async (data) => (await apiClient.patch('/auth/profile', data)).data,
  changePassword: (data) => apiClient.post('/auth/change-password', data),
  forgotPassword: (data) => apiClient.post('/auth/forgot-password', data),
  resetPassword: (data) => apiClient.post('/auth/reset-password', data),
};
