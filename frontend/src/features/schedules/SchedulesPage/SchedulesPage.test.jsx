import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

let calendarMountCount = 0;

vi.mock('@fullcalendar/react', async () => {
  const React = await import('react');
  const { getInitialVisibleRange } = await import('../schedule.utils');
  const { instantToIstanbulPickerDate } = await import('../../../shared/time/istanbul-date-time');
  return {
    default: React.forwardRef(function CalendarMock(props, ref) {
      const initialProps = React.useRef({ datesSet: props.datesSet, initialView: props.initialView });
      React.useEffect(() => {
        calendarMountCount += 1;
        const range = getInitialVisibleRange(initialProps.current.initialView);
        initialProps.current.datesSet({
          start: instantToIstanbulPickerDate(range.start),
          end: instantToIstanbulPickerDate(range.end),
          view: { title: 'Initial range' },
        });
      }, []);
      React.useImperativeHandle(ref, () => ({ getApi: () => ({
        changeView: vi.fn(),
        prev: vi.fn(),
        next: () => props.datesSet({ startStr: '2026-08-10T00:00:00', endStr: '2026-08-17T00:00:00', view: { title: '10–16 August 2026' } }),
        today: vi.fn(),
      }) }));
      return <button type="button" data-initial-view={props.initialView} data-event-min-height={String(props.eventMinHeight)} data-slot-event-overlap={String(props.slotEventOverlap)} onClick={() => props.eventClick({ event: { id: '1' } })}>Open lesson</button>;
    }),
  };
});
vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/timegrid', () => ({ default: {} }));
vi.mock('@fullcalendar/interaction', () => ({ default: {} }));

let currentUser = { id: 1, name: 'Admin', role_name: 'admin' };
vi.mock('../../auth/use-auth', () => ({ useAuth: () => ({ user: currentUser }) }));

const schedule = { id: 1, course_id: 1, course_name: 'Turkish', class_id: 1, class_name: 'Verbal', teacher_id: 2, teacher_name: 'Teacher', start_time: '2026-08-03T05:00:00.000Z', end_time: '2026-08-03T06:00:00.000Z' };
const getSchedules = vi.fn(async () => [schedule]);
const updateSchedule = vi.fn(async () => schedule);
vi.mock('../schedules.api', () => ({
  schedulesApi: { getAll: (...args) => getSchedules(...args), getById: vi.fn(async () => schedule), create: vi.fn(), update: (...args) => updateSchedule(...args), remove: vi.fn() },
}));
const getLookups = vi.fn(async () => ({
  roles: [{ id: 2, name: 'teacher' }],
  classes: [{ id: 1, name: 'Verbal' }],
  courses: [{ id: 1, name: 'Turkish' }],
  teachers: [{ id: 2, name: 'Teacher' }],
}));
vi.mock('../../lookups/lookups.api', () => ({ lookupsApi: { getAll: (...args) => getLookups(...args) } }));

const getAttendance = vi.fn(async () => ({
  records: [{ student_id: 7, student_name: 'Student One', email: 'student@example.com', status: 'present' }],
}));
const saveAttendance = vi.fn(async () => ({}));
vi.mock('../../attendance/attendance.api', () => ({
  attendanceApi: { getForSchedule: (...args) => getAttendance(...args), saveForSchedule: (...args) => saveAttendance(...args) },
}));
vi.mock('../../attendance/AttendanceEditor/AttendanceEditor', async () => {
  const React = await import('react');
  return {
    AttendanceEditor: React.forwardRef(function AttendanceEditorMock({ onDirtyChange, onSavingChange, onCanSaveChange }, ref) {
      const [status, setStatus] = React.useState('present');
      React.useEffect(() => { onSavingChange?.(false); onCanSaveChange?.(true); }, [onCanSaveChange, onSavingChange]);
      React.useImperativeHandle(ref, () => ({ save: () => onDirtyChange?.(false) }), [onDirtyChange]);
      return <><span>Student One</span><select aria-label="Status" value={status} onChange={(event) => { setStatus(event.target.value); onDirtyChange?.(true); }}><option value="present">Present</option><option value="absent">Absent</option></select></>;
    }),
  };
});

import { SchedulesPage } from './SchedulesPage';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <ModalsProvider><MemoryRouter><SchedulesPage /></MemoryRouter></ModalsProvider>
      </QueryClientProvider>
    </MantineProvider>,
  );
}

async function openLesson() {
  fireEvent.click(await screen.findByRole('button', { name: 'Open lesson' }));
  return screen.findByTestId('dual-panel-modal');
}

