import { describe, expect, it } from 'vitest';
import { filterSchedules, getCourseColor, getInitialVisibleRange } from './schedule.utils';
import {
  formatIstanbulTime, instantToIstanbulCalendarDateTime,
  instantToIstanbulPickerDate, istanbulWallClockToIso,
} from '../../shared/time/istanbul-date-time';

const schedules = [
  { id: 1, course_id: 1, class_id: 2, teacher_id: 3 },
  { id: 2, course_id: 2, class_id: 2, teacher_id: 4 },
  { id: 3, course_id: 1, class_id: 4, teacher_id: 4 },
];

describe('schedule utilities', () => {
  it('keeps the same course color stable', () => {
    expect(getCourseColor(1)).toBe(getCourseColor(1));
    expect(getCourseColor(1)).not.toBe(getCourseColor(2));
  });

  it('filters schedules by selected course, class and teacher', () => {
    expect(filterSchedules(schedules, { courseId: '1', classId: '2', teacherId: '' })).toEqual([schedules[0]]);
    expect(filterSchedules(schedules, { courseId: '', classId: '', teacherId: '4' })).toEqual([schedules[1], schedules[2]]);
  });

  it('creates a stable Istanbul day range without render-time milliseconds', () => {
    const reference = new Date('2026-08-04T21:30:45.678Z');

    expect(getInitialVisibleRange(reference)).toEqual({
      start: '2026-07-28T21:00:00.000Z',
      end: '2026-09-08T21:00:00.000Z',
    });
    expect(getInitialVisibleRange(reference)).toEqual(getInitialVisibleRange(reference));
  });
});

describe('Istanbul schedule time utilities', () => {
  it('sends a selected Istanbul noon as a UTC instant', () => {
    expect(istanbulWallClockToIso('2026-08-04 12:00:00')).toBe('2026-08-04T09:00:00.000Z');
  });

  it('rejects malformed and impossible wall-clock values', () => {
    expect(istanbulWallClockToIso('2026-08-04 12:00 trailing')).toBeNull();
    expect(istanbulWallClockToIso('2026-02-30 12:00:00')).toBeNull();
    expect(istanbulWallClockToIso('2026-08-04 24:00:00')).toBeNull();
  });

  it('preserves milliseconds while converting wall-clock time', () => {
    expect(istanbulWallClockToIso('2026-08-04 12:00:00.123')).toBe('2026-08-04T09:00:00.123Z');
  });

  it('renders the API instant as noon for calendar, picker and attendance', () => {
    const instant = '2026-08-04T09:00:00.000Z';
    expect(instantToIstanbulCalendarDateTime(instant)).toBe('2026-08-04T12:00:00');
    const pickerDate = instantToIstanbulPickerDate(instant);
    expect([pickerDate.getFullYear(), pickerDate.getMonth() + 1, pickerDate.getDate(), pickerDate.getHours()]).toEqual([2026, 8, 4, 12]);
    expect(formatIstanbulTime(instant, 'en-GB')).toBe('12:00');
  });
});
