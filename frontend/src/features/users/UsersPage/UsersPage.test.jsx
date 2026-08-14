import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const usersPageCss = readFileSync(resolve(process.cwd(), 'src/features/users/UsersPage/UsersPage.module.css'), 'utf8');

const lookups = {
  roles: [{ id: 1, name: 'admin' }, { id: 2, name: 'teacher' }, { id: 3, name: 'student' }],
  classes: [{ id: 1, name: 'Class A' }],
};
vi.mock('../../lookups/use-lookups', () => ({
  getLookupsQueryOptions: () => ({ enabled: true }),
  useLookups: () => ({ data: lookups, isLoading: false, isError: false }),
}));

const firstPage = { items: [{ id: 1, name: 'Ada', email: 'ada@example.com', role_id: 1, class_id: null, status: 1 }], page: 1, total: 1, totalPages: 1 };
const getPage = vi.fn(async () => firstPage);
const restore = vi.fn(async (id) => ({ action: 'restored', user: { id, status: 1 } }));
const previewBulk = vi.fn(async () => ({ selected: 1, eligible: 1, skipped: 0, resolved_ids: [1] }));
const applyBulk = vi.fn(async () => ({ selected: 1, applied: 1, skipped: 0 }));
vi.mock('../users.api', () => ({ usersApi: { getPage: (...args) => getPage(...args), getById: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: (...args) => restore(...args), previewBulk: (...args) => previewBulk(...args), applyBulk: (...args) => applyBulk(...args) } }));

import { UsersPage } from './UsersPage';

function renderPage(initialEntries = ['/users']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<MantineProvider><QueryClientProvider client={client}><ModalsProvider><MemoryRouter initialEntries={initialEntries}><UsersPage /></MemoryRouter></ModalsProvider></QueryClientProvider></MantineProvider>);
}

describe('UsersPage filtering', () => {
  afterEach(() => {
    cleanup();
    getPage.mockReset();
    getPage.mockResolvedValue(firstPage);
    restore.mockClear();
    previewBulk.mockClear();
    applyBulk.mockClear();
  });

  it('keeps the bulk action bar fixed at the bottom of the viewport', () => {
    expect(usersPageCss).toContain('position: fixed');
    expect(usersPageCss).toContain('bottom: max(');
  });

  it('keeps the previous users visible without a spinner while a filter request is pending', async () => {
    let resolveFilteredPage;
    renderPage();
    expect(await screen.findAllByText('Ada')).not.toHaveLength(0);
    getPage.mockImplementationOnce(() => new Promise((resolve) => { resolveFilteredPage = resolve; }));

    const user = userEvent.setup();
    await user.click(screen.getByPlaceholderText('Role'));
    await user.click(await screen.findByText('teacher'));
    await waitFor(() => expect(getPage).toHaveBeenCalledTimes(2));

    expect(screen.getAllByText('Ada').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    expect(screen.getAllByText('Ada')[0].closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true');

    await act(async () => resolveFilteredPage({ items: [{ ...firstPage.items[0], id: 2, name: 'Grace', role_id: 2 }], page: 1, totalPages: 1 }));
    expect(await screen.findAllByText('Grace')).not.toHaveLength(0);
  });

  it('opens the edit modal with list data and no loading spinner', async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findAllByText('Ada');

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

    expect(screen.getByDisplayValue('ada@example.com')).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
  });

  it.each([
    ['student'],
    ['teacher'],
  ])('closes the %s create modal opened from a dashboard quick action', async (role) => {
    renderPage([{ pathname: '/users', state: { dashboardAction: { type: 'create-user', role } } }]);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByDisplayValue(role)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows deleted users only through the deleted filter and restores them', async () => {
    getPage.mockResolvedValueOnce(firstPage).mockResolvedValueOnce({
      items: [{ ...firstPage.items[0], status: -1 }], page: 1, totalPages: 1,
    });
    renderPage();
    await screen.findAllByText('Ada');

    const user = userEvent.setup();
    await user.click(screen.getByPlaceholderText('Status'));
    await user.click(await screen.findByText('Deleted'));

    const [restoreButton] = await screen.findAllByRole('button', { name: 'Restore' });
    expect(getPage).toHaveBeenLastCalledWith(expect.objectContaining({ status: '-1' }));
    await user.click(restoreButton);
    await waitFor(() => expect(restore.mock.calls[0]?.[0]).toBe(1));
  });

  it('previews and applies a bulk action to selected users', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('checkbox', { name: 'Select Ada' }))[0]);
    await user.click(screen.getByRole('button', { name: 'Bulk actions' }));
    await user.click(await screen.findByText('Deactivate'));

    expect(await screen.findByText('Eligible: 1')).toBeInTheDocument();
    expect(previewBulk).toHaveBeenCalledWith({ selector: { type: 'ids', ids: [1] }, action: { type: 'deactivate' } });
    await user.click(screen.getByRole('button', { name: 'Apply to Eligible' }));
    await waitFor(() => expect(applyBulk).toHaveBeenCalledWith({ resolved_ids: [1], action: { type: 'deactivate' } }));
  });

  it('can expand a page selection to all filtered results', async () => {
    getPage.mockResolvedValueOnce({ ...firstPage, total: 30, totalPages: 2 });
    renderPage(['/users?role_id=3']);
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('checkbox', { name: 'Select users on this page' }))[0]);
    await user.click(await screen.findByRole('button', { name: 'Select all 30 matching users' }));
    await user.click(screen.getByRole('button', { name: 'Bulk actions' }));
    await user.click(await screen.findByText('Activate'));

    await waitFor(() => expect(previewBulk).toHaveBeenCalledWith({
      selector: { type: 'filter', filters: { role_id: '3' }, excluded_ids: [] },
      action: { type: 'activate' },
    }));
  });
});
