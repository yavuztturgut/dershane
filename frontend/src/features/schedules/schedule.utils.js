import { instantToIstanbulPickerDate, istanbulWallClockToIso } from '../../shared/time/istanbul-date-time';

const courseColors = [
  '#2563eb', '#7c3aed', '#0891b2', '#059669',
  '#ea580c', '#e11d48', '#4f46e5', '#65a30d',
];

export function getInitialVisibleRange(referenceDate = new Date()) {
  const istanbulToday = instantToIstanbulPickerDate(referenceDate);
  istanbulToday.setHours(0, 0, 0, 0);
  const start = new Date(istanbulToday);
  const end = new Date(istanbulToday);
  start.setDate(start.getDate() - 7);
  end.setDate(end.getDate() + 35);
  return { start: istanbulWallClockToIso(start), end: istanbulWallClockToIso(end) };
}

export function getCourseColor(courseId) {
  return courseColors[(Number(courseId) - 1) % courseColors.length] || courseColors[0];
}

export function filterSchedules(schedules, filters) {
  return schedules.filter((schedule) => (
    (!filters.courseId || String(schedule.course_id) === filters.courseId)
    && (!filters.classId || String(schedule.class_id) === filters.classId)
    && (!filters.teacherId || String(schedule.teacher_id) === filters.teacherId)
  ));
}
