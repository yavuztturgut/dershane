import { apiClient } from '../../shared/api/api-client';

export const dashboardApi = {
  getSummary: async () => (await apiClient.get('/dashboard/summary')).data,
};
