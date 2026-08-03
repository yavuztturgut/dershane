import { Anchor, Button, Group, PasswordInput, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './use-auth';
import { getErrorMessage } from '../../lib/api-client';
import { notifyError } from '../../lib/notifications';
import { PageLoader } from '../../components/ui/PageLoader';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import loginIllustration from '../../assets/login.png';

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
    <main className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-dark-8 sm:px-6 lg:grid lg:grid-cols-[30fr_70fr] lg:p-0">
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center lg:min-h-screen lg:px-8">
        <div className="absolute right-0 top-0 z-10 lg:right-8 lg:top-8">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md lg:w-4/5 lg:max-w-sm xl:max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <div className="grid size-20 place-items-center rounded-3xl bg-blue-50 dark:bg-dark-8">
              <img src={loginIllustration} alt="" className="h-12 w-14 object-contain" />
            </div>
          </div>

          <Title order={1} className="text-3xl font-bold tracking-tight">{t('appName')}</Title>
          <Text c="dimmed" mt="xs">{t('loginSubtitle')}</Text>

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
        </div>
      </section>

      <section className="relative hidden min-h-screen overflow-hidden bg-blue-600 lg:flex lg:items-center lg:justify-center">
        <div className="login-orb login-orb-one absolute -right-28 -top-28 size-96 rounded-full bg-white/10" />
        <div className="login-orb login-orb-two absolute -bottom-40 left-20 size-[34rem] rounded-full bg-blue-300/20" />
        <div className="login-orb login-orb-three absolute bottom-28 right-24 size-40 rounded-full border border-white/20" />
        <div className="absolute left-28 top-28 h-24 w-24 rounded-3xl border border-white/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_38%)] opacity-70" />

        <div className="relative z-10 mx-12 flex flex-col items-center text-center">
          <div className="grid size-56 place-items-center rounded-[2rem] bg-white shadow-2xl xl:size-64">
            <img src={loginIllustration} alt="" className="h-36 w-40 object-contain xl:h-44 xl:w-48" />
          </div>
          <Title order={2} className="mt-8 text-5xl font-bold tracking-tight text-white drop-shadow-sm">{t('appName')}</Title>
        </div>
      </section>
    </main>
  );
}
