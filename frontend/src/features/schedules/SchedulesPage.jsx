import {
  ActionIcon, Alert, Button, Group, Modal, SegmentedControl, Select, SimpleGrid,
  Stack, Text, Title,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useMediaQuery } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle, IconChevronLeft, IconChevronRight, IconPlus,
} from '@tabler/icons-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import trLocale from '@fullcalendar/core/locales/tr';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/auth-context';
import { PageLoader } from '../../components/ui/PageLoader';
import { getErrorMessage } from '../../lib/api-client';
import { notifyError } from '../../lib/notifications';
import { queryClient } from '../../lib/query-client';
import { coursesApi } from '../courses/courses.api';
import { classesApi } from '../classes/classes.api';
import { rolesApi } from '../roles/roles.api';
import { usersApi } from '../users/users.api';
import { schedulesApi } from './schedules.api';
import { filterSchedules, getCourseColor } from './schedule.utils';
import styles from './SchedulesPage.module.css';

const initialValues = {
  course_id: '', class_id: '', teacher_id: '', start_time: null, end_time: null,
};

function getTimestamp(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return new Date(value.replace(' ', 'T')).getTime();
  return Number.NaN;
}

function toLocalDateTime(value) {
  const date = value instanceof Date ? value : new Date(value?.replace?.(' ', 'T'));
  if (Number.isNaN(date?.getTime?.())) return null;

  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function ScheduleEvent({ event }) {
  const { course_name, class_name, teacher_name } = event.extendedProps;

  return (
    <div className={styles.event}>
      <div className={styles.eventCourse}>{course_name}</div>
      <div className={styles.eventMeta}>{class_name} · {teacher_name}</div>
    </div>
  );
}

export function SchedulesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user.role_name === 'admin';
  const isMobile = useMediaQuery('(max-width: 48rem)');
  const calendarRef = useRef(null);
  const saveRequestRef = useRef(false);
  const [opened, setOpened] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeView, setActiveView] = useState(isMobile ? 'timeGridDay' : 'timeGridWeek');
  const [dateTitle, setDateTitle] = useState('');
  const [filters, setFilters] = useState({ courseId: '', classId: '', teacherId: '' });
  const form = useForm({
    initialValues,
    validate: {
      course_id: (value) => value ? null : t('errors.REQUIRED'),
      class_id: (value) => value ? null : t('errors.REQUIRED'),
      teacher_id: (value) => value ? null : t('errors.REQUIRED'),
      start_time: (value) => value ? null : t('errors.REQUIRED'),
      end_time: (value, values) => {
        const startTime = getTimestamp(values.start_time);
        const endTime = getTimestamp(value);

        return Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime
          ? null
          : t('errors.SCHEDULE_END_BEFORE_START');
      },
    },
  });
  const schedulesQuery = useQuery({ queryKey: ['schedules'], queryFn: schedulesApi.getAll });
  const detailQuery = useQuery({
    queryKey: ['schedules', editingId],
    queryFn: () => schedulesApi.getById(editingId),
    enabled: Boolean(editingId),
  });
  const coursesQuery = useQuery({ queryKey: ['courses'], queryFn: coursesApi.getAll, enabled: isAdmin });
  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: classesApi.getAll, enabled: isAdmin });
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: rolesApi.getAll, enabled: isAdmin });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: usersApi.getAll, enabled: isAdmin });

  useEffect(() => {
    const defaultView = isMobile ? 'timeGridDay' : 'timeGridWeek';
    setActiveView(defaultView);
    calendarRef.current?.getApi().changeView(defaultView);
  }, [isMobile]);

  useEffect(() => {
    if (detailQuery.data && isAdmin) {
      form.setValues({
        course_id: String(detailQuery.data.course_id),
        class_id: String(detailQuery.data.class_id),
        teacher_id: String(detailQuery.data.teacher_id),
        start_time: new Date(detailQuery.data.start_time),
        end_time: new Date(detailQuery.data.end_time),
      });
    }
  }, [detailQuery.data, isAdmin]);

  const saveMutation = useMutation({
    mutationFn: (values) => {
      const payload = {
        ...values,
        course_id: Number(values.course_id),
        class_id: Number(values.class_id),
        teacher_id: Number(values.teacher_id),
        start_time: toLocalDateTime(values.start_time),
        end_time: toLocalDateTime(values.end_time),
      };

      return editingId ? schedulesApi.update(editingId, payload) : schedulesApi.create(payload);
    },
    onSuccess: () => {
      notifications.show({ color: 'green', message: t(editingId ? 'updated' : 'created') });
      setOpened(false);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error) => notifyError(getErrorMessage(error)),
    onSettled: () => { saveRequestRef.current = false; },
  });
  const deleteMutation = useMutation({
    mutationFn: schedulesApi.remove,
    onSuccess: () => {
      notifications.show({ color: 'green', message: t('deleted') });
      setOpened(false);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error) => notifyError(getErrorMessage(error)),
  });

  const teacherRoleId = rolesQuery.data?.find((role) => role.name === 'teacher')?.id;
  const courseOptions = coursesQuery.data?.map((course) => ({ value: String(course.id), label: course.name })) || [];
  const classOptions = classesQuery.data?.map((classItem) => ({ value: String(classItem.id), label: classItem.name })) || [];
  const teacherOptions = usersQuery.data?.filter((item) => item.role_id === teacherRoleId && item.is_active)
    .map((item) => ({ value: String(item.id), label: item.name })) || [];
  const events = useMemo(() => filterSchedules(schedulesQuery.data || [], filters).map((schedule) => ({
    id: String(schedule.id),
    title: schedule.course_name,
    start: schedule.start_time,
    end: schedule.end_time,
    backgroundColor: getCourseColor(schedule.course_id),
    borderColor: getCourseColor(schedule.course_id),
    extendedProps: schedule,
  })), [schedulesQuery.data, filters]);

  function changeView(view) {
    setActiveView(view);
    calendarRef.current?.getApi().changeView(view);
  }

  function moveCalendar(action) {
    calendarRef.current?.getApi()[action]();
  }

  function openCreate() {
    setEditingId(null);
    form.setValues(initialValues);
    setOpened(true);
  }

  function openEdit(id) {
    setEditingId(id);
    setOpened(true);
  }

  function handleSelect(selection) {
    if (!isAdmin) return;

    setEditingId(null);
    form.setValues({ ...initialValues, start_time: selection.start, end_time: selection.end });
    selection.view.calendar.unselect();
    setOpened(true);
  }

  function saveSchedule(values) {
    if (saveRequestRef.current) return;
    saveRequestRef.current = true;
    saveMutation.mutate(values);
  }

  function confirmDelete() {
    modals.openConfirmModal({
      title: t('confirmDelete', { name: detailQuery.data?.course_name || '' }),
      children: t('deleteDescription'),
      labels: { confirm: t('delete'), cancel: t('cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteMutation.mutate(editingId),
    });
  }

  if (schedulesQuery.isLoading) return <PageLoader />;
  if (schedulesQuery.isError) return <Alert icon={<IconAlertCircle size={18} />} color="red">{getErrorMessage(schedulesQuery.error)}</Alert>;

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <Title order={1} className={styles.title}>{t(isAdmin ? 'schedules' : 'mySchedule')}</Title>
        {isAdmin && <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>{t('createSchedule')}</Button>}
      </div>

      <section className={styles.calendarSurface} aria-label={t(isAdmin ? 'schedules' : 'mySchedule')}>
        <div className={styles.calendarToolbar}>
          <Group gap="xs" className={styles.toolbarActions}>
            <ActionIcon variant="default" size="lg" onClick={() => moveCalendar('prev')} aria-label={t('previous')}><IconChevronLeft size={18} /></ActionIcon>
            <ActionIcon variant="default" size="lg" onClick={() => moveCalendar('next')} aria-label={t('next')}><IconChevronRight size={18} /></ActionIcon>
            <Button variant="light" onClick={() => moveCalendar('today')}>{t('today')}</Button>
          </Group>
          <Title order={2} className={styles.toolbarTitle}>{dateTitle}</Title>
          <SegmentedControl
            className={styles.toolbarViews}
            value={activeView}
            onChange={changeView}
            data={[
              { value: 'timeGridDay', label: t('day') },
              { value: 'timeGridWeek', label: t('week') },
              { value: 'dayGridMonth', label: t('month') },
            ]}
          />
        </div>

        {isAdmin && (
          <div className={styles.filters}>
            <Select clearable data={courseOptions} value={filters.courseId} onChange={(courseId) => setFilters((current) => ({ ...current, courseId: courseId || '' }))} placeholder={t('filterCourse')} aria-label={t('filterCourse')} />
            <Select clearable data={classOptions} value={filters.classId} onChange={(classId) => setFilters((current) => ({ ...current, classId: classId || '' }))} placeholder={t('filterClass')} aria-label={t('filterClass')} />
            <Select clearable data={teacherOptions} value={filters.teacherId} onChange={(teacherId) => setFilters((current) => ({ ...current, teacherId: teacherId || '' }))} placeholder={t('filterTeacher')} aria-label={t('filterTeacher')} />
          </div>
        )}

        <div className={styles.calendar}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            locales={[trLocale]}
            locale={i18n.language}
            initialView={activeView}
            headerToolbar={false}
            firstDay={1}
            weekends
            allDaySlot={false}
            slotMinTime="08:00:00"
            slotMaxTime="22:00:00"
            scrollTime="08:00:00"
            slotDuration="00:30:00"
            snapDuration="00:30:00"
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            dayHeaderFormat={{ weekday: 'short', day: 'numeric', month: 'numeric' }}
            eventMinHeight={48}
            events={events}
            selectable={isAdmin}
            select={handleSelect}
            eventClick={(info) => openEdit(Number(info.event.id))}
            eventContent={(info) => <ScheduleEvent event={info.event} />}
            datesSet={(info) => setDateTitle(info.view.title)}
            height="auto"
          />
        </div>
      </section>

      <Modal opened={opened} onClose={() => setOpened(false)} title={t(editingId ? 'editSchedule' : 'createSchedule')} centered={!isMobile} fullScreen={isMobile} size="lg">
        {editingId && detailQuery.isLoading ? <PageLoader /> : !isAdmin && detailQuery.data ? (
          <Stack gap="sm">
            <Text><b>{t('course')}:</b> {detailQuery.data.course_name}</Text>
            <Text><b>{t('class')}:</b> {detailQuery.data.class_name}</Text>
            <Text><b>{t('teacher')}:</b> {detailQuery.data.teacher_name}</Text>
            <Text><b>{t('start')}:</b> {new Date(detailQuery.data.start_time).toLocaleString()}</Text>
            <Text><b>{t('end')}:</b> {new Date(detailQuery.data.end_time).toLocaleString()}</Text>
          </Stack>
        ) : (
          <form onSubmit={form.onSubmit(saveSchedule)}>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Select label={t('course')} data={courseOptions} required {...form.getInputProps('course_id')} />
              <Select label={t('class')} data={classOptions} required {...form.getInputProps('class_id')} />
              <Select label={t('teacher')} data={teacherOptions} required {...form.getInputProps('teacher_id')} />
              <div />
              <DateTimePicker label={t('start')} required {...form.getInputProps('start_time')} />
              <DateTimePicker label={t('end')} required {...form.getInputProps('end_time')} />
            </SimpleGrid>
            <Group justify="space-between" mt="xl">
              {editingId ? <Button color="red" variant="light" onClick={confirmDelete} loading={deleteMutation.isPending}>{t('delete')}</Button> : <span />}
              <Group>
                <Button variant="default" onClick={() => setOpened(false)}>{t('cancel')}</Button>
                <Button type="submit" loading={saveMutation.isPending}>{t('save')}</Button>
              </Group>
            </Group>
          </form>
        )}
      </Modal>
    </div>
  );
}
