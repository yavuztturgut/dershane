const courseColors = [
  '#2563eb', '#7c3aed', '#0891b2', '#059669',
  '#ea580c', '#e11d48', '#4f46e5', '#65a30d',
];

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
