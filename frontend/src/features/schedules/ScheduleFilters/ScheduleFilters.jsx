import { Select, SimpleGrid } from '@mantine/core';

export function ScheduleFilters({ filters, setFilters, courseOptions, classOptions, teacherOptions, t }) {
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value || '' }));
  return <SimpleGrid cols={{ base: 1, sm: 3 }}><Select size="sm" clearable data={courseOptions} value={filters.courseId} onChange={(value) => set('courseId', value)} placeholder={t('filterCourse')} aria-label={t('filterCourse')} /><Select size="sm" clearable data={classOptions} value={filters.classId} onChange={(value) => set('classId', value)} placeholder={t('filterClass')} aria-label={t('filterClass')} /><Select size="sm" clearable data={teacherOptions} value={filters.teacherId} onChange={(value) => set('teacherId', value)} placeholder={t('filterTeacher')} aria-label={t('filterTeacher')} /></SimpleGrid>;
}
