import { Accordion, Alert, Badge, Group, Pagination, Paper, Select, SimpleGrid, Table, Text, Title } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../components/ui/EmptyState';
import { openAppConfirmModal } from '../../components/ui/app-confirm-modal';
import { PageLoader } from '../../components/ui/PageLoader';
import { useAuth } from '../auth/use-auth';
import { usersApi } from '../users/users.api';
import { useLookups } from '../lookups/use-lookups';
import { queryKeys } from '../../lib/query-keys';
import { AttendanceEditor } from './AttendanceEditor';
import { attendanceApi } from './attendance.api';
import styles from './AttendancePage.module.css';

function toDate(value) {
  if (!value) return undefined;
  if (!(value instanceof Date)) return String(value).slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDay(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const countColors = { present: 'green', absent: 'red', late: 'orange', excused: 'pink', not_recorded: 'gray' };

function PersonalAttendance({ query, filters, changeFilter, t }) {
  if (query.isLoading) return <PageLoader />;
  if (query.isError) return <Alert color="red">{t('errors.GENERIC')}</Alert>;
  return <>
    <SimpleGrid cols={{ base: 2, sm: 5 }} mb="lg">{['total', 'present', 'absent', 'late', 'excused'].map((key) => <Paper withBorder p="md" key={key}><Text size="xs" c="dimmed">{t(key === 'total' ? 'total' : `attendanceStatus.${key}`)}</Text><Text fw={700} size="xl">{query.data.summary[key]}</Text></Paper>)}</SimpleGrid>
    <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md"><DateInput clearable placeholder={t('start')} value={filters.start} onChange={(start) => changeFilter('start', start)} /><DateInput clearable placeholder={t('end')} value={filters.end} onChange={(end) => changeFilter('end', end)} /></SimpleGrid>
    {!query.data.records.length ? <EmptyState message={t('noData')} /> : <Table.ScrollContainer minWidth={700}><Table withTableBorder highlightOnHover><Table.Thead><Table.Tr><Table.Th>{t('course')}</Table.Th><Table.Th>{t('class')}</Table.Th><Table.Th>{t('start')}</Table.Th><Table.Th>{t('status')}</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{query.data.records.map((record) => <Table.Tr key={`${record.schedule_id}`}><Table.Td>{record.course_name}</Table.Td><Table.Td>{record.class_name}</Table.Td><Table.Td>{new Date(record.start_time).toLocaleString()}</Table.Td><Table.Td>{record.status ? t(`attendanceStatus.${record.status}`) : t('notRecorded')}</Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>}
  </>;
}

export function AttendancePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user.role_name === 'admin';
  const [filters, setFilters] = useState({ class_id: '', student_id: '', start: null, end: null });
  const [page, setPage] = useState(1);
  const [openDays, setOpenDays] = useState([]);
  const [openLessons, setOpenLessons] = useState([]);
  const [dirtyLessons, setDirtyLessons] = useState({});
  const initializedView = useRef('');
  const params = useMemo(() => ({
    class_id: filters.class_id || undefined,
    student_id: filters.student_id || undefined,
    start: toDate(filters.start),
    end: toDate(filters.end),
    page,
    pageSize: isAdmin ? 7 : undefined,
  }), [filters, isAdmin, page]);
  const query = useQuery({
    queryKey: isAdmin ? queryKeys.attendance.dailyReport(params) : queryKeys.attendance.mine(params),
    queryFn: () => isAdmin ? attendanceApi.getDailyReport(params) : attendanceApi.getMine(params),
    enabled: ['admin', 'student'].includes(user.role_name),
  });
  const lookupsQuery = useLookups(isAdmin);
  const studentOptionsParams = { role: 'student' };
  const usersQuery = useQuery({
    queryKey: queryKeys.users.options(studentOptionsParams),
    queryFn: () => usersApi.getOptions(studentOptionsParams),
    enabled: isAdmin,
  });
  const viewKey = JSON.stringify(params);

  useEffect(() => {
    if (!isAdmin || !query.data || initializedView.current === viewKey) return;
    const firstDay = query.data.days[0];
    setOpenDays(firstDay ? [firstDay.date] : []);
    setOpenLessons(firstDay?.schedules[0] ? [String(firstDay.schedules[0].schedule_id)] : []);
    setDirtyLessons({});
    initializedView.current = viewKey;
  }, [isAdmin, query.data, viewKey]);

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

  if (user.role_name === 'teacher') return <Alert>{t('teacherAttendanceHint')}</Alert>;

  return <div><Title order={1} className="text-2xl" mb="lg">{t('attendance')}</Title>
    {!isAdmin ? <PersonalAttendance query={query} filters={filters} changeFilter={changeFilter} t={t} /> : <>
      {(lookupsQuery.isError || usersQuery.isError) && <Alert color="red" mb="md">{t('errors.GENERIC')}</Alert>}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
        <Select clearable placeholder={t('class')} data={(lookupsQuery.data?.classes || []).map((item) => ({ value: String(item.id), label: item.name }))} value={filters.class_id} onChange={(value) => changeFilter('class_id', value || '')} />
        <Select searchable clearable placeholder={t('student')} data={(usersQuery.data || []).filter((item) => !filters.class_id || String(item.class_id) === filters.class_id).map((item) => ({ value: String(item.id), label: item.name }))} value={filters.student_id} onChange={(value) => changeFilter('student_id', value || '')} />
        <DateInput clearable placeholder={t('start')} value={filters.start} onChange={(start) => changeFilter('start', start)} />
        <DateInput clearable placeholder={t('end')} value={filters.end} onChange={(end) => changeFilter('end', end)} />
      </SimpleGrid>
      {(query.isLoading || lookupsQuery.isLoading || usersQuery.isLoading) ? <PageLoader /> : query.isError ? <Alert color="red">{t('errors.GENERIC')}</Alert> : !query.data.days.length ? <EmptyState message={t('noData')} /> : <>
        <Accordion multiple value={openDays} onChange={changeDays} className={styles.days}>
          {query.data.days.map((day) => <Accordion.Item value={day.date} key={day.date} className={styles.day}>
            <Accordion.Control><Group justify="space-between" wrap="wrap" gap="xs" pr="sm"><Text fw={700}>{formatDay(day.date)}</Text><Group gap="xs"><Badge variant="light">{t('lessonCount', { count: day.lesson_count })}</Badge><Badge color={day.attendance_taken_count === day.lesson_count ? 'green' : 'gray'} variant="light">{t('attendanceProgress', { taken: day.attendance_taken_count, total: day.lesson_count })}</Badge></Group></Group></Accordion.Control>
            <Accordion.Panel><Accordion multiple value={openLessons.filter((id) => day.schedules.some((lesson) => String(lesson.schedule_id) === id))} onChange={(values) => changeLessons(day, values)}>
              {day.schedules.map((lesson) => {
                const lessonId = String(lesson.schedule_id);
                return <Accordion.Item value={lessonId} key={lessonId} className={styles.lesson}>
                  <Accordion.Control><div className={styles.lessonHeader}>
                    <div><Text fw={700}>{formatTime(lesson.start_time)}–{formatTime(lesson.end_time)} · {lesson.course_name}</Text><Text size="sm" c="dimmed">{lesson.class_name} · {lesson.teacher_name}</Text></div>
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
      </>}
    </>}
  </div>;
}
