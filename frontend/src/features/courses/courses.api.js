import { apiClient } from '../../lib/api-client';

export const coursesApi = {
  getAll: async () => (await apiClient.get('/courses')).data,
  getById: async (id) => (await apiClient.get(`/courses/${id}`)).data,
  create: async (data) => (await apiClient.post('/courses', data)).data,
  update: async (id, data) => (await apiClient.put(`/courses/${id}`, data)).data,
  remove: async (id) => (await apiClient.delete(`/courses/${id}`)).data,
};
