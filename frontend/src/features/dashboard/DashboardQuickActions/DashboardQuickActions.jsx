import { Badge } from '@mantine/core';
import { IconBolt, IconCalendarPlus, IconChecklist, IconChevronDown, IconSchool, IconUserPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppModal } from '../../../components/ui/AppModal/AppModal';
import { Surface } from '../../../components/ui/Surface/Surface';
import { formatIstanbulTime } from '../../../shared/time/istanbul-date-time';
import styles from './DashboardQuickActions.module.css';

const actions = [
  ['student', 'dashboardOverview.addStudent', 'dashboardOverview.addStudentDescription', IconUserPlus],
  ['teacher', 'dashboardOverview.addTeacher', 'dashboardOverview.addTeacherDescription', IconSchool],
  ['schedule', 'dashboardOverview.addSchedule', 'dashboardOverview.addScheduleDescription', IconCalendarPlus],
  ['attendance', 'dashboardOverview.selectAttendance', 'dashboardOverview.selectAttendanceDescription', IconChecklist],
];

export function DashboardQuickActions({ schedules, locale, t }) {
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);
  const [attendanceOpened, setAttendanceOpened] = useState(false);
  const attendanceSchedules = schedules
    .filter((schedule) => ['ongoing', 'ended'].includes(schedule.temporal_status))
    .sort((left, right) => new Date(right.start_time) - new Date(left.start_time));

  function runAction(action) {
    if (action === 'attendance') {
      setAttendanceOpened(true);
      return;
    }
    if (action === 'schedule') {
      navigate('/schedules', { state: { dashboardAction: { type: 'create-schedule' } } });
      return;
    }
    navigate('/users', { state: { dashboardAction: { type: 'create-user', role: action } } });
  }

  function selectAttendance(scheduleId) {
    navigate('/attendance', { state: { dashboardAction: { type: 'open-attendance', scheduleId } } });
  }

  return <Surface className={styles.surface}>
    <button
      type="button"
      className={styles.toggle}
      onClick={() => setOpened((current) => !current)}
      aria-expanded={opened}
      aria-controls="dashboard-quick-actions"
    >
      <span className={styles.headerIcon}><IconBolt size={22} aria-hidden="true" /></span>
      <span className={styles.headerText}>
        <span id="dashboard-quick-actions-title" className={styles.title} role="heading" aria-level="2">{t('dashboardOverview.quickActions')}</span>
        <span className={styles.description}>{t('dashboardOverview.quickActionsDescription')}</span>
      </span>
      <IconChevronDown className={styles.chevron} data-open={opened || undefined} size={20} aria-hidden="true" />
    </button>
    <div id="dashboard-quick-actions" className={styles.body} data-open={opened || undefined} aria-hidden={!opened} inert={!opened}>
      <div className={styles.bodyInner}>
        <div className={styles.actions}>
          {actions.map(([action, label, description, Icon]) => (
            <button key={action} type="button" className={styles.action} onClick={() => runAction(action)}>
              <span className={styles.icon}><Icon size={22} aria-hidden="true" /></span>
              <span className={styles.actionText}>
                <strong>{t(label)}</strong>
                <span>{t(description)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
    <AppModal
      opened={attendanceOpened}
      onClose={() => setAttendanceOpened(false)}
      title={t('dashboardOverview.selectAttendanceTitle')}
    >
      {!attendanceSchedules.length ? <p className={styles.empty}>{t('dashboardOverview.noAttendanceLessons')}</p> : (
        <div className={styles.lessonList}>
          {attendanceSchedules.map((schedule) => <button
            key={schedule.id}
            type="button"
            className={styles.lesson}
            onClick={() => selectAttendance(schedule.id)}
          >
            <span className={styles.lessonDetails}>
              <strong>{schedule.course_name}</strong>
              <span>{formatIstanbulTime(schedule.start_time, locale)}–{formatIstanbulTime(schedule.end_time, locale)} · {schedule.class_name}</span>
            </span>
            <Badge variant="light" color={schedule.temporal_status === 'ongoing' ? 'orange' : 'gray'}>
              {t(`dashboardOverview.status.${schedule.temporal_status}`)}
            </Badge>
          </button>)}
        </div>
      )}
    </AppModal>
  </Surface>;
}