describe('SchedulesPage lesson modal', () => {
  afterEach(cleanup);

  beforeEach(() => {
    currentUser = { id: 1, name: 'Admin', role_name: 'admin' };
    getAttendance.mockClear();
    saveAttendance.mockClear();
    getSchedules.mockClear();
    updateSchedule.mockClear();
    getLookups.mockClear();
    calendarMountCount = 0;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
  });

  it('expands the mobile filter drawer and exposes its controls', async () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(max-width: 48rem)', media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    renderPage();

    const calendar = await screen.findByRole('button', { name: 'Open lesson' });
    expect(calendar).toHaveAttribute('data-initial-view', 'timeGridDay');
    await waitFor(() => expect(getSchedules).toHaveBeenCalledTimes(1));
    const filterButton = await screen.findByRole('button', { name: /Filters/ });
    expect(filterButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(filterButton);
    expect(filterButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('responsive-filter-body')).toHaveAttribute('data-open');
    expect(screen.getByRole('combobox', { name: 'Filter by course' })).toBeInTheDocument();
  });

  it('keeps genuine overlaps side by side without forcing short adjacent lessons to collide', async () => {
    renderPage();
    const calendar = await screen.findByRole('button', { name: 'Open lesson' });
    expect(calendar).toHaveAttribute('data-initial-view', 'timeGridWeek');
    await waitFor(() => expect(getSchedules).toHaveBeenCalledTimes(1));
    expect(calendar).toHaveAttribute('data-slot-event-overlap', 'false');
    expect(calendar).toHaveAttribute('data-event-min-height', '24');
  });

  it('keeps the calendar mounted while loading a newly navigated date range', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Open lesson' });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByText('10–16 August 2026')).toBeInTheDocument());
    expect(calendarMountCount).toBe(1);
  });

  it('loads all admin reference data with one lookup request', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Open lesson' });
    expect(getLookups).toHaveBeenCalledTimes(1);
  });

  it('opens admin details and attendance in one dual panel, then enters edit mode', async () => {
    renderPage();
    const modal = await openLesson();

    expect(within(modal).queryByLabelText('Loading')).not.toBeInTheDocument();
    expect(within(modal).getAllByText('Schedule details').length).toBeGreaterThan(0);
    expect(within(modal).getAllByText('Attendance').length).toBeGreaterThan(0);
    expect(await within(modal).findByText('Student One')).toBeInTheDocument();
    expect(within(modal).getByTestId('dual-panel-left')).toBeInTheDocument();
    expect(within(modal).getByTestId('dual-panel-right')).toBeInTheDocument();

    fireEvent.click(within(modal).getByRole('button', { name: 'Edit' }));
    expect(await within(modal).findByDisplayValue('Turkish')).toBeInTheDocument();
  });

  it('keeps attendance state and the modal open after an admin saves lesson edits', async () => {
    renderPage();
    const modal = await openLesson();
    const attendanceSelect = await screen.findByRole('combobox', { name: 'Status' });
    fireEvent.change(attendanceSelect, { target: { value: 'absent' } });

    fireEvent.click(within(modal).getByRole('button', { name: 'Edit' }));
    expect(await within(modal).findByDisplayValue('Turkish')).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateSchedule).toHaveBeenCalled());
    expect(updateSchedule).toHaveBeenCalledWith(1, expect.objectContaining({
      start_time: '2026-08-03T05:00:00.000Z',
      end_time: '2026-08-03T06:00:00.000Z',
    }));
    expect(screen.getByTestId('dual-panel-modal')).toBeInTheDocument();
    expect(within(screen.getByTestId('dual-panel-modal')).getByDisplayValue('Absent')).toBeInTheDocument();
  });

  it('asks before closing when attendance is dirty', async () => {
    renderPage();
    const modal = await openLesson();
    fireEvent.change(await screen.findByRole('combobox', { name: 'Status' }), { target: { value: 'absent' } });
    fireEvent.click(within(modal).getAllByRole('button', { name: 'Close' }).at(-1));
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue editing' })).toBeInTheDocument();
  });

  it('shows only the single details modal and never loads attendance for a student', async () => {
    currentUser = { id: 7, name: 'Student One', role_name: 'student' };
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Open lesson' }));

    expect(await screen.findByText('Schedule details')).toBeInTheDocument();
    expect(screen.queryByTestId('dual-panel-modal')).not.toBeInTheDocument();
    expect(getAttendance).not.toHaveBeenCalled();
  });
});
