import { apiClient } from '../../shared/api/api-client';

export const schedulesApi = {
  getAll: async (params) => (await apiClient.get('/schedules', { params })).data,
  getById: async (id) => (await apiClient.get(`/schedules/${id}`)).data,
  create: async (data) => (await apiClient.post('/schedules', data)).data,
  update: async (id, data) => (await apiClient.put(`/schedules/${id}`, data)).data,
  remove: async (id) => (await apiClient.delete(`/schedules/${id}`)).data,
};
