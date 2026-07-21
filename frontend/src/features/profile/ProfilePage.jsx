import { Paper, SimpleGrid, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/auth-context';

export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const fields = [
    [t('name'), user.name], [t('email'), user.email], [t('role'), user.role_name], [t('class'), user.class_name || '-'],
  ];

  return (
    <div className="max-w-3xl">
      <Title order={1} className="text-2xl" mb="lg">{t('profile')}</Title>
      <Paper withBorder p="lg">
        <Title order={2} className="text-lg">{t('accountDetails')}</Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} mt="lg">
          {fields.map(([label, value]) => <div key={label}><Text size="sm" c="dimmed">{label}</Text><Text fw={600}>{value}</Text></div>)}
        </SimpleGrid>
      </Paper>
    </div>
  );
}
