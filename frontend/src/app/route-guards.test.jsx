import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();

vi.mock('../features/auth/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

import { RoleRoute } from './route-guards';

describe('RoleRoute', () => {
  it('redirects a student away from an admin route', () => {
    useAuthMock.mockReturnValue({ user: { role_name: 'student' } });

    render(
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route element={<RoleRoute roles={['admin']} />}><Route path="/users" element={<p>Users</p>} /></Route>
          <Route path="/schedules" element={<p>My schedule</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('My schedule')).toBeInTheDocument();
  });
});
