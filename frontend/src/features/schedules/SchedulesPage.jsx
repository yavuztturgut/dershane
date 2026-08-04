import {
  ActionIcon, Alert, Button, Group, SegmentedControl, Select, SimpleGrid,
  Stack, Text, Title,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle, IconChevronLeft, IconChevronRight, IconPlus,
} from '@tabler/icons-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import trLocale from '@fullcalendar/core/locales/tr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/use-auth';
import { PageLoader } from '../../components/ui/PageLoader';
import { AppModal } from '../../components/ui/AppModal';
import { DualPanelModal } from '../../components/ui/DualPanelModal';
import { openAppConfirmModal } from '../../components/ui/app-confirm-modal';
import { getErrorMessage } from '../../lib/api-client';
import { notifyError } from '../../lib/notifications';
import { queryClient } from '../../lib/query-client';
import { queryKeys } from '../../lib/query-keys';
import { useLookups } from '../lookups/use-lookups';
import { schedulesApi } from './schedules.api';
import { getCourseColor } from './schedule.utils';
import { AttendanceEditor } from '../attendance/AttendanceEditor';
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
  const durationMinutes = (event.end?.getTime() - event.start?.getTime()) / 60000;
  const isCompact = durationMinutes <= 30;

  return (
    <div className={`${styles.event} ${isCompact ? styles.eventCompact : ''}`} title={`${course_name} · ${class_name} · ${teacher_name}`}>
      <div className={styles.eventCourse}>{course_name}</div>
      <div className={styles.eventMeta}>{class_name} · {teacher_name}</div>
    </div>
  );
}

function ScheduleDetailRow({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-dark-5 dark:bg-dark-8">
      <Text size="xs" fw={700} tt="uppercase" c="dimmed">{label}</Text>
      <Text size="sm" fw={600} mt={4}>{value}</Text>
    </div>
  );
}

