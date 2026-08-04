import { Alert, Button, Checkbox, Group, Select, Table, Text } from '@mantine/core';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '../../../components/ui/PageLoader/PageLoader';
import { getErrorMessage } from '../../../shared/api/api-client';
import { notifyError, notifySuccess } from '../../../shared/notifications/notifications';
import { queryClient } from '../../../shared/query/query-client';
import { attendanceApi } from '../attendance.api';
import { queryKeys } from '../../../shared/query/query-keys';
import styles from './AttendanceEditor.module.css';

function valuesFromRecords(records) {
  return Object.fromEntries(records.map((record) => [record.student_id, record.status || 'absent']));
}

function valuesMatch(left, right) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => left[key] === right[key]);
}

export const AttendanceEditor = forwardRef(function AttendanceEditor({ scheduleId, studentId, onDirtyChange, onSavingChange, onCanSaveChange, onSaved, inlineSave = false }, ref) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: queryKeys.attendance.schedule(scheduleId, studentId),
    queryFn: () => attendanceApi.getForSchedule(scheduleId, { student_id: studentId || undefined }),
    enabled: Boolean(scheduleId),
  });
  const [values, setValues] = useState({});
  const baselineRef = useRef({});
  const callbacksRef = useRef({ onDirtyChange, onSavingChange, onCanSaveChange });
  callbacksRef.current = { onDirtyChange, onSavingChange, onCanSaveChange };
  useEffect(() => {
    if (query.data) {
      const nextValues = valuesFromRecords(query.data.records);
      baselineRef.current = nextValues;
      setValues(nextValues);
      callbacksRef.current.onDirtyChange?.(false);
    }
  }, [query.data]);
  const isDirty = useMemo(() => !valuesMatch(values, baselineRef.current), [values]);
  useEffect(() => { callbacksRef.current.onDirtyChange?.(isDirty); }, [isDirty]);
  const mutation = useMutation({
    mutationFn: () => attendanceApi.saveForSchedule(
      scheduleId,
      Object.entries(values).map(([student_id, status]) => ({ student_id: Number(student_id), status })),
      { student_id: studentId || undefined },
    ),
    onSuccess: (result) => {
      baselineRef.current = { ...values };
      onDirtyChange?.(false);
      notifySuccess(t('attendanceSaved'));
      queryClient.setQueryData(queryKeys.attendance.schedule(scheduleId, studentId), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.reports() });
      onSaved?.(result);
    },
    onError: (error) => notifyError(getErrorMessage(error)),
  });
  useImperativeHandle(ref, () => ({ save: () => mutation.mutate() }), [mutation]);
  useEffect(() => { callbacksRef.current.onSavingChange?.(mutation.isPending); }, [mutation.isPending]);
  useEffect(() => {
    callbacksRef.current.onCanSaveChange?.(Boolean(query.data?.records.length) && !query.isLoading && !query.isError);
  }, [query.data, query.isError, query.isLoading]);
  if (query.isLoading) return <PageLoader />;
  if (query.isError) return <Alert color="red">{getErrorMessage(query.error)}</Alert>;
  if (!query.data.records.length) return <Text c="dimmed">{t('noStudents')}</Text>;
  const options = ['present', 'absent', 'late', 'excused'].map((status) => ({ value: status, label: t(`attendanceStatus.${status}`) }));
  const presentCount = query.data.records.filter((record) => values[record.student_id] === 'present').length;
  const allPresent = presentCount === query.data.records.length;
  const somePresent = presentCount > 0 && !allPresent;

  function setAllPresent(checked) {
    setValues(Object.fromEntries(query.data.records.map((record) => [record.student_id, checked ? 'present' : 'absent'])));
  }

  function setStudentPresent(studentId, checked) {
    setValues((current) => ({ ...current, [studentId]: checked ? 'present' : 'absent' }));
  }

  return <><Table.ScrollContainer minWidth={420}><Table withTableBorder><Table.Thead><Table.Tr><Table.Th>{t('student')}</Table.Th><Table.Th><Group justify="flex-end" gap="md" wrap="nowrap"><Checkbox
    label={t('markAllPresent')}
    checked={allPresent}
    indeterminate={somePresent}
    onChange={(event) => setAllPresent(event.currentTarget.checked)}
  /></Group></Table.Th></Table.Tr></Table.Thead><Table.Tbody>{query.data.records.map((record) => {
    const status = values[record.student_id] || 'absent';
    return <Table.Tr key={record.student_id}><Table.Td>{record.student_name}<Text size="xs" c="dimmed">{record.email}</Text></Table.Td><Table.Td><Group justify="flex-end" gap="md" wrap="nowrap"><Checkbox
      aria-label={t('markPresentFor', { name: record.student_name })}
      checked={status === 'present'}
      onChange={(event) => setStudentPresent(record.student_id, event.currentTarget.checked)}
    /><Select
      aria-label={t('status')}
      data={options}
      value={status}
      data-status={status}
      classNames={{ input: styles[status] }}
      onChange={(nextStatus) => nextStatus && setValues((current) => ({ ...current, [record.student_id]: nextStatus }))}
      w="25%"
      miw={160}
      renderOption={({ option }) => {
        return <div className={styles.statusOption} data-status={option.value}>{option.label}</div>;
      }}
    /></Group></Table.Td></Table.Tr>;
  })}</Table.Tbody></Table></Table.ScrollContainer>{inlineSave && <Group justify="flex-end" mt="md"><Button
    onClick={() => mutation.mutate()}
    loading={mutation.isPending}
    disabled={!query.data.records.length}
  >{t('saveAttendance')}</Button></Group>}</>;
});
