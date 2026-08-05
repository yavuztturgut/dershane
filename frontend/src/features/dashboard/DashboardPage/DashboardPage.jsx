import { Alert, Button, SimpleGrid } from '@mantine/core';
import { IconAlertCircle, IconBook2, IconCalendarEvent, IconSchool, IconUsers } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/use-auth';
import { dashboardApi } from '../dashboard.api';
import { cachePolicy } from '../../../shared/query/cache-policy';
import { queryKeys } from '../../../shared/query/query-keys';
import { PageHeader } from '../../../components/ui/PageHeader/PageHeader';
import { StatCard } from '../../../components/ui/StatCard/StatCard';
import { PageContainer } from '../../../components/layout/PageContainer/PageContainer';
import { useSuspendingQueries } from '../../../shared/query/use-suspending-queries';

const resources = [['users', 'totalUsers', IconUsers, 'blue'], ['courses', 'totalCourses', IconBook2, 'indigo'], ['classes', 'totalClasses', IconSchool, 'cyan'], ['schedules', 'totalSchedules', IconCalendarEvent, 'violet']];

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryOptions = { queryKey: queryKeys.dashboard.summary, queryFn: dashboardApi.getSummary, staleTime: cachePolicy.dashboard };
  const query = useQuery(queryOptions);
  useSuspendingQueries([{ query, options: queryOptions }]);
  if (query.isError) return <Alert icon={<IconAlertCircle size={18} />} color="red">{t('errors.GENERIC')} <Button variant="subtle" size="compact-sm" onClick={() => query.refetch()}>{t('retry')}</Button></Alert>;
  return <PageContainer><PageHeader title={t('welcome', { name: user.name })} description={t('dashboardDescription')} /><SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>{resources.map(([key, label, icon, color]) => <StatCard key={key} label={t(label)} value={query.data[key]} icon={icon} color={color} />)}</SimpleGrid></PageContainer>;
}
