import { apiClient } from '../../lib/api-client';

export const attendanceApi = {
  getForSchedule: async (scheduleId) => (await apiClient.get(`/schedules/${scheduleId}/attendance`)).data,
  saveForSchedule: async (scheduleId, records) => (await apiClient.put(`/schedules/${scheduleId}/attendance`, { records })).data,
  getMine: async (params) => (await apiClient.get('/attendance/me', { params })).data,
  getReport: async (params) => (await apiClient.get('/attendance/report', { params })).data,
};
