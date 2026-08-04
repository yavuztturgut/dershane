import { apiClient } from '../../lib/api-client';

export const attendanceApi = {
  getForSchedule: async (scheduleId, params) => (await apiClient.get(`/schedules/${scheduleId}/attendance`, { params })).data,
  saveForSchedule: async (scheduleId, records, params) => (await apiClient.put(`/schedules/${scheduleId}/attendance`, { records }, { params })).data,
  getMine: async (params) => (await apiClient.get('/attendance/me', { params })).data,
  getReport: async (params) => (await apiClient.get('/attendance/report', { params })).data,
  getDailyReport: async (params) => (await apiClient.get('/attendance/report/days', { params })).data,
};
