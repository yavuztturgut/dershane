import { Anchor, Button, Paper, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from './auth.api';
import { notifyError } from '../../lib/notifications';
import { getErrorMessage } from '../../lib/api-client';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const form = useForm({ initialValues: { email: '' }, validate: { email: (value) => /^\S+@\S+\.\S+$/.test(value) ? null : t('errors.INVALID_EMAIL') } });

  async function submit(values) {
    try {
      await authApi.forgotPassword(values);
      notifications.show({ color: 'green', message: t('resetEmailSent') });
    } catch (error) {
      notifyError(getErrorMessage(error));
    }
  }

  return <main className="grid min-h-screen place-items-center bg-gray-50 p-4 dark:bg-dark-8"><Paper withBorder p="xl" className="w-full max-w-md"><Title order={1} className="text-2xl">{t('forgotPassword')}</Title><Text c="dimmed" mt="xs">{t('forgotPasswordHelp')}</Text><form onSubmit={form.onSubmit(submit)}><TextInput label={t('email')} required mt="lg" {...form.getInputProps('email')} /><Button fullWidth type="submit" mt="lg">{t('sendResetLink')}</Button></form><Anchor component={Link} to="/login" size="sm" mt="lg" display="inline-block">{t('backToLogin')}</Anchor></Paper></main>;
}
