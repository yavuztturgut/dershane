import { apiClient } from '../../shared/api/api-client';

export const rolesApi = {
  getAll: async () => (await apiClient.get('/roles')).data,
  getById: async (id) => (await apiClient.get(`/roles/${id}`)).data,
  create: async (data) => (await apiClient.post('/roles', data)).data,
  update: async (id, data) => (await apiClient.put(`/roles/${id}`, data)).data,
  remove: async (id) => (await apiClient.delete(`/roles/${id}`)).data,
};
