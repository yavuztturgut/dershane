import { apiClient } from '../../lib/api-client';

export const authApi = {
  login: async (data) => (await apiClient.post('/auth/login', data)).data.user,
  logout: () => apiClient.post('/auth/logout'),
  getProfile: async () => (await apiClient.get('/auth/profile')).data,
};
