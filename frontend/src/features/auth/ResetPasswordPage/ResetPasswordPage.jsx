import { Anchor, Button, PasswordInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../auth.api';
import { notifyError } from '../../../shared/notifications/notifications';
import { getErrorMessage } from '../../../shared/api/api-client';
import { AuthLayout } from '../AuthLayout/AuthLayout';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const form = useForm({
    initialValues: { password: '', confirm: '' },
    validate: {
      password: (value) => value.length >= 8 ? null : t('errors.PASSWORD_TOO_SHORT'),
      confirm: (value, values) => value === values.password ? null : t('errors.PASSWORD_MISMATCH'),
    },
  });

  async function submit(values) {
    try {
      await authApi.resetPassword({ token, new_password: values.password });
      notifications.show({ color: 'green', message: t('passwordResetSuccess') });
      navigate('/login');
    } catch (error) {
      notifyError(getErrorMessage(error));
    }
  }

  return <AuthLayout title={t('resetPassword')}><form onSubmit={form.onSubmit(submit)}><PasswordInput label={t('newPassword')} required mt="lg" {...form.getInputProps('password')} /><PasswordInput label={t('confirmPassword')} required mt="md" {...form.getInputProps('confirm')} /><Button fullWidth type="submit" mt="lg" disabled={!token}>{t('save')}</Button></form><Anchor component={Link} to="/login" size="sm" mt="lg" display="inline-block">{t('backToLogin')}</Anchor></AuthLayout>;
}
