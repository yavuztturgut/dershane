import { AppShell, MantineProvider } from '@mantine/core';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
vi.mock('../../../features/auth/use-auth', () => ({ useAuth: () => useAuthMock() }));
import { AppSidebar } from './AppSidebar';
import styles from './AppSidebar.module.css';

function renderSidebar(user, collapsed = false) {
  useAuthMock.mockReturnValue({ user, logout: vi.fn() });
  return render(<MantineProvider><MemoryRouter><AppShell><AppSidebar collapsed={collapsed} onToggle={vi.fn()} onNavigate={vi.fn()} /></AppShell></MemoryRouter></MantineProvider>);
}

describe('AppSidebar role visibility', () => {
  beforeEach(() => localStorage.setItem('language', 'en'));
  afterEach(cleanup);
  it('shows admin management and attendance links', () => {
    renderSidebar({ name: 'Admin', role_name: 'admin' });
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();
  });
  it('shows admin links with courses between users and classes', () => {
    renderSidebar({ name: 'Admin', role_name: 'admin' });
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Dashboard',
      'Schedules',
      'Attendance',
      'Users',
      'Courses',
      'Classes',
      'Roles',
      'Profile',
    ]);
  });
  it('shows a student only personal destinations', () => {
    renderSidebar({ name: 'Student', role_name: 'student' });
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(screen.getByText('My Schedule')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();
  });
  it('stacks footer actions inside the collapsed sidebar', () => {
    renderSidebar({ name: 'Admin', role_name: 'admin' }, true);
    const actions = screen.getByTestId('collapsed-sidebar-actions');
    expect(within(actions).getByRole('button', { name: 'Language' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Dark' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });
  it('adds the pointed active shape only to the selected link when collapsed', () => {
    renderSidebar({ name: 'Admin', role_name: 'admin' }, true);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('data-active', 'true');
    expect(links[0]).toHaveClass(styles.collapsedActive);
    expect(links.slice(1).every((link) => !link.classList.contains(styles.collapsedActive))).toBe(true);
  });

  it('keeps the regular active shape when expanded', () => {
    renderSidebar({ name: 'Admin', role_name: 'admin' });
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass(styles.collapsedActive);
  });
});
