import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getForSchedule = vi.fn();
const saveForSchedule = vi.fn(async () => ({}));

vi.mock('./attendance.api', () => ({
  attendanceApi: {
    getForSchedule: (...args) => getForSchedule(...args),
    saveForSchedule: (...args) => saveForSchedule(...args),
  },
}));

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

import { AttendanceEditor } from './AttendanceEditor';

const records = [
  { student_id: 1, student_name: 'Ada One', email: 'ada@example.com', status: null },
  { student_id: 2, student_name: 'Bora Two', email: 'bora@example.com', status: null },
];

function renderEditor(props = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const ref = createRef();
  render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <AttendanceEditor ref={ref} scheduleId={9} {...props} />
      </QueryClientProvider>
    </MantineProvider>,
  );
  return ref;
}

describe('AttendanceEditor quick marking', () => {
  beforeEach(() => {
    getForSchedule.mockResolvedValue({ records });
    getForSchedule.mockClear();
    saveForSchedule.mockClear();
  });
  afterEach(cleanup);

  it('starts unrecorded students as absent without marking the editor dirty', async () => {
    const onDirtyChange = vi.fn();
    renderEditor({ onDirtyChange });

    expect((await screen.findAllByRole('combobox')).map((select) => select.value)).toEqual(['Absent', 'Absent']);
    expect(screen.getByRole('checkbox', { name: 'Mark Ada One present' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Mark Bora Two present' })).not.toBeChecked();
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
  });

  it('marks one student present in one click and exposes a mixed bulk state', async () => {
    const user = userEvent.setup();
    renderEditor();
    const studentCheckbox = await screen.findByRole('checkbox', { name: 'Mark Ada One present' });
    await user.click(studentCheckbox);

    expect(studentCheckbox).toBeChecked();
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('Present');
    expect(screen.getByRole('checkbox', { name: 'Mark all present' }).indeterminate).toBe(true);
  });

  it('marks all students present or absent and saves the resulting statuses', async () => {
    const ref = renderEditor();
    const bulkCheckbox = await screen.findByRole('checkbox', { name: 'Mark all present' });

    fireEvent.click(bulkCheckbox);
    expect(screen.getByRole('checkbox', { name: 'Mark Ada One present' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Mark Bora Two present' })).toBeChecked();
    ref.current.save();
    await waitFor(() => expect(saveForSchedule).toHaveBeenCalledWith(9, [
      { student_id: 1, status: 'present' },
      { student_id: 2, status: 'present' },
    ]));

    fireEvent.click(bulkCheckbox);
    expect(screen.getAllByRole('combobox').map((select) => select.value)).toEqual(['Absent', 'Absent']);
  });

  it('leaves the quick checkbox empty for late and excused statuses', async () => {
    getForSchedule.mockResolvedValue({ records: [
      { ...records[0], status: 'late' },
      { ...records[1], status: 'excused' },
    ] });
    renderEditor();

    expect((await screen.findAllByRole('combobox')).map((select) => select.value)).toEqual(['Late', 'Excused']);
    expect(screen.getByRole('checkbox', { name: 'Mark Ada One present' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Mark Bora Two present' })).not.toBeChecked();
  });

  it('clears the checkbox when a non-present status is selected', async () => {
    const user = userEvent.setup();
    renderEditor();
    const studentCheckbox = await screen.findByRole('checkbox', { name: 'Mark Ada One present' });
    fireEvent.click(studentCheckbox);

    const firstStatus = screen.getAllByRole('combobox')[0];
    await user.click(firstStatus);
    const listbox = document.getElementById(firstStatus.getAttribute('aria-controls'));
    await user.click(within(listbox).getByText('Late'));

    expect(studentCheckbox).not.toBeChecked();
    expect(firstStatus).toHaveValue('Late');
  });
});
