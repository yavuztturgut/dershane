import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const lookups = {
  roles: [{ id: 1, name: 'admin' }, { id: 2, name: 'teacher' }],
  classes: [{ id: 1, name: 'Class A' }],
};
vi.mock('../../lookups/use-lookups', () => ({ useLookups: () => ({ data: lookups, isLoading: false, isError: false }) }));

const firstPage = { items: [{ id: 1, name: 'Ada', email: 'ada@example.com', role_id: 1, class_id: null, is_active: true }], page: 1, totalPages: 1 };
const getPage = vi.fn(async () => firstPage);
vi.mock('../users.api', () => ({ usersApi: { getPage: (...args) => getPage(...args), getById: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }));

import { UsersPage } from './UsersPage';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<MantineProvider><QueryClientProvider client={client}><ModalsProvider><MemoryRouter initialEntries={['/users']}><UsersPage /></MemoryRouter></ModalsProvider></QueryClientProvider></MantineProvider>);
}

describe('UsersPage filtering', () => {
  afterEach(() => {
    cleanup();
    getPage.mockReset();
    getPage.mockResolvedValue(firstPage);
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
});
