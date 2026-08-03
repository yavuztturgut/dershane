import { Alert, Button, Checkbox, Group, Select, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '../../components/ui/PageLoader';
import { getErrorMessage } from '../../lib/api-client';
import { notifyError } from '../../lib/notifications';
import { queryClient } from '../../lib/query-client';
import { attendanceApi } from './attendance.api';

function valuesFromRecords(records) {
  return Object.fromEntries(records.map((record) => [record.student_id, record.status || 'absent']));
}

function valuesMatch(left, right) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => left[key] === right[key]);
}

const statusStyles = {
  present: { background: '#bbf7d0', border: '#4ade80', color: '#166534' },
  absent: { background: '#fecaca', border: '#f87171', color: '#991b1b' },
  late: { background: '#fed7aa', border: '#fb923c', color: '#9a3412' },
  excused: { background: '#fbcfe8', border: '#f472b6', color: '#9d174d' },
};

export const AttendanceEditor = forwardRef(function AttendanceEditor({ scheduleId, studentId, onDirtyChange, onSavingChange, onCanSaveChange, onSaved, inlineSave = false }, ref) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['attendance', scheduleId, studentId || 'all'],
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
    mutationFn: () => attendanceApi.saveForSchedule(scheduleId, Object.entries(values).map(([student_id, status]) => ({ student_id: Number(student_id), status }))),
    onSuccess: (result) => {
      baselineRef.current = { ...values };
      onDirtyChange?.(false);
      notifications.show({ color: 'green', message: t('attendanceSaved') });
      queryClient.invalidateQueries({ queryKey: ['attendance', scheduleId] });
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
    const selectedStyle = statusStyles[status];
    return <Table.Tr key={record.student_id}><Table.Td>{record.student_name}<Text size="xs" c="dimmed">{record.email}</Text></Table.Td><Table.Td><Group justify="flex-end" gap="md" wrap="nowrap"><Checkbox
      aria-label={t('markPresentFor', { name: record.student_name })}
      checked={status === 'present'}
      onChange={(event) => setStudentPresent(record.student_id, event.currentTarget.checked)}
    /><Select
      aria-label={t('status')}
      data={options}
      value={status}
      onChange={(nextStatus) => nextStatus && setValues((current) => ({ ...current, [record.student_id]: nextStatus }))}
      w="50%"
      miw={160}
      styles={{ input: {
        backgroundColor: selectedStyle.background,
        borderColor: selectedStyle.border,
        color: selectedStyle.color,
        fontWeight: 600,
      } }}
      renderOption={({ option }) => {
        const optionStyle = statusStyles[option.value];
        return <div style={{
          width: '100%',
          padding: '0.45rem 0.75rem',
          border: `1px solid ${optionStyle.border}`,
          borderRadius: '0.5rem',
          backgroundColor: optionStyle.background,
          color: optionStyle.color,
          fontWeight: 600,
        }}>{option.label}</div>;
      }}
    /></Group></Table.Td></Table.Tr>;
  })}</Table.Tbody></Table></Table.ScrollContainer>{inlineSave && <Group justify="flex-end" mt="md"><Button
    onClick={() => mutation.mutate()}
    loading={mutation.isPending}
    disabled={!query.data.records.length}
  >{t('saveAttendance')}</Button></Group>}</>;
});
