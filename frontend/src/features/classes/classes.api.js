import { apiClient } from '../../shared/api/api-client';

export const classesApi = {
  getAll: async () => (await apiClient.get('/classes')).data,
  getById: async (id) => (await apiClient.get(`/classes/${id}`)).data,
  create: async (data) => (await apiClient.post('/classes', data)).data,
  update: async (id, data) => (await apiClient.put(`/classes/${id}`, data)).data,
  remove: async (id) => (await apiClient.delete(`/classes/${id}`)).data,
};
