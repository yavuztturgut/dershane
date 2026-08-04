import { Anchor, Button, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../auth.api';
import { notifyError } from '../../../shared/notifications/notifications';
import { getErrorMessage } from '../../../shared/api/api-client';
import { AuthLayout } from '../AuthLayout/AuthLayout';

export function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const form = useForm({ initialValues: { email: '' }, validate: { email: (value) => /^\S+@\S+\.\S+$/.test(value) ? null : t('errors.INVALID_EMAIL') } });

  async function submit(values) {
    try {
      await authApi.forgotPassword({ ...values, language: i18n.resolvedLanguage === 'tr' ? 'tr' : 'en' });
      notifications.show({ color: 'green', message: t('resetEmailSent') });
    } catch (error) {
      notifyError(getErrorMessage(error));
    }
  }

  return <AuthLayout title={t('forgotPassword')} description={t('forgotPasswordHelp')}><form onSubmit={form.onSubmit(submit)}><TextInput label={t('email')} required mt="lg" {...form.getInputProps('email')} /><Button fullWidth type="submit" mt="lg">{t('sendResetLink')}</Button></form><Anchor component={Link} to="/login" size="sm" mt="lg" display="inline-block">{t('backToLogin')}</Anchor></AuthLayout>;
}
