import { apiClient } from '../../lib/api-client';

export const lookupsApi = {
  getAll: async () => (await apiClient.get('/lookups')).data,
};
