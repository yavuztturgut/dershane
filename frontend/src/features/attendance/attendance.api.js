import { apiClient } from '../../lib/api-client';

export const attendanceApi = {
  getForSchedule: async (scheduleId, params) => (await apiClient.get(`/schedules/${scheduleId}/attendance`, { params })).data,
  saveForSchedule: async (scheduleId, records) => (await apiClient.put(`/schedules/${scheduleId}/attendance`, { records })).data,
  getMine: async (params) => (await apiClient.get('/attendance/me', { params })).data,
  getReport: async (params) => (await apiClient.get('/attendance/report', { params })).data,
  getDailyReport: async (params) => (await apiClient.get('/attendance/report/days', { params })).data,
};
