import { SimpleGrid, Text, Title } from '@mantine/core';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '../../components/ui/PageLoader';
import { useAuth } from '../auth/auth-context';
import { usersApi } from '../users/users.api';
import { coursesApi } from '../courses/courses.api';
import { classesApi } from '../classes/classes.api';
import { schedulesApi } from '../schedules/schedules.api';

const resources = [
  { key: 'users', api: usersApi, label: 'totalUsers' },
  { key: 'courses', api: coursesApi, label: 'totalCourses' },
  { key: 'classes', api: classesApi, label: 'totalClasses' },
  { key: 'schedules', api: schedulesApi, label: 'totalSchedules' },
];

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queries = useQueries({ queries: resources.map((resource) => ({ queryKey: [resource.key], queryFn: resource.api.getAll })) });

  if (queries.some((query) => query.isLoading)) return <PageLoader />;

  return (
    <div>
      <Title order={1} className="text-2xl">{t('welcome', { name: user.name })}</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mt="lg">
        {resources.map((resource, index) => <div key={resource.key} className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-dark-5 dark:bg-dark-7"><Text size="sm" c="dimmed">{t(resource.label)}</Text><Text size="2rem" fw={700} mt="xs">{queries[index].data?.length || 0}</Text></div>)}
      </SimpleGrid>
    </div>
  );
}
