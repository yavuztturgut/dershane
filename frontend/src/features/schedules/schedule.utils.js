import { instantToIstanbulPickerDate, istanbulWallClockToIso } from '../../shared/time/istanbul-date-time';

const courseColors = [
  '#2563eb', '#7c3aed', '#0891b2', '#059669',
  '#ea580c', '#e11d48', '#4f46e5', '#65a30d',
];

export function getInitialVisibleRange(view, referenceDate = new Date()) {
  const istanbulToday = instantToIstanbulPickerDate(referenceDate);
  istanbulToday.setHours(0, 0, 0, 0);
  const start = new Date(istanbulToday);
  const end = new Date(istanbulToday);

  if (view === 'timeGridWeek') {
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
  } else {
    end.setDate(end.getDate() + 1);
  }

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
