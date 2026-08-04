import { Anchor, Button, Group, PasswordInput, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../use-auth';
import { getErrorMessage } from '../../../shared/api/api-client';
import { notifyError } from '../../../shared/notifications/notifications';
import { PageLoader } from '../../../components/ui/PageLoader/PageLoader';
import { AuthLayout } from '../AuthLayout/AuthLayout';

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
    <AuthLayout title={t('appName')} description={t('loginSubtitle')} illustration>
          <form onSubmit={form.onSubmit(handleSubmit)} className="mt-8">
            <TextInput label={t('email')} required size="md" radius="md" {...form.getInputProps('email')} />
            <PasswordInput label={t('password')} required mt="md" size="md" radius="md" {...form.getInputProps('password')} />

            <Group justify="flex-end" mt="sm">
              <Anchor component={Link} to="/forgot-password" size="sm">
                {t('forgotPassword')}
              </Anchor>
            </Group>

            <Button type="submit" fullWidth mt="xl" size="md" radius="md" loading={isLoggingIn}>{t('login')}</Button>
          </form>
    </AuthLayout>
  );
}
