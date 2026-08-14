import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const attendanceCss = readFileSync(resolve(process.cwd(), 'src/features/attendance/AttendancePage/AttendancePage.module.css'), 'utf8');

vi.mock('../../auth/use-auth', () => ({ useAuth: () => ({ user: { id: 1, role_name: 'admin' } }) }));
vi.mock('../../lookups/lookups.api', () => ({ lookupsApi: { getAll: vi.fn(async () => ({ roles: [], classes: [{ id: 1, name: 'Class A' }], courses: [], teachers: [] })) } }));
vi.mock('../../users/users.api', () => ({ usersApi: { getOptions: vi.fn(async () => [{ id: 5, name: 'Ada', class_id: 1 }]) } }));

const report = {
  days: [
    {
      date: '2026-08-03', lesson_count: 2, attendance_taken_count: 1,
      schedules: [
        { schedule_id: 11, start_time: '2026-08-03T05:00:00.000Z', end_time: '2026-08-03T06:00:00.000Z', course_name: 'Math', class_name: 'Class A', teacher_name: 'Teacher A', attendance_taken: true, counts: { present: 1, absent: 0, late: 0, excused: 0, not_recorded: 0 } },
        { schedule_id: 12, start_time: '2026-08-03T07:00:00.000Z', end_time: '2026-08-03T08:00:00.000Z', course_name: 'Physics', class_name: 'Class A', teacher_name: 'Teacher A', attendance_taken: false, counts: { present: 0, absent: 0, late: 0, excused: 0, not_recorded: 1 } },
      ],
    },
    {
      date: '2026-08-02', lesson_count: 1, attendance_taken_count: 0,
      schedules: [{ schedule_id: 10, start_time: '2026-08-02T05:00:00.000Z', end_time: '2026-08-02T06:00:00.000Z', course_name: 'History', class_name: 'Class A', teacher_name: 'Teacher B', attendance_taken: false, counts: { present: 0, absent: 0, late: 0, excused: 0, not_recorded: 1 } }],
    },
  ],
  page: 1, pageSize: 7, totalDays: 2, totalPages: 1,
};
const getDailyReport = vi.fn(async () => report);
vi.mock('../attendance.api', () => ({
  attendanceApi: { getDailyReport: (...args) => getDailyReport(...args), getMine: vi.fn() },
}));
vi.mock('../AttendanceEditor/AttendanceEditor', async () => {
  return {
    AttendanceEditor: function AttendanceEditorMock({ scheduleId, studentId, onDirtyChange, onSaved }) {
      return <div data-testid={`editor-${scheduleId}`}>
        Editor {scheduleId} student {studentId || 'all'}
        <button type="button" onClick={() => onDirtyChange?.(true)}>Mark dirty {scheduleId}</button>
        <button type="button" onClick={() => onSaved?.()}>Save mock {scheduleId}</button>
      </div>;
    },
  };
});

import { AttendancePage } from './AttendancePage';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MantineProvider><QueryClientProvider client={client}><ModalsProvider><MemoryRouter><AttendancePage /></MemoryRouter></ModalsProvider></QueryClientProvider></MantineProvider>);
}

describe('AttendancePage daily admin report', () => {
  beforeEach(() => getDailyReport.mockClear());
  afterEach(cleanup);

  it('defines a primary-color top stripe for an active lesson without changing its layout', () => {
    expect(attendanceCss).toContain('.lesson[data-active]::before');
    expect(attendanceCss).toContain('height: .1875rem');
    expect(attendanceCss).toContain('background: var(--mantine-primary-color-filled)');
    expect(attendanceCss).toContain('position: absolute');
  });

  it('defines a green top stripe for an active day', () => {
    expect(attendanceCss).toContain('.day[data-active]::before');
    expect(attendanceCss).toContain('background: var(--mantine-color-green-5)');
  });

  it('keeps days closed initially, then lazy-loads an opened lesson', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: /Monday, August 3, 2026/ })).toBeInTheDocument();
    expect(screen.queryByTestId('editor-11')).not.toBeInTheDocument();
    expect(screen.queryByTestId('editor-12')).not.toBeInTheDocument();
    expect(screen.queryByTestId('editor-10')).not.toBeInTheDocument();
    expect(getDailyReport).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 7 }));

    fireEvent.click(screen.getByRole('button', { name: /Monday, August 3, 2026/ }));
    fireEvent.click(await screen.findByRole('button', { name: /10:00.*Physics/ }));
    expect(await screen.findByTestId('editor-12')).toBeInTheDocument();
  });

  it('keeps a dirty lesson open until discard is confirmed', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Monday, August 3, 2026/ }));
    await user.click(screen.getByRole('button', { name: /08:00.*Math/ }));
    await user.click(await screen.findByRole('button', { name: 'Mark dirty 11' }));
    await user.click(screen.getByRole('button', { name: /08:00.*Math/ }));

    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByTestId('editor-11')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue editing' }));
    expect(screen.getByTestId('editor-11')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /08:00.*Math/ }));
    await user.click(await screen.findByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(screen.queryByTestId('editor-11')).not.toBeInTheDocument());
  });

  it('passes the selected student into the opened editor without a duplicate report refresh after save', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Monday, August 3, 2026/ }));
    await user.click(screen.getByRole('button', { name: /08:00.*Math/ }));
    await screen.findByTestId('editor-11');
    await user.click(screen.getByPlaceholderText('Student'));
    await user.click(await screen.findByText('Ada'));

    expect(await screen.findByText('Editor 11 student 5')).toBeInTheDocument();
    expect(getDailyReport).toHaveBeenLastCalledWith(expect.objectContaining({ student_id: '5', pageSize: 7 }));
    const requestCountBeforeSave = getDailyReport.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Save mock 11' }));
    await waitFor(() => expect(getDailyReport).toHaveBeenCalledTimes(requestCountBeforeSave));
  });

  it('keeps the previous report visible without a spinner while a filter request is pending', async () => {
    let resolveFilteredReport;
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Monday, August 3, 2026/ }));
    fireEvent.click(await screen.findByRole('button', { name: /08:00.*Math/ }));
    expect(await screen.findByTestId('editor-11')).toBeInTheDocument();
    getDailyReport.mockImplementationOnce(() => new Promise((resolve) => { resolveFilteredReport = resolve; }));

    const user = userEvent.setup();
    await user.click(screen.getByPlaceholderText('Class'));
    await user.click(await screen.findByText('Class A'));
    await waitFor(() => expect(getDailyReport).toHaveBeenCalledTimes(2));

    expect(screen.getByTestId('editor-11')).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('editor-11').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true');

    const filteredReport = {
      ...report,
      days: [{
        ...report.days[0],
        date: '2026-08-04',
        schedules: [{ ...report.days[0].schedules[0], schedule_id: 99 }],
      }],
    };
    await act(async () => resolveFilteredReport(filteredReport));
    expect(screen.queryByTestId('editor-99')).not.toBeInTheDocument();
  });
});
