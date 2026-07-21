import { describe, expect, it } from 'vitest';
import { filterSchedules, getCourseColor } from './schedule.utils';

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
});
