import { Badge, Button } from '@mantine/core';
import { IconArrowRight, IconCircleCheck } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { Surface } from '../../../components/ui/Surface/Surface';
import { formatIstanbulTime } from '../../../shared/time/istanbul-date-time';
import styles from './DashboardScheduleOverview.module.css';

const badgeColors = {
  upcoming: 'blue',
  ongoing: 'orange',
  complete: 'green',
  missing: 'red',
  no_students: 'gray',
};

function displayStatus(schedule) {
  if (schedule.attendance_status === 'missing' || schedule.attendance_status === 'complete' || schedule.attendance_status === 'no_students') {
    return schedule.attendance_status;
  }
  return schedule.temporal_status;
}

function ScheduleRow({ schedule, locale, t, attention = false }) {
  const status = attention ? 'missing' : displayStatus(schedule);
  return <li className={styles.row}>
    <time className={styles.time} dateTime={schedule.start_time}>
      {formatIstanbulTime(schedule.start_time, locale)}–{formatIstanbulTime(schedule.end_time, locale)}
    </time>
    <div className={styles.details}>
      <strong>{schedule.course_name}</strong>
      <span>{schedule.class_name} · {schedule.teacher_name}</span>
      {attention && <span>{t('dashboardOverview.attendanceRecorded', {
        recorded: schedule.recorded_count,
        total: schedule.student_count,
      })}</span>}
    </div>
    <Badge color={badgeColors[status]} variant="light">{t(`dashboardOverview.status.${status}`)}</Badge>
  </li>;
}

function EmptyMessage({ children, positive = false }) {
  return <div className={positive ? `${styles.empty} ${styles.positive}` : styles.empty}>
    {positive && <IconCircleCheck size={22} aria-hidden="true" />}
    <span>{children}</span>
  </div>;
}

export function TodayScheduleCard({ schedules, locale, t }) {
  const ongoingSchedules = schedules.filter((schedule) => schedule.temporal_status === 'ongoing')
    .sort((left, right) => new Date(left.start_time) - new Date(right.start_time));
  const upcomingSchedules = schedules.filter((schedule) => schedule.temporal_status === 'upcoming')
    .sort((left, right) => new Date(left.start_time) - new Date(right.start_time));
  const endedSchedules = schedules.filter((schedule) => schedule.temporal_status === 'ended')
    .sort((left, right) => new Date(right.end_time) - new Date(left.end_time));
  const visibleSchedules = [...ongoingSchedules, ...upcomingSchedules, ...endedSchedules].slice(0, 3);
  const hiddenScheduleCount = Math.max(0, schedules.length - visibleSchedules.length);

  return <Surface className={styles.surface}>
    <div className={styles.header}>
      <h2 className={styles.title}>{t('dashboardOverview.todaySchedule')}</h2>
      <Button component={Link} to="/schedules" variant="subtle" size="compact-sm" rightSection={<IconArrowRight size={16} />}>
        {t('dashboardOverview.viewAll')}
      </Button>
    </div>
    {!schedules.length
      ? <EmptyMessage>{t('dashboardOverview.noLessonsToday')}</EmptyMessage>
      : <><ul className={styles.list}>{visibleSchedules.map((schedule) => (
        <ScheduleRow key={schedule.id} schedule={schedule} locale={locale} t={t} />
      ))}</ul>{hiddenScheduleCount > 0 && <Button component={Link} to="/schedules" variant="subtle" size="compact-sm" className={styles.more}>
        {t('dashboardOverview.moreLessons', { count: hiddenScheduleCount })}
      </Button>}</>}
  </Surface>;
}

export function AttentionScheduleCard({ schedules, locale, t }) {
  const missingSchedules = schedules
    .filter((schedule) => schedule.attendance_status === 'missing')
    .sort((left, right) => new Date(right.end_time) - new Date(left.end_time));
  const visibleMissingSchedules = missingSchedules.slice(0, 3);
  const hiddenMissingCount = Math.max(0, missingSchedules.length - visibleMissingSchedules.length);

  return <Surface className={styles.surface}>
    <div className={styles.header}>
      <h2 className={styles.title}>{t('dashboardOverview.needsAttention')}</h2>
      <Button component={Link} to="/attendance" variant="subtle" size="compact-sm" rightSection={<IconArrowRight size={16} />}>
        {t('dashboardOverview.review')}
      </Button>
    </div>
    {!missingSchedules.length
      ? <EmptyMessage positive>{t('dashboardOverview.noMissingAttendance')}</EmptyMessage>
      : <><ul className={styles.list}>{visibleMissingSchedules.map((schedule) => (
        <ScheduleRow key={schedule.id} schedule={schedule} locale={locale} t={t} attention />
      ))}</ul>{hiddenMissingCount > 0 && <Button component={Link} to="/attendance" variant="subtle" size="compact-sm" className={styles.more}>
        {t('dashboardOverview.moreMissingAttendance', { count: hiddenMissingCount })}
      </Button>}</>}
  </Surface>;
}
