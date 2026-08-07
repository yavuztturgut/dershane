import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@mantine/charts', () => ({
  BarChart: ({ data }) => <div data-testid="attendance-chart">{data.length} days</div>,
}));

vi.mock('../../auth/use-auth', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Admin', role_name: 'admin' } }),
}));

const getSummary = vi.fn();
vi.mock('../dashboard.api', () => ({
  dashboardApi: { getSummary: (...args) => getSummary(...args) },
}));

import { DashboardPage } from './DashboardPage';

const summary = {
  users: 12,
  courses: 9,
  classes: 4,
  schedules: 6,
  today: { lessons: 2, remaining: 1, attendanceCompleted: 0, attendanceMissing: 1 },
  todaySchedules: [
    {
      id: 1,
      start_time: '2026-08-06T06:00:00.000Z',
      end_time: '2026-08-06T07:00:00.000Z',
      course_name: 'Mathematics',
      class_name: 'Class A',
      teacher_name: 'Teacher One',
      student_count: 10,
      recorded_count: 4,
      temporal_status: 'ended',
      attendance_status: 'missing',
    },
    {
      id: 2,
      start_time: '2026-08-06T10:00:00.000Z',
      end_time: '2026-08-06T11:00:00.000Z',
      course_name: 'Physics',
      class_name: 'Class B',
      teacher_name: 'Teacher Two',
      student_count: 8,
      recorded_count: 0,
      temporal_status: 'upcoming',
      attendance_status: 'not_due',
    },
  ],
  weeklyAttendance: [
    { date: '2026-08-05', completed: 2, missing: 1 },
    { date: '2026-08-06', completed: 0, missing: 1 },
  ],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter><DashboardPage /></MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  );
}

describe('DashboardPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    getSummary.mockReset();
    getSummary.mockResolvedValue(summary);
  });

  it('loads the dashboard once and renders operational sections', async () => {
    renderPage();

    expect(await screen.findByText("Today's schedule")).toBeInTheDocument();
    expect(getSummary).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('Mathematics')).toHaveLength(2);
    expect(screen.getByTestId('attendance-chart')).toHaveTextContent('2 days');
    const quickActionsToggle = screen.getByRole('button', { name: /Quick actions/ });
    expect(quickActionsToggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('#dashboard-quick-actions')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(quickActionsToggle);
    expect(quickActionsToggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('#dashboard-quick-actions')).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByRole('button', { name: /Add student/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add teacher/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add lesson/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select attendance/ })).toBeInTheDocument();
    fireEvent.click(quickActionsToggle);
    expect(quickActionsToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('System summary')).toBeInTheDocument();
  });

  it('limits dashboard schedule lists to three items and reports the hidden totals', async () => {
    const extraSchedules = [3, 4, 5].map((id) => ({
      ...summary.todaySchedules[0],
      id,
      course_name: `Course ${id}`,
      start_time: `2026-08-06T0${id}:00:00.000Z`,
      end_time: `2026-08-06T0${id + 1}:00:00.000Z`,
    }));
    getSummary.mockResolvedValue({ ...summary, todaySchedules: [...summary.todaySchedules, ...extraSchedules] });
    renderPage();

    expect(await screen.findByText('+2 more lessons')).toBeInTheDocument();
    expect(screen.getByText('+1 more missing attendance')).toBeInTheDocument();
  });

  it('renders positive empty states when there are no lessons', async () => {
    getSummary.mockResolvedValue({
      ...summary,
      today: { lessons: 0, remaining: 0, attendanceCompleted: 0, attendanceMissing: 0 },
      todaySchedules: [],
      weeklyAttendance: summary.weeklyAttendance.map((item) => ({ ...item, completed: 0, missing: 0 })),
    });
    renderPage();

    expect(await screen.findByText('No lessons are scheduled for today.')).toBeInTheDocument();
    expect(screen.getByText('There is no missing attendance today.')).toBeInTheDocument();
    expect(screen.getByText('There are no finished lessons in the last 7 days.')).toBeInTheDocument();
  });
});
