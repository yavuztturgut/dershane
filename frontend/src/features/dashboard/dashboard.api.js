import { apiClient } from '../../lib/api-client';

export const dashboardApi = {
  getSummary: async () => (await apiClient.get('/dashboard/summary')).data,
};
