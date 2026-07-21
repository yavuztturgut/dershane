import { apiClient } from '../../lib/api-client';

export const usersApi = {
  getAll: async () => (await apiClient.get('/users')).data,
  getById: async (id) => (await apiClient.get(`/users/${id}`)).data,
  create: async (data) => (await apiClient.post('/users', data)).data,
  update: async (id, data) => (await apiClient.put(`/users/${id}`, data)).data,
  remove: async (id) => (await apiClient.delete(`/users/${id}`)).data,
};
