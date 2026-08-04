import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./use-auth', () => ({ useAuth: () => ({ user: null, isLoading: false, login: vi.fn(), isLoggingIn: false }) }));
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('links to the real password recovery flow', () => {
    render(<MantineProvider><MemoryRouter><LoginPage /></MemoryRouter></MantineProvider>);
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('button', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument();
  });
});
