import { Alert, Button, SimpleGrid, Text, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '../../components/ui/PageLoader';
import { useAuth } from '../auth/use-auth';
import { dashboardApi } from './dashboard.api';
import { cachePolicy } from '../../lib/cache-policy';
import { queryKeys } from '../../lib/query-keys';

const resources = [['users', 'totalUsers'], ['courses', 'totalCourses'], ['classes', 'totalClasses'], ['schedules', 'totalSchedules']];

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const query = useQuery({ queryKey: queryKeys.dashboard.summary, queryFn: dashboardApi.getSummary, staleTime: cachePolicy.dashboard });
  if (query.isLoading) return <PageLoader />;
  if (query.isError) return <Alert icon={<IconAlertCircle size={18} />} color="red">{t('errors.GENERIC')} <Button variant="subtle" size="compact-sm" onClick={() => query.refetch()}>{t('retry')}</Button></Alert>;
  return <div><Title order={1} className="text-2xl">{t('welcome', { name: user.name })}</Title><SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mt="lg">{resources.map(([key, label]) => <div key={key} className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-dark-5 dark:bg-dark-7"><Text size="sm" c="dimmed">{t(label)}</Text><Text size="2rem" fw={700} mt="xs">{query.data[key]}</Text></div>)}</SimpleGrid></div>;
}
