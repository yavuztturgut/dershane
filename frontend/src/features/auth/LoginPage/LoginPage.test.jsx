import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const authLayoutCss = readFileSync(resolve(process.cwd(), 'src/features/auth/AuthLayout/AuthLayout.module.css'), 'utf8');

vi.mock('../use-auth', () => ({ useAuth: () => ({ user: null, isLoading: false, login: vi.fn(), isLoggingIn: false }) }));
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('centers in the dynamic viewport while preserving a 100vh fallback', () => {
    expect(authLayoutCss).toContain('min-height: 100vh');
    expect(authLayoutCss).toContain('min-height: 100dvh');
    expect(authLayoutCss).toContain('place-items: center');
    expect(authLayoutCss).toContain('env(safe-area-inset-top)');
  });

  it('links to the real password recovery flow', () => {
    render(<MantineProvider><MemoryRouter><LoginPage /></MemoryRouter></MantineProvider>);
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('button', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument();
  });
});
