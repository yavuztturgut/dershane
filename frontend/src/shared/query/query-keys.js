export const queryKeys = {
  auth: {
    profile: ['auth', 'profile'],
  },
  lookups: {
    all: ['lookups'],
  },
  users: {
    all: ['users'],
    lists: () => ['users', 'list'],
    list: (params) => ['users', 'list', params],
    details: () => ['users', 'detail'],
    detail: (id) => ['users', 'detail', id],
    options: (params) => ['users', 'options', params],
    allOptions: () => ['users', 'options'],
  },
  schedules: {
    all: ['schedules'],
    lists: () => ['schedules', 'list'],
    list: (params) => ['schedules', 'list', params],
    details: () => ['schedules', 'detail'],
    detail: (id) => ['schedules', 'detail', id],
  },
  attendance: {
    all: ['attendance'],
    schedule: (scheduleId, studentId) => ['attendance', 'schedule', scheduleId, studentId || 'all'],
    reports: () => ['attendance', 'report'],
    dailyReport: (params) => ['attendance', 'report', 'daily', params],
    mine: (params) => ['attendance', 'mine', params],
  },
  dashboard: {
    summary: ['dashboard', 'summary'],
  },
  entities: {
    detail: (entity, id) => ['entity', entity, 'detail', id],
  },
};
