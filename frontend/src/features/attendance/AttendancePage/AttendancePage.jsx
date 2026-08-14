import { Accordion, Alert, Badge, Group, Pagination, Select, SimpleGrid, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { EmptyState } from '../../../components/ui/EmptyState/EmptyState';
import { openAppConfirmModal } from '../../../components/ui/AppModal/open-app-confirm-modal';
import { useAuth } from '../../auth/use-auth';
import { usersApi } from '../../users/users.api';
import { getLookupsQueryOptions, useLookups } from '../../lookups/use-lookups';
import { queryKeys } from '../../../shared/query/query-keys';
import { cachePolicy } from '../../../shared/query/cache-policy';
import { AttendanceEditor } from '../AttendanceEditor/AttendanceEditor';
import { attendanceApi } from '../attendance.api';
import styles from './AttendancePage.module.css';
import { PageContainer } from '../../../components/layout/PageContainer/PageContainer';
import { PageHeader } from '../../../components/ui/PageHeader/PageHeader';
import { ResponsiveFilterPanel } from '../../../components/ui/ResponsiveFilterPanel/ResponsiveFilterPanel';
import { formatIstanbulTime } from '../../../shared/time/istanbul-date-time';
import { PersonalAttendance } from '../PersonalAttendance/PersonalAttendance';
import { useSuspendingQueries } from '../../../shared/query/use-suspending-queries';

function toDate(value) {
  if (!value) return undefined;
  if (!(value instanceof Date)) return String(value).slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDay(value, locale) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const countColors = { present: 'green', absent: 'red', late: 'orange', excused: 'pink', not_recorded: 'gray' };

export function AttendancePage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const routeNavigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user.role_name === 'admin';
  const [filters, setFilters] = useState({ class_id: '', student_id: '', start: null, end: null });
  const [page, setPage] = useState(1);
  const [openDays, setOpenDays] = useState([]);
  const [openLessons, setOpenLessons] = useState([]);
  const [dirtyLessons, setDirtyLessons] = useState({});
  const params = useMemo(() => ({
    class_id: filters.class_id || undefined,
    student_id: filters.student_id || undefined,
    start: toDate(filters.start),
    end: toDate(filters.end),
    page,
    pageSize: isAdmin ? 7 : undefined,
  }), [filters, isAdmin, page]);
  const attendanceQueryOptions = {
    queryKey: isAdmin ? queryKeys.attendance.dailyReport(params) : queryKeys.attendance.mine(params),
    queryFn: () => isAdmin ? attendanceApi.getDailyReport(params) : attendanceApi.getMine(params),
    enabled: ['admin', 'student'].includes(user.role_name),
    placeholderData: keepPreviousData,
    staleTime: cachePolicy.operational,
  };
  const query = useQuery(attendanceQueryOptions);
  const lookupsQuery = useLookups(isAdmin);
  const studentOptionsParams = { role: 'student' };
  const usersQueryOptions = {
    queryKey: queryKeys.users.options(studentOptionsParams),
    queryFn: () => usersApi.getOptions(studentOptionsParams),
    enabled: isAdmin,
    staleTime: cachePolicy.operational,
  };
  const usersQuery = useQuery(usersQueryOptions);
  useEffect(() => {
    const action = location.state?.dashboardAction;
    if (!isAdmin || action?.type !== 'open-attendance' || !query.data || query.isPlaceholderData) return;
    const scheduleId = String(action.scheduleId);
    const day = query.data.days.find((item) => item.schedules.some((lesson) => String(lesson.schedule_id) === scheduleId));
    if (day) {
      setOpenDays((current) => current.includes(day.date) ? current : [...current, day.date]);
      setOpenLessons((current) => current.includes(scheduleId) ? current : [...current, scheduleId]);
    }
    routeNavigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
  }, [isAdmin, location.pathname, location.search, location.state, query.data, query.isPlaceholderData, routeNavigate]);

  function confirmDiscard(onConfirm) {
    openAppConfirmModal({
      title: t('unsavedChanges'),
      children: t('unsavedChangesDescription'),
      labels: { confirm: t('discard'), cancel: t('continueEditing') },
      confirmProps: { color: 'red' },
      onConfirm,
    });
  }

  function withDirtyGuard(action, lessonIds = Object.keys(dirtyLessons)) {
    if (lessonIds.some((id) => dirtyLessons[id])) confirmDiscard(action);
    else action();
  }

  function navigate(action) {
    withDirtyGuard(() => {
      setDirtyLessons({});
      action();
    });
  }

  function changeFilter(key, value) {
    navigate(() => {
      setFilters((current) => ({ ...current, [key]: value }));
      setPage(1);
    });
  }

  function clearFilters() {
    navigate(() => {
      setFilters({ class_id: '', student_id: '', start: null, end: null });
      setPage(1);
    });
  }

  function changeDays(nextDays) {
    const closedDates = openDays.filter((date) => !nextDays.includes(date));
    const closedIds = (query.data?.days || []).filter((day) => closedDates.includes(day.date)).flatMap((day) => day.schedules.map((lesson) => String(lesson.schedule_id)));
    withDirtyGuard(() => {
      setOpenDays(nextDays);
      setOpenLessons((current) => current.filter((id) => !closedIds.includes(id)));
      setDirtyLessons((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !closedIds.includes(id))));
    }, closedIds);
  }

  function changeLessons(day, nextForDay) {
    const dayIds = day.schedules.map((lesson) => String(lesson.schedule_id));
    const closedIds = openLessons.filter((id) => dayIds.includes(id) && !nextForDay.includes(id));
    withDirtyGuard(() => {
      setOpenLessons((current) => [...current.filter((id) => !dayIds.includes(id)), ...nextForDay]);
      setDirtyLessons((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !closedIds.includes(id))));
    }, closedIds);
  }

  useSuspendingQueries([
    { query, options: attendanceQueryOptions },
    { query: lookupsQuery, options: getLookupsQueryOptions(isAdmin) },
    { query: usersQuery, options: usersQueryOptions },
  ]);

  if (user.role_name === 'teacher') return <Alert>{t('teacherAttendanceHint')}</Alert>;

  return <PageContainer><PageHeader title={t('attendance')} description={t('attendanceDescription')} />
    {!isAdmin ? <PersonalAttendance query={query} filters={filters} changeFilter={changeFilter} clearFilters={clearFilters} t={t} locale={i18n.language} /> : <>
      {(lookupsQuery.isError || usersQuery.isError) && <Alert color="red" mb="md">{t('errors.GENERIC')}</Alert>}
      <ResponsiveFilterPanel activeCount={Object.values(filters).filter(Boolean).length} onClear={clearFilters}><SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Select clearable placeholder={t('class')} data={(lookupsQuery.data?.classes || []).map((item) => ({ value: String(item.id), label: item.name }))} value={filters.class_id} onChange={(value) => changeFilter('class_id', value || '')} />
        <Select searchable clearable placeholder={t('student')} data={(usersQuery.data || []).filter((item) => !filters.class_id || String(item.class_id) === filters.class_id).map((item) => ({ value: String(item.id), label: item.name }))} value={filters.student_id} onChange={(value) => changeFilter('student_id', value || '')} />
        <DateInput clearable placeholder={t('start')} value={filters.start} onChange={(start) => changeFilter('start', start)} />
        <DateInput clearable placeholder={t('end')} value={filters.end} onChange={(end) => changeFilter('end', end)} />
      </SimpleGrid></ResponsiveFilterPanel>
      <div aria-busy={query.isFetching}>{(query.isError && !query.data) ? <Alert color="red">{t('errors.GENERIC')}</Alert> : !query.data.days.length ? <EmptyState message={t('noData')} /> : <>
        <Accordion multiple value={openDays} onChange={changeDays} className={styles.days}>
          {query.data.days.map((day) => <Accordion.Item value={day.date} key={day.date} className={styles.day}>
            <Accordion.Control><Group justify="space-between" wrap="wrap" gap="xs" pr="sm"><Text fw={700}>{formatDay(day.date, i18n.language)}</Text><Group gap="xs"><Badge variant="light">{t('lessonCount', { count: day.lesson_count })}</Badge><Badge color={day.attendance_taken_count === day.lesson_count ? 'green' : 'gray'} variant="light">{t('attendanceProgress', { taken: day.attendance_taken_count, total: day.lesson_count })}</Badge></Group></Group></Accordion.Control>
            <Accordion.Panel><Accordion multiple value={openLessons.filter((id) => day.schedules.some((lesson) => String(lesson.schedule_id) === id))} onChange={(values) => changeLessons(day, values)}>
              {day.schedules.map((lesson) => {
                const lessonId = String(lesson.schedule_id);
                return <Accordion.Item value={lessonId} key={lessonId} className={styles.lesson}>
                  <Accordion.Control><div className={styles.lessonHeader}>
                    <div><Text fw={700}>{formatIstanbulTime(lesson.start_time, i18n.language)}–{formatIstanbulTime(lesson.end_time, i18n.language)} · {lesson.course_name}</Text><Text size="sm" c="dimmed">{lesson.class_name} · {lesson.teacher_name}</Text></div>
                    <Group gap={6} wrap="wrap"><Badge color={lesson.attendance_taken ? 'green' : 'gray'} variant="light">{t(lesson.attendance_taken ? 'attendanceTaken' : 'attendanceNotTaken')}</Badge>{Object.entries(lesson.counts).filter(([status]) => status !== 'not_recorded').map(([status, count]) => <Badge key={status} color={countColors[status]} variant="light">{t(`attendanceStatus.${status}`)}: {count}</Badge>)}</Group>
                  </div></Accordion.Control>
                  <Accordion.Panel>{openLessons.includes(lessonId) && <AttendanceEditor
                    scheduleId={lesson.schedule_id}
                    studentId={filters.student_id || undefined}
                    inlineSave
                    onDirtyChange={(dirty) => setDirtyLessons((current) => current[lessonId] === dirty ? current : ({ ...current, [lessonId]: dirty }))}
                  />}</Accordion.Panel>
                </Accordion.Item>;
              })}
            </Accordion></Accordion.Panel>
          </Accordion.Item>)}
        </Accordion>
        {query.data.totalPages > 1 && <Group justify="center" mt="lg"><Pagination value={page} total={query.data.totalPages} onChange={(nextPage) => navigate(() => setPage(nextPage))} /></Group>}
      </>}</div>
    </>}
  </PageContainer>;
}
