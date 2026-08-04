import { apiClient } from '../../lib/api-client';

export const usersApi = {
  getPage: async (params) => (await apiClient.get('/users', { params })).data,
  getOptions: async (params) => (await apiClient.get('/users/options', { params })).data,
  getById: async (id) => (await apiClient.get(`/users/${id}`)).data,
  create: async (data) => (await apiClient.post('/users', data)).data,
  update: async (id, data) => (await apiClient.put(`/users/${id}`, data)).data,
  remove: async (id) => (await apiClient.delete(`/users/${id}`)).data,
};
