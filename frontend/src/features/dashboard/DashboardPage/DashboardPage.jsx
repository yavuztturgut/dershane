import { Alert, Button } from '@mantine/core';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconBook2,
  IconCalendarCheck,
  IconCalendarEvent,
  IconClock,
  IconSchool,
  IconUsers,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '../../../components/layout/PageContainer/PageContainer';
import { PageHeader } from '../../../components/ui/PageHeader/PageHeader';
import { cachePolicy } from '../../../shared/query/cache-policy';
import { queryKeys } from '../../../shared/query/query-keys';
import { useSuspendingQueries } from '../../../shared/query/use-suspending-queries';
import { useAuth } from '../../auth/use-auth';
import { AttendanceCompletionChart } from '../AttendanceCompletionChart/AttendanceCompletionChart';
import { DashboardMetricGrid } from '../DashboardMetricGrid/DashboardMetricGrid';
import { DashboardQuickActions } from '../DashboardQuickActions/DashboardQuickActions';
import { AttentionScheduleCard, TodayScheduleCard } from '../DashboardScheduleOverview/DashboardScheduleOverview';
import { dashboardApi } from '../dashboard.api';
import styles from './DashboardPage.module.css';

const operationalMetrics = [
  ['lessons', 'dashboardOverview.todayLessons', IconCalendarEvent, 'blue'],
  ['remaining', 'dashboardOverview.remainingLessons', IconClock, 'orange'],
  ['attendanceCompleted', 'dashboardOverview.completedAttendance', IconCalendarCheck, 'green'],
  ['attendanceMissing', 'dashboardOverview.missingAttendance', IconAlertTriangle, 'red'],
];

const systemMetrics = [
  ['users', 'totalUsers', IconUsers, 'blue'],
  ['courses', 'totalCourses', IconBook2, 'indigo'],
  ['classes', 'totalClasses', IconSchool, 'cyan'],
  ['schedules', 'totalSchedules', IconCalendarEvent, 'violet'],
];

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryOptions = {
    queryKey: queryKeys.dashboard.summary,
    queryFn: dashboardApi.getSummary,
    staleTime: cachePolicy.dashboard,
  };
  const query = useQuery(queryOptions);
  useSuspendingQueries([{ query, options: queryOptions }]);

  if (query.isError) {
    return <Alert icon={<IconAlertCircle size={18} />} color="red">
      {t('errors.GENERIC')}
      <Button variant="subtle" size="compact-sm" onClick={() => query.refetch()}>{t('retry')}</Button>
    </Alert>;
  }

  const data = query.data;

  return <PageContainer>
    <PageHeader title={t('welcome', { name: user.name })} description={t('dashboardDescription')} />
    <div className={styles.page}>
      <DashboardMetricGrid metrics={operationalMetrics} values={data.today} t={t} />
      <DashboardQuickActions schedules={data.todaySchedules} locale={i18n.language} t={t} />
      <div className={styles.contentGrid}>
        <div className={styles.primaryColumn}>
          <div className={styles.todaySchedule}><TodayScheduleCard schedules={data.todaySchedules} locale={i18n.language} t={t} /></div>
          <div className={styles.attendanceChart}><AttendanceCompletionChart data={data.weeklyAttendance} locale={i18n.language} t={t} /></div>
        </div>
        <div className={styles.secondaryColumn}>
          <div className={styles.attentionSchedule}><AttentionScheduleCard schedules={data.todaySchedules} locale={i18n.language} t={t} /></div>
          <section aria-labelledby="system-summary-title" className={styles.systemSummary}>
            <h2 id="system-summary-title" className={styles.sectionTitle}>{t('dashboardOverview.systemSummary')}</h2>
            <DashboardMetricGrid metrics={systemMetrics} values={data} t={t} compact />
          </section>
        </div>
      </div>
    </div>
  </PageContainer>;
}
