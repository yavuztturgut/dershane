import { MantineProvider } from '@mantine/core';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../app/i18n';

const forgotPassword = vi.fn(async () => ({}));
vi.mock('../auth.api', () => ({ authApi: { forgotPassword: (...args) => forgotPassword(...args) } }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn(), cleanQueue: vi.fn() } }));

import { ForgotPasswordPage } from './ForgotPasswordPage';

describe('ForgotPasswordPage', () => {
  afterEach(async () => {
    cleanup();
    forgotPassword.mockClear();
    await i18n.changeLanguage('en');
  });

  it('sends the language currently selected on the page', async () => {
    await i18n.changeLanguage('tr');
    const user = userEvent.setup();
    render(<MantineProvider><MemoryRouter><ForgotPasswordPage /></MemoryRouter></MantineProvider>);

    await user.type(screen.getByRole('textbox', { name: /E-posta/i }), 'yavuz@example.com');
    await user.click(screen.getByRole('button', { name: 'Sıfırlama bağlantısı gönder' }));

    await waitFor(() => expect(forgotPassword).toHaveBeenCalledWith({ email: 'yavuz@example.com', language: 'tr' }));
  });
});
