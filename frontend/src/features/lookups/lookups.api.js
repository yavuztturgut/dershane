import { apiClient } from '../../shared/api/api-client';

export const lookupsApi = {
  getAll: async () => (await apiClient.get('/lookups')).data,
};
