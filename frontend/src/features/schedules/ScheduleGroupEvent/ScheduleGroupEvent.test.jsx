import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ScheduleGroupEvent } from './ScheduleGroupEvent';

afterEach(cleanup);

it('opens an accessible lesson list and selects the requested schedule', async () => {
  const onSelectSchedule = vi.fn();
  const schedules = [
    { id: 2, course_name: 'Physics', class_name: 'Science-2', teacher_name: 'Ayşe Kaya' },
    { id: 1, course_name: 'Mathematics', class_name: 'Science-1', teacher_name: 'Mehmet Demir' },
  ];
  const event = {
    extendedProps: {
      schedules,
      start_time: '2026-08-10T06:00:00.000Z',
      end_time: '2026-08-10T07:00:00.000Z',
    },
  };
  const t = (key, values) => {
    if (key === 'simultaneousLessons') return `${values.count} simultaneous lessons`;
    return `Open ${values.count} simultaneous lessons at ${values.time}`;
  };

  render(<MantineProvider><ScheduleGroupEvent event={event} locale="en-GB" onSelectSchedule={onSelectSchedule} t={t} /></MantineProvider>);
  fireEvent.click(screen.getByRole('button', { name: /Open 2 simultaneous lessons/ }));

  expect(await screen.findByText('Science-1 · Mehmet Demir')).toBeInTheDocument();
  expect(screen.getByText('Science-2 · Ayşe Kaya')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Mathematics · Science-1 · Mehmet Demir'));
  expect(onSelectSchedule).toHaveBeenCalledWith(1);
});
