import { Button, Group, PasswordInput, SimpleGrid, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/use-auth';
import { getErrorMessage } from '../../../shared/api/api-client';
import { notifyError, notifySuccess } from '../../../shared/notifications/notifications';
import { PageHeader } from '../../../components/ui/PageHeader/PageHeader';
import { Surface } from '../../../components/ui/Surface/Surface';
import { PageContainer } from '../../../components/layout/PageContainer/PageContainer';

export function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateProfile, isUpdatingProfile, changePassword, isChangingPassword } = useAuth();
  const profileForm = useForm({
    initialValues: { name: user.name, email: user.email },
    validate: { name: (value) => value.trim() ? null : t('errors.REQUIRED'), email: (value) => /^\S+@\S+\.\S+$/.test(value) ? null : t('errors.INVALID_EMAIL') },
  });
  const passwordForm = useForm({
    initialValues: { current_password: '', new_password: '', confirm: '' },
    validate: {
      current_password: (value) => value ? null : t('errors.REQUIRED'),
      new_password: (value) => value.length >= 8 ? null : t('errors.PASSWORD_TOO_SHORT'),
      confirm: (value, values) => value === values.new_password ? null : t('errors.PASSWORD_MISMATCH'),
    },
  });

  async function saveProfile(values) {
    try {
      await updateProfile(values);
      notifySuccess(t('updated'));
    } catch (error) { notifyError(getErrorMessage(error)); }
  }

  async function savePassword(values) {
    try {
      await changePassword({ current_password: values.current_password, new_password: values.new_password });
      notifySuccess(t('passwordChanged'));
      navigate('/login');
    } catch (error) { notifyError(getErrorMessage(error)); }
  }

  return <PageContainer><PageHeader title={t('profile')} description={t('profileDescription')} /><SimpleGrid cols={{ base: 1, md: 2 }}>
    <Surface p="lg"><Title order={2} className="text-lg">{t('accountDetails')}</Title><Text size="sm" c="dimmed" mt="xs">{t('role')}: {user.role_name} · {t('class')}: {user.class_name || '-'}</Text><form onSubmit={profileForm.onSubmit(saveProfile)}><TextInput label={t('name')} required mt="lg" {...profileForm.getInputProps('name')} /><TextInput label={t('email')} required mt="md" {...profileForm.getInputProps('email')} /><Group justify="flex-end" mt="lg"><Button type="submit" loading={isUpdatingProfile}>{t('save')}</Button></Group></form></Surface>
    <Surface p="lg"><Title order={2} className="text-lg">{t('changePassword')}</Title><form onSubmit={passwordForm.onSubmit(savePassword)}><PasswordInput label={t('currentPassword')} required mt="lg" {...passwordForm.getInputProps('current_password')} /><PasswordInput label={t('newPassword')} required mt="md" {...passwordForm.getInputProps('new_password')} /><PasswordInput label={t('confirmPassword')} required mt="md" {...passwordForm.getInputProps('confirm')} /><Group justify="flex-end" mt="lg"><Button type="submit" loading={isChangingPassword}>{t('changePassword')}</Button></Group></form></Surface>
  </SimpleGrid></PageContainer>;
}
