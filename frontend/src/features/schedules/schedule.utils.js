import {
  instantToIstanbulCalendarDateTime, instantToIstanbulPickerDate, istanbulWallClockToIso,
} from '../../shared/time/istanbul-date-time';

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

export function groupOverlappingSchedules(schedules) {
  const schedulesByDay = new Map();

  schedules.forEach((schedule) => {
    const dayKey = instantToIstanbulCalendarDateTime(schedule.start_time)?.slice(0, 10)
      || `invalid-${schedule.id}`;
    const daySchedules = schedulesByDay.get(dayKey) || [];
    daySchedules.push(schedule);
    schedulesByDay.set(dayKey, daySchedules);
  });

  return [...schedulesByDay.entries()]
    .sort(([firstDay], [secondDay]) => firstDay.localeCompare(secondDay))
    .flatMap(([dayKey, daySchedules]) => {
      const sorted = [...daySchedules].sort((first, second) => (
        new Date(first.start_time).getTime() - new Date(second.start_time).getTime()
        || new Date(first.end_time).getTime() - new Date(second.end_time).getTime()
        || Number(first.id) - Number(second.id)
      ));
      const groups = [];

      sorted.forEach((schedule) => {
        const startTime = new Date(schedule.start_time).getTime();
        const endTime = new Date(schedule.end_time).getTime();
        const current = groups.at(-1);

        if (!current || !Number.isFinite(startTime) || startTime >= current.endTimestamp) {
          groups.push({
            id: `schedule-group-${dayKey}-${schedule.id}`,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            endTimestamp: endTime,
            schedules: [schedule],
          });
          return;
        }

        current.schedules.push(schedule);
        if (endTime > current.endTimestamp) {
          current.end_time = schedule.end_time;
          current.endTimestamp = endTime;
        }
      });

      return groups.map(({ endTimestamp: _endTimestamp, ...group }) => group);
    });
}
