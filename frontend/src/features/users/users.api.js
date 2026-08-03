import { apiClient } from '../../lib/api-client';

async function getAllUsers() {
  const first = (await apiClient.get('/users', { params: { pageSize: 100 } })).data;
  if (first.totalPages <= 1) return first.items;
  const remaining = await Promise.all(Array.from({ length: first.totalPages - 1 }, (_, index) => apiClient.get('/users', { params: { page: index + 2, pageSize: 100 } })));
  return [first.items, ...remaining.map((response) => response.data.items)].flat();
}

export const usersApi = {
  getPage: async (params) => (await apiClient.get('/users', { params })).data,
  getAll: getAllUsers,
  getById: async (id) => (await apiClient.get(`/users/${id}`)).data,
  create: async (data) => (await apiClient.post('/users', data)).data,
  update: async (id, data) => (await apiClient.put(`/users/${id}`, data)).data,
  remove: async (id) => (await apiClient.delete(`/users/${id}`)).data,
};