export function SchedulesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user.role_name === 'admin';
  const canManageAttendance = isAdmin || user.role_name === 'teacher';
  const isMobile = useMediaQuery('(max-width: 48rem)');
  const calendarRef = useRef(null);
  const saveRequestRef = useRef(false);
  const attendanceEditorRef = useRef(null);
  const [opened, setOpened] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [attendanceDirty, setAttendanceDirty] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceCanSave, setAttendanceCanSave] = useState(false);
  const [mobilePanel, setMobilePanel] = useState('details');
  const [activeView, setActiveView] = useState(isMobile ? 'timeGridDay' : 'timeGridWeek');
  const [dateTitle, setDateTitle] = useState('');
  const [filters, setFilters] = useState({ courseId: '', classId: '', teacherId: '' });
  const [visibleRange, setVisibleRange] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const end = new Date();
    end.setDate(end.getDate() + 35);
    return { start: start.toISOString(), end: end.toISOString() };
  });
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
  const setFormValues = form.setValues;
  const setFormInitialValues = form.setInitialValues;
  const resetFormDirty = form.resetDirty;
  const scheduleParams = {
    ...visibleRange,
    ...(isAdmin ? { course_id: filters.courseId || undefined, class_id: filters.classId || undefined, teacher_id: filters.teacherId || undefined } : {}),
  };
  const schedulesQuery = useQuery({ queryKey: queryKeys.schedules.list(scheduleParams), queryFn: () => schedulesApi.getAll(scheduleParams) });
  const detailQuery = useQuery({
    queryKey: queryKeys.schedules.detail(editingId),
    queryFn: () => schedulesApi.getById(editingId),
    enabled: Boolean(editingId),
  });
  const lookupsQuery = useLookups(isAdmin);

  useEffect(() => {
    const defaultView = isMobile ? 'timeGridDay' : 'timeGridWeek';
    setActiveView(defaultView);
    calendarRef.current?.getApi().changeView(defaultView);
  }, [isMobile]);

  useEffect(() => {
    if (detailQuery.data && isAdmin) {
      const values = {
        course_id: String(detailQuery.data.course_id),
        class_id: String(detailQuery.data.class_id),
        teacher_id: String(detailQuery.data.teacher_id),
        start_time: new Date(detailQuery.data.start_time),
        end_time: new Date(detailQuery.data.end_time),
      };
      setFormValues(values);
      setFormInitialValues(values);
      resetFormDirty(values);
    }
  }, [detailQuery.data, isAdmin, resetFormDirty, setFormInitialValues, setFormValues]);

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
    onSuccess: (schedule) => {
      notifications.show({ color: 'green', message: t(editingId ? 'updated' : 'created') });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
      if (editingId) {
        queryClient.setQueryData(queryKeys.schedules.detail(editingId), schedule);
        form.resetDirty();
        setIsEditing(false);
      } else {
        setOpened(false);
      }
    },
    onError: (error) => {
      const conflict = error.response?.data?.errorCode === 'SCHEDULE_CONFLICT' && error.response.data.details;
      notifyError(conflict
        ? `${getErrorMessage(error)} ${conflict.course_name} · ${new Date(conflict.start_time).toLocaleString()}–${new Date(conflict.end_time).toLocaleTimeString()}`
        : getErrorMessage(error));
    },
    onSettled: () => { saveRequestRef.current = false; },
  });
  const deleteMutation = useMutation({
    mutationFn: schedulesApi.remove,
    onSuccess: () => {
      notifications.show({ color: 'green', message: t('deleted') });
      setOpened(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
      queryClient.removeQueries({ queryKey: queryKeys.schedules.detail(editingId) });
    },
    onError: (error) => notifyError(getErrorMessage(error)),
  });

  const courseOptions = lookupsQuery.data?.courses.map((course) => ({ value: String(course.id), label: course.name })) || [];
  const classOptions = lookupsQuery.data?.classes.map((classItem) => ({ value: String(classItem.id), label: classItem.name })) || [];
  const teacherOptions = lookupsQuery.data?.teachers.map((teacher) => ({ value: String(teacher.id), label: teacher.name })) || [];
  const events = useMemo(() => (schedulesQuery.data || []).map((schedule) => ({
    id: String(schedule.id),
    title: schedule.course_name,
    start: schedule.start_time,
    end: schedule.end_time,
    backgroundColor: getCourseColor(schedule.course_id),
    borderColor: getCourseColor(schedule.course_id),
    extendedProps: schedule,
  })), [schedulesQuery.data]);

  function changeView(view) {
    setActiveView(view);
    calendarRef.current?.getApi().changeView(view);
  }

  function moveCalendar(action) {
    calendarRef.current?.getApi()[action]();
  }

  function openCreate() {
    setEditingId(null);
    setIsEditing(true);
    form.setValues(initialValues);
    form.resetDirty(initialValues);
    setOpened(true);
  }

  function openEdit(id) {
    setEditingId(id);
    setIsEditing(false);
    setAttendanceDirty(false);
    setMobilePanel('details');
    setOpened(true);
  }

  function handleSelect(selection) {
    if (!isAdmin) return;

    setEditingId(null);
    setIsEditing(true);
    form.setValues({ ...initialValues, start_time: selection.start, end_time: selection.end });
    form.resetDirty();
    selection.view.calendar.unselect();
    setOpened(true);
  }

  function saveSchedule(values) {
    if (saveRequestRef.current) return;
    saveRequestRef.current = true;
    saveMutation.mutate(values);
  }

  function confirmDelete() {
    openAppConfirmModal({
      title: t('confirmDelete', { name: detailQuery.data?.course_name || '' }),
      children: t('deleteDescription'),
      labels: { confirm: t('delete'), cancel: t('cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteMutation.mutate(editingId),
    });
  }

  const handleAttendanceDirty = useCallback((dirty) => setAttendanceDirty(dirty), []);
  const handleAttendanceSaving = useCallback((saving) => setAttendanceSaving(saving), []);
  const handleAttendanceCanSave = useCallback((canSave) => setAttendanceCanSave(canSave), []);

  function closeImmediately() {
    setOpened(false);
    setIsEditing(false);
    setAttendanceDirty(false);
    setMobilePanel('details');
    form.resetDirty();
  }

  function confirmDiscard(onConfirm) {
    openAppConfirmModal({
      title: t('unsavedChanges'),
      children: t('unsavedChangesDescription'),
      labels: { confirm: t('discard'), cancel: t('continueEditing') },
      confirmProps: { color: 'red' },
      onConfirm,
    });
  }

  function requestClose() {
    const scheduleDirty = Boolean(isEditing && form.isDirty());
    if (scheduleDirty || attendanceDirty) confirmDiscard(closeImmediately);
    else closeImmediately();
  }

  function requestExitEditing() {
    if (form.isDirty() || attendanceDirty) confirmDiscard(() => {
      form.reset();
      setIsEditing(false);
    });
    else setIsEditing(false);
  }

  if (schedulesQuery.isLoading || (isAdmin && lookupsQuery.isLoading)) return <PageLoader />;
  if (schedulesQuery.isError || (isAdmin && lookupsQuery.isError)) return <Alert icon={<IconAlertCircle size={18} />} color="red">{getErrorMessage(schedulesQuery.error || lookupsQuery.error)}</Alert>;

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
            eventMinHeight={24}
            slotEventOverlap={false}
            events={events}
            selectable={isAdmin}
            select={handleSelect}
            eventClick={(info) => openEdit(Number(info.event.id))}
            eventContent={(info) => <ScheduleEvent event={info.event} />}
            datesSet={(info) => {
              setDateTitle(info.view.title);
              setVisibleRange((current) => current.start === info.startStr && current.end === info.endStr ? current : { start: info.startStr, end: info.endStr });
            }}
            height="auto"
          />
        </div>
      </section>

      {editingId && canManageAttendance ? (
        <DualPanelModal
          opened={opened}
          onClose={requestClose}
          leftTitle={t('scheduleDetails')}
          rightTitle={t('attendance')}
          activeTab={mobilePanel}
          onActiveTabChange={setMobilePanel}
          closeLabel={t('close')}
          leftContent={detailQuery.isLoading ? <PageLoader /> : detailQuery.isError ? <Alert color="red">{getErrorMessage(detailQuery.error)}</Alert> : isEditing ? (
            <form id="schedule-edit-form" onSubmit={form.onSubmit(saveSchedule)}>
              <Stack gap="md">
                <Select label={t('course')} data={courseOptions} required {...form.getInputProps('course_id')} />
                <Select label={t('class')} data={classOptions} required {...form.getInputProps('class_id')} />
                <Select label={t('teacher')} data={teacherOptions} required {...form.getInputProps('teacher_id')} />
                <DateTimePicker label={t('start')} required {...form.getInputProps('start_time')} />
                <DateTimePicker label={t('end')} required {...form.getInputProps('end_time')} />
              </Stack>
            </form>
          ) : detailQuery.data ? (
            <Stack gap="sm">
              <ScheduleDetailRow label={t('course')} value={detailQuery.data.course_name} />
              <ScheduleDetailRow label={t('class')} value={detailQuery.data.class_name} />
              <ScheduleDetailRow label={t('teacher')} value={detailQuery.data.teacher_name} />
              <ScheduleDetailRow label={t('start')} value={new Date(detailQuery.data.start_time).toLocaleString()} />
              <ScheduleDetailRow label={t('end')} value={new Date(detailQuery.data.end_time).toLocaleString()} />
            </Stack>
          ) : null}
          leftFooter={isAdmin && (isEditing ? (
            <Group justify="space-between">
              <Button color="red" variant="light" onClick={confirmDelete} loading={deleteMutation.isPending}>{t('delete')}</Button>
              <Group><Button variant="default" onClick={requestExitEditing}>{t('cancel')}</Button><Button type="submit" form="schedule-edit-form" loading={saveMutation.isPending}>{t('save')}</Button></Group>
            </Group>
          ) : <Group justify="flex-end"><Button onClick={() => setIsEditing(true)}>{t('edit')}</Button></Group>)}
          rightContent={(
            <AttendanceEditor
              ref={attendanceEditorRef}
              scheduleId={editingId}
              onDirtyChange={handleAttendanceDirty}
              onSavingChange={handleAttendanceSaving}
              onCanSaveChange={handleAttendanceCanSave}
            />
          )}
          rightFooter={<Group justify="flex-end"><Button disabled={!attendanceCanSave} onClick={() => attendanceEditorRef.current?.save()} loading={attendanceSaving}>{t('saveAttendance')}</Button></Group>}
        />
      ) : (
        <AppModal
          opened={opened}
          onClose={requestClose}
          title={t(editingId ? 'scheduleDetails' : 'createSchedule')}
          size="lg"
        >
          {editingId && detailQuery.isLoading ? <PageLoader /> : detailQuery.isError ? <Alert color="red">{getErrorMessage(detailQuery.error)}</Alert> : editingId && detailQuery.data ? (
            <Stack gap="sm">
              <ScheduleDetailRow label={t('course')} value={detailQuery.data.course_name} />
              <ScheduleDetailRow label={t('class')} value={detailQuery.data.class_name} />
              <ScheduleDetailRow label={t('teacher')} value={detailQuery.data.teacher_name} />
              <ScheduleDetailRow label={t('start')} value={new Date(detailQuery.data.start_time).toLocaleString()} />
              <ScheduleDetailRow label={t('end')} value={new Date(detailQuery.data.end_time).toLocaleString()} />
            </Stack>
          ) : (
            <form onSubmit={form.onSubmit(saveSchedule)}>
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <Select label={t('course')} data={courseOptions} required {...form.getInputProps('course_id')} />
                <Select label={t('class')} data={classOptions} required {...form.getInputProps('class_id')} />
                <Select label={t('teacher')} data={teacherOptions} required {...form.getInputProps('teacher_id')} />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md">
                <DateTimePicker label={t('start')} required {...form.getInputProps('start_time')} />
                <DateTimePicker label={t('end')} required {...form.getInputProps('end_time')} />
              </SimpleGrid>
              <Group justify="flex-end" mt="xl">
                <Button variant="default" onClick={requestClose}>{t('cancel')}</Button>
                <Button type="submit" loading={saveMutation.isPending}>{t('save')}</Button>
              </Group>
            </form>
          )}
        </AppModal>
      )}
    </div>
  );
}
