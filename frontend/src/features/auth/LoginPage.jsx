import { Button, Paper, PasswordInput, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './auth-context';
import { getErrorMessage } from '../../lib/api-client';
import { notifyError } from '../../lib/notifications';
import { PageLoader } from '../../components/ui/PageLoader';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading, login, isLoggingIn } = useAuth();
  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: { email: (value) => /^\S+@\S+\.\S+$/.test(value) ? null : t('errors.INVALID_EMAIL'), password: (value) => value ? null : t('errors.REQUIRED') },
  });

  if (isLoading) return <PageLoader fullPage />;
  if (user) return <Navigate to={user.role_name === 'admin' ? '/' : '/schedules'} replace />;

  async function handleSubmit(values) {
    try {
      const loggedInUser = await login(values);
      navigate(loggedInUser.role_name === 'admin' ? '/' : '/schedules');
    } catch (error) {
      notifyError(getErrorMessage(error));
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 px-4 dark:bg-dark-8">
      <Paper withBorder shadow="sm" p="xl" className="w-full max-w-md">
        <Title order={1} className="text-2xl">{t('appName')}</Title>
        <Text c="dimmed" mt="xs">{t('login')}</Text>
        <form onSubmit={form.onSubmit(handleSubmit)} className="mt-6">
          <TextInput label={t('email')} required {...form.getInputProps('email')} />
          <PasswordInput label={t('password')} required mt="md" {...form.getInputProps('password')} />
          <Button type="submit" fullWidth mt="xl" loading={isLoggingIn}>{t('login')}</Button>
        </form>
      </Paper>
    </main>
  );
}
